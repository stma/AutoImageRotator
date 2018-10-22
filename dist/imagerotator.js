'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _base64Js = require('base64-js');

var _base64Js2 = _interopRequireDefault(_base64Js);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _lookOver = (0, _debug2.default)('ImageRotator');

var _resetOrientation = function _resetOrientation(srcBase64, srcOrientation) {
    return function (resolve, reject) {
        var img = new Image();

        img.onload = function () {
            var width = img.width;
            var height = img.height;
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');

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
                    ctx.transform(-1, 0, 0, -1, width, height);
                    break;
                case 4:
                    ctx.transform(1, 0, 0, -1, 0, height);
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
};

var _getOrientation = function _getOrientation(file) {
    return function (resolve, reject) {
        var reader = new FileReader();

        reader.onload = function (event) {
            var arrayBuffer = event.target.result;
            var view = new DataView(arrayBuffer);

            if (view.getUint16(0, false) !== 0xFFD8) reject(-2);

            var length = view.byteLength;
            var offset = 2;

            while (offset < length) {
                var marker = view.getUint16(offset, false);
                offset += 2;

                if (marker === 0xFFE1) {
                    if (view.getUint32(offset += 2, false) !== 0x45786966) {
                        reject(-1);
                    }
                    var little = view.getUint16(offset += 6, false) === 0x4949;
                    offset += view.getUint32(offset + 4, little);
                    var tags = view.getUint16(offset, little);
                    offset += 2;

                    for (var i = 0; i < tags; i++) {
                        if (view.getUint16(offset + i * 12, little) === 0x0112) {
                            resolve({
                                orientation: view.getUint16(offset + i * 12 + 8, little),
                                srcBase64: _base64Js2.default.fromByteArray(arrayBuffer)
                            });
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
};

var rotateImage = function rotateImage(file) {
    _lookOver('Rotate Image called');

    return new Promise(_getOrientation(file)).then(function (meta) {
        return _resetOrientation(meta.srcBase64, meta.orientation);
    });
};

exports.default = rotateImage;
//# sourceMappingURL=imagerotator.js.map