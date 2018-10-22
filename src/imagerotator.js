import debug from 'debug';
import base64js from 'base64-js';


const _lookOver = debug('ImageRotator');

const _resetOrientation = (srcBase64, srcOrientation) => (resolve, reject) => {
    const img = new Image();

    img.onload = function() {
        const width = img.width;
        const height = img.height;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (4 < srcOrientation && srcOrientation < 9) {
            canvas.width = height;
            canvas.height = width;
        } else {
            canvas.width = width;
            canvas.height = height;
        }

        switch (srcOrientation) {
        case 2:
            ctx.transform(-1, 0, 0, 1, width, 0);
            break;
        case 3:
            ctx.transform(-1, 0, 0, -1, width, height );
            break;
        case 4:
            ctx.transform(1, 0, 0, -1, 0, height );
            break;
        case 5:
            ctx.transform(0, 1, 1, 0, 0, 0);
            break;
        case 6:
            ctx.transform(0, 1, -1, 0, height, 0);
            break;
        case 7:
            ctx.transform(0, -1, -1, 0, height, width);
            break;
        case 8:
            ctx.transform(0, -1, 1, 0, 0, width);
            break;
        default:
            break;
        }

        ctx.drawImage(img, 0, 0);

        resolve(canvas.toDataURL());
    };

    img.src = srcBase64;
};

const _getOrientation = (file) => (resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function(event) {
        const arrayBuffer = event.target.result;
        const view = new DataView(arrayBuffer);

        if (view.getUint16(0, false) !== 0xFFD8) reject(-2);

        const length = view.byteLength;
        let offset = 2;

        while (offset < length) {
            const marker = view.getUint16(offset, false);
            offset += 2;

            if (marker === 0xFFE1) {
                if (view.getUint32(offset += 2, false) !== 0x45786966) {
                    reject(-1);
                }
                const little = view.getUint16(offset += 6, false) === 0x4949;
                offset += view.getUint32(offset + 4, little);
                const tags = view.getUint16(offset, little);
                offset += 2;

                for (let i = 0; i < tags; i++) {
                    if (view.getUint16(offset + (i * 12), little) === 0x0112) {
                        resolve(
                            {
                                orientation: view.getUint16(offset + (i * 12) + 8, little),
                                srcBase64: base64js.fromByteArray(arrayBuffer),
                            }
                        );
                    }
                }
            } else if ((marker & 0xFF00) !== 0xFF00) {
                break;
            } else {
                offset += view.getUint16(offset, false);
            }
        }
        reject(-1);
    };

    reader.readAsArrayBuffer(file.slice(0, 64 * 1024));
};

const rotateImage = (file) => {
    _lookOver('Rotate Image called');

    return new Promise(
        _getOrientation(file)
    ).then(
        (meta) => _resetOrientation(meta.srcBase64, meta.orientation)
    );
};

export default rotateImage;
