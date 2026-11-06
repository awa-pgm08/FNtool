/* FBKP/LZ4 reader, isolated from the UI thread. lz4js is bundled locally. */
importScripts('./lz4js.min.js');

const MAX_RESULTS = 100000;
const FRAME_MAGIC = 0x184d2204;
const FBKP_MAGIC = 0x504b4246;

self.onmessage = async ({ data }) => {
    const { file, keywords, jobId } = data;
    try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const result = scanFrame(bytes, keywords.map(value => value.toLowerCase()), count => {
            self.postMessage({ type: 'progress', jobId, count });
        });
        self.postMessage({ type: 'done', jobId, name: file.name, ...result });
    } catch (error) {
        self.postMessage({ type: 'error', jobId, error: error && error.message ? error.message : String(error) });
    }
};

function scanFrame(src, keywords, reportProgress) {
    if (src.length < 4 || readU32(src, 0) !== FRAME_MAGIC) {
        throw new Error('The file is not an LZ4-compressed FBKP file.');
    }
    let pos = 4;
    const flags = src[pos++];
    const blockDescriptor = src[pos++];
    if ((flags & 0xc0) !== 0x40) throw new Error('Unsupported LZ4 frame version.');
    const independent = (flags & 0x20) !== 0;
    const blockChecksum = (flags & 0x10) !== 0;
    const contentSize = (flags & 0x08) !== 0;
    const contentChecksum = (flags & 0x04) !== 0;
    const dictionaryId = (flags & 0x01) !== 0;
    const maxBlock = ({ 4: 65536, 5: 262144, 6: 1048576, 7: 4194304 })[(blockDescriptor >> 4) & 7];
    if (!maxBlock) throw new Error('Unsupported LZ4 block size.');
    if (contentSize) pos += 8;
    if (dictionaryId) throw new Error('LZ4 frames with external dictionaries are not supported.');
    pos += 1; // frame header checksum
    if (pos > src.length) throw new Error('Truncated LZ4 frame header.');

    const parser = makeBackupParser(keywords, reportProgress);
    let history = new Uint8Array(0);
    while (pos + 4 <= src.length) {
        let blockSize = readU32(src, pos); pos += 4;
        if (blockSize === 0) break;
        const uncompressed = (blockSize & 0x80000000) !== 0;
        blockSize &= 0x7fffffff;
        if (!blockSize || blockSize > maxBlock || pos + blockSize + (blockChecksum ? 4 : 0) > src.length) {
            throw new Error('Invalid or truncated LZ4 block.');
        }
        const block = src.subarray(pos, pos + blockSize);
        pos += blockSize;
        if (blockChecksum) pos += 4; // checksum is not required to extract data

        let decoded;
        if (uncompressed) {
            decoded = block;
        } else {
            const prefix = independent ? new Uint8Array(0) : history;
            const output = new Uint8Array(prefix.length + maxBlock);
            output.set(prefix);
            const end = lz4js.decompressBlock(src, output, pos - blockSize - (blockChecksum ? 4 : 0), blockSize, prefix.length);
            decoded = output.subarray(prefix.length, end);
            if (!independent) history = output.slice(Math.max(0, end - 65536), end);
        }
        parser.push(decoded);
    }
    if (contentChecksum) pos += 4;
    if (pos > src.length) throw new Error('Truncated LZ4 checksum.');
    return parser.finish();
}

function makeBackupParser(keywords, reportProgress) {
    let pending = new Uint8Array(0);
    let headerDone = false;
    let version = 0;
    let total = 0;
    let scanned = 0;
    const paths = [];
    const seen = new Set();
    const decoder = new TextDecoder('utf-8');

    function push(bytes) {
        if (!bytes.length) return;
        const combined = new Uint8Array(pending.length + bytes.length);
        combined.set(pending);
        combined.set(bytes, pending.length);
        let offset = 0;
        if (!headerDone) {
            if (combined.length < 9) { pending = combined; return; }
            if (readU32(combined, 0) !== FBKP_MAGIC) throw new Error('FBKP header not found after LZ4 decompression.');
            version = combined[4];
            total = readI32(combined, 5);
            if (total < 0 || total > 50000000) throw new Error('Invalid FBKP file count.');
            offset = 9;
            headerDone = true;
        }
        let parsedThisBlock = 0;
        while (offset < combined.length && scanned < total) {
            const start = offset;
            if (offset + 9 > combined.length) break;
            offset += 9; // int64 size and one-byte encryption flag
            let length = 0, shift = 0, ready = false;
            while (offset < combined.length && shift <= 28) {
                const byte = combined[offset++];
                length |= (byte & 0x7f) << shift;
                shift += 7;
                if (!(byte & 0x80)) { ready = true; break; }
            }
            if (!ready || offset + length > combined.length) { offset = start; break; }
            let path = decoder.decode(combined.subarray(offset, offset + length));
            offset += length;
            if (version < 2 && path.startsWith('/')) path = path.slice(1);
            const lower = path.toLowerCase();
            if (keywords.every(keyword => lower.includes(keyword)) && !seen.has(lower)) {
                seen.add(lower);
                if (paths.length < MAX_RESULTS) paths.push(path);
            }
            scanned++;
            if (++parsedThisBlock % 250000 === 0) reportProgress(scanned);
        }
        pending = combined.slice(offset);
    }

    return {
        push,
        finish() {
            if (!headerDone) throw new Error('Incomplete FBKP header.');
            if (scanned !== total) throw new Error(`FBKP file ended early (${scanned} of ${total} entries read).`);
            reportProgress(scanned);
            return { paths, total: scanned, truncated: paths.length >= MAX_RESULTS };
        }
    };
}

function readU32(bytes, offset) {
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}
function readI32(bytes, offset) { return readU32(bytes, offset) | 0; }
