(() => {
    const viewer = document.getElementById('viewer');
    const fileInput = document.getElementById('model-file');
    const reset = document.getElementById('reset-model');
    const status = document.getElementById('viewer-status');
    const path = document.getElementById('model-path');
    const sample = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
    let objectUrl = null;

    function setModel(src, label, message) {
        viewer.src = src;
        path.textContent = label;
        status.textContent = message;
    }

    fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(file);
        setModel(objectUrl, file.name, `${file.name} を表示中（ブラウザ内処理）`);
    });

    reset.addEventListener('click', () => {
        fileInput.value = '';
        setModel(sample, 'Astronaut.glb（テスト用）', 'サンプルモデルを表示中');
    });
})();
