document.addEventListener('DOMContentLoaded', function() {

    let config = {
        amapWebKey: null,
    };

    function init(options = {}) {
        config = { ...config, ...options };
    }

    /* ===== 文件上传与预览 ===== */
    function initFilePreview(inputId, previewContainerId) {
        const input = document.getElementById(inputId);
        const previewContainer = document.getElementById(previewContainerId);
        let selectedFiles = [];

        if (!input || !previewContainer) return;

        input.addEventListener('change', function() {
            const newFiles = Array.from(this.files);
            selectedFiles = selectedFiles.concat(newFiles);
            updatePreview();
            this.value = '';
        });

        function updatePreview() {
            const previewArea = previewContainer.querySelector('.preview-area') || previewContainer.querySelector('.upload-preview-list');
            if (!previewArea) return;
            previewArea.innerHTML = '';

            selectedFiles.forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'preview-item upload-preview-item';

                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(file);
                    item.appendChild(img);
                } else if (file.type.startsWith('video/')) {
                    const video = document.createElement('video');
                    video.src = URL.createObjectURL(file);
                    video.controls = true;
                    item.appendChild(video);
                } else if (file.type.startsWith('audio/')) {
                    const audio = document.createElement('audio');
                    audio.src = URL.createObjectURL(file);
                    audio.controls = true;
                    item.appendChild(audio);
                } else {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'file-placeholder';
                    const mimeSecond = file.type && file.type.includes('/') ? file.type.split('/')[1].toUpperCase() : 'FILE';
                    const ext = file.name.includes('.') ? file.name.split('.').pop().toUpperCase() : 'FILE';
                    placeholder.innerHTML = `<div>${mimeSecond}</div><div style="font-weight:bold;margin-top:4px;">${ext}</div>`;
                    item.appendChild(placeholder);
                }

                // 文件名
                const fileName = document.createElement('div');
                fileName.className = 'file-info';
                fileName.textContent = file.name;
                item.appendChild(fileName);

                // 删除按钮
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.onclick = function() {
                    selectedFiles.splice(index, 1);
                    updatePreview();
                };
                item.appendChild(removeBtn);

                previewArea.appendChild(item);
            });

            previewContainer.style.display = selectedFiles.length ? 'block' : 'none';
        }

        return () => selectedFiles;
    }

    /* ===== 表情插入 ===== */
    function initEmoji(emojiBtnId, emojiPanelId, emojiGridId, contentInputId, emojis) {
        const emojiBtn = document.getElementById(emojiBtnId);
        const emojiPanel = document.getElementById(emojiPanelId);
        const emojiGrid = document.getElementById(emojiGridId);
        const contentInput = document.getElementById(contentInputId);

        if (!emojiBtn || !emojiPanel || !emojiGrid || !contentInput) return;

        emojiBtn.onclick = () => {
            emojiPanel.style.display = emojiPanel.style.display === 'block' ? 'none' : 'block';
        };

        emojis.forEach(e => {
            const item = document.createElement('div');
            item.className = 'emoji-item';
            const img = document.createElement('img');
            img.src = '/assets?path=weibo/images/' + e.url;
            item.appendChild(img);
            item.onclick = () => insertEmoji("["+e.name+"]");
            emojiGrid.appendChild(item);
        });

        function insertEmoji(text){
            const start = contentInput.selectionStart;
            const end = contentInput.selectionEnd;
            contentInput.value = contentInput.value.substring(0,start) + text + contentInput.value.substring(end);
            contentInput.focus();
            contentInput.selectionStart = contentInput.selectionEnd = start + text.length;
        }
    }

    /* ===== 定位功能 ===== */
    function initLocation(
        locationBtnId,
        locationBarId,
        locationTextId,
        latitudeId,
        longitudeId,
        addressId,
        deleteBtnId,
        editBtnId,
        editorId,
        inputId,
        saveBtnId,
        cancelBtnId
    ) {

        const locationBtn = document.getElementById(locationBtnId);
        const locationBar = document.getElementById(locationBarId);
        const locationText = document.getElementById(locationTextId);

        const latInput = document.getElementById(latitudeId);
        const lngInput = document.getElementById(longitudeId);
        const addrInput = document.getElementById(addressId);

        const deleteBtn = document.getElementById(deleteBtnId);
        const editBtn = document.getElementById(editBtnId);

        const editor = document.getElementById(editorId);
        const input = document.getElementById(inputId);

        const saveBtn = document.getElementById(saveBtnId);
        const cancelBtn = document.getElementById(cancelBtnId);

        if (!locationBtn || !locationBar || !locationText) return;

        let currentLocation = null;
        let locating = false;

        /* =========================
           定位
        ========================= */

        locationBtn.onclick = async () => {

            if (locating) return;

            locating = true;
            locationBtn.disabled = true;

            try {

                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });

                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                const addr = await reverseGeocode(lng, lat);

                if (currentLocation && currentLocation.userEdited) {
                    locating = false;
                    locationBtn.disabled = false;
                    return;
                }

                currentLocation = {
                    latitude: lat,
                    longitude: lng,
                    address: addr,
                    userEdited: false
                };

                renderLocation();

            } catch (e) {

                alert('定位失败');

            } finally {

                locating = false;
                locationBtn.disabled = false;

            }
        };

        /* =========================
           删除定位
        ========================= */

        if (deleteBtn) {
            deleteBtn.onclick = () => {

                currentLocation = null;

                locationBar.style.display = "none";

                if (latInput) latInput.value = "";
                if (lngInput) lngInput.value = "";
                if (addrInput) addrInput.value = "";

            };
        }

        /* =========================
           编辑定位
        ========================= */

        if (editBtn) {
            editBtn.onclick = () => {

                if (!currentLocation) return;

                input.value = currentLocation.address || "";

                editor.style.display = "inline-flex";
                locationText.style.display = "none";

                input.focus();

            };
        }

        /* =========================
           取消编辑
        ========================= */

        if (cancelBtn) {
            cancelBtn.onclick = () => {

                editor.style.display = "none";
                locationText.style.display = "block";

            };
        }

        /* =========================
           保存编辑
        ========================= */

        if (saveBtn) {
            saveBtn.onclick = () => {

                const newAddr = input.value.trim();
                if (!newAddr) return;

                if (!currentLocation) {
                    currentLocation = {};
                }

                currentLocation.address = newAddr;
                currentLocation.userEdited = true;

                renderLocation();

                editor.style.display = "none";
                locationText.style.display = "block";

            };
        }

        /* =========================
           渲染
        ========================= */

        function renderLocation() {

            if (!currentLocation) return;

            locationBar.style.display = "flex";

            locationText.textContent = "📍 " + (currentLocation.address || "");

            if (latInput) latInput.value = currentLocation.latitude || "";
            if (lngInput) lngInput.value = currentLocation.longitude || "";
            if (addrInput) addrInput.value = currentLocation.address || "";

        }

        /* =========================
           逆地理编码
        ========================= */

        async function reverseGeocode(lng, lat) {

            try {

                const res = await fetch(
                    `https://restapi.amap.com/v3/geocode/regeo?key=${config.amapWebKey}&location=${lng},${lat}`
                );

                const json = await res.json();

                if (json.status === '1' && json.regeocode) {
                    return json.regeocode.formatted_address;
                }
                return '未知位置';
            } catch (e) {
                return '定位失败';
            }
        }
    }

    /* ===== 公共表单提交 ===== */
    function initFormSubmit(formId, submitBtnId, getFiles, url) {
        const form = document.getElementById(formId);
        const submitBtn = document.getElementById(submitBtnId);

        if (!form || !submitBtn) return;

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            if (getFiles) {
                const files = getFiles();
                if (files && files.length) {
                    formData.delete('media');
                    files.forEach(file => formData.append('media', file));
                }
            }
            submitBtn.disabled = true;
            submitBtn.textContent = '处理中...';
            fetch(url || form.action, { method: 'POST', body: formData })
                .then(res => {
                    if (res.redirected) window.location.href = res.url;
                    else return res.text().then(text => { throw new Error(text); });
                })
                .catch(err => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '提交';
                    alert('操作失败: ' + err.message);
                });
        });
    }

    /* ===== 导出函数到全局 ===== */
    window.common = {
        init,
        initFilePreview,
        initEmoji,
        initLocation,
        initFormSubmit,
    };

});
