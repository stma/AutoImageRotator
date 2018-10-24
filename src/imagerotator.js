import debug from 'debug';


const _lookOver = debug('ImageRotator');

const _resetOrientation = (meta) => new Promise(
    (resolve, reject) => {
        const img = new Image();

        img.onload = function() {
            const width = img.width;
            const height = img.height;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let startX = 0;
            let startY = 0;

            let scale = 1;

            if (meta.size) {
                const ratio = meta.size[0] / meta.size[1];
                const ratioX = meta.size[0] / width;
                const ratioY = meta.size[1] / height;

                if (ratioX > ratioY) {
                    scale = ratioX;
                    canvas.width = width;
                    canvas.height = width / ratio;
                    startY = (height * scale - meta.size[1]) / (2 * scale);
                } else {
                    scale = ratioY;
                    canvas.height = height;
                    canvas.width = height * ratio;
                    startX = (width * scale - meta.size[0]) / (2 * scale);
                }
            } else {
                canvas.width = width;
                canvas.height = height;
            }

            const lengthX = canvas.width;
            const lengthY = canvas.height;

            if (4 < meta.orientation && meta.orientation < 9) {
                canvas.width = canvas.height;
                canvas.height = canvas.width;
            }

            switch (meta.orientation) {
            case 2:
                ctx.transform(-1, 0, 0, 1, canvas.width, 0);
                break;
            case 3:
                ctx.transform(-1, 0, 0, -1, canvas.width, canvas.height);
                break;
            case 4:
                ctx.transform(1, 0, 0, -1, 0, canvas.height);
                break;
            case 5:
                ctx.transform(0, 1, 1, 0, 0, 0);
                break;
            case 6:
                ctx.transform(0, 1, -1, 0, canvas.height, 0);
                break;
            case 7:
                ctx.transform(0, -1, -1, 0, canvas.height, canvas.width);
                break;
            case 8:
                ctx.transform(0, -1, 1, 0, 0, canvas.width);
                break;
            default:
                break;
            }

            ctx.drawImage(img, startX, startY, lengthX, lengthY, 0, 0, lengthX, lengthY);

            resolve(canvas.toDataURL());
        };

        img.src = meta.srcBase64;
    }
);

const _getDataUrl = (meta) => new Promise(
    (resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            meta.srcBase64 = event.target.result;
            resolve(meta);
        };

        reader.readAsDataURL(meta.file);
    }
);

const BASE64_MARKER = ';base64,';
const _convertDataURIToBinary = (dataURI) => {
    const base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    const raw = window.atob(dataURI.substring(base64Index));

    return Uint8Array.from(
        Array.prototype.map.call(
            raw,
            (x) => x.charCodeAt(0)
        )
    );
};

const _getOrientation = (meta) => new Promise(
    (resolve, reject) => {
        const view = new DataView(_convertDataURIToBinary(meta.srcBase64).buffer);

        if (view.getUint16(0, false) !== 0xFFD8) {
            resolve(meta);
        }

        const length = view.byteLength;
        let offset = 2;

        while (offset < length) {
            const marker = view.getUint16(offset, false);
            offset += 2;

            if (marker === 0xFFE1) {
                if (view.getUint32(offset += 2, false) !== 0x45786966) {
                    resolve(meta);
                }
                const little = view.getUint16(offset += 6, false) === 0x4949;
                offset += view.getUint32(offset + 4, little);
                const tags = view.getUint16(offset, little);
                offset += 2;

                for (let i = 0; i < tags; i++) {
                    if (view.getUint16(offset + (i * 12), little) === 0x0112) {
                        meta.orientation = view.getUint16(offset + (i * 12) + 8, little);
                        resolve(meta);
                    }
                }
            } else if ((marker & 0xFF00) !== 0xFF00) {
                break;
            } else {
                offset += view.getUint16(offset, false);
            }
        }
        resolve(meta);
    }
);

export default (file, size) => {
    _lookOver('Rotate Image called');

    return Promise.resolve(
        {
            file,
            orientation: 1,
            size: size && size.split('x'),
        }
    ).then(
        (meta) => _getDataUrl(meta)
    ).then(
        (meta) => _getOrientation(meta)
    ).then(
        (meta) => _resetOrientation(meta)
    );
};
