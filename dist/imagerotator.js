'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _lookOver = (0, _debug2.default)('ImageRotator');

var _resetOrientation = function _resetOrientation(meta) {
    return new Promise(function (resolve, reject) {
        var img = new Image();

        img.onload = function () {
            var width = img.width;
            var height = img.height;
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');

            var startX = 0;
            var startY = 0;

            var scale = 1;

            if (meta.size) {
                var ratio = meta.size[0] / meta.size[1];
                var ratioX = meta.size[0] / width;
                var ratioY = meta.size[1] / height;

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

            var lengthX = canvas.width;
            var lengthY = canvas.height;

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
    });
};

var _getDataUrl = function _getDataUrl(meta) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();

        reader.onload = function (event) {
            meta.srcBase64 = event.target.result;
            resolve(meta);
        };

        reader.readAsDataURL(meta.file);
    });
};

var BASE64_MARKER = ';base64,';
var _convertDataURIToBinary = function _convertDataURIToBinary(dataURI) {
    var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    var raw = window.atob(dataURI.substring(base64Index));

    return Uint8Array.from(Array.prototype.map.call(raw, function (x) {
        return x.charCodeAt(0);
    }));
};

var _getOrientation = function _getOrientation(meta) {
    return new Promise(function (resolve, reject) {
        var view = new DataView(_convertDataURIToBinary(meta.srcBase64).buffer);

        if (view.getUint16(0, false) !== 0xFFD8) {
            resolve(meta);
        }

        var length = view.byteLength;
        var offset = 2;

        while (offset < length) {
            var marker = view.getUint16(offset, false);
            offset += 2;

            if (marker === 0xFFE1) {
                if (view.getUint32(offset += 2, false) !== 0x45786966) {
                    resolve(meta);
                }
                var little = view.getUint16(offset += 6, false) === 0x4949;
                offset += view.getUint32(offset + 4, little);
                var tags = view.getUint16(offset, little);
                offset += 2;

                for (var i = 0; i < tags; i++) {
                    if (view.getUint16(offset + i * 12, little) === 0x0112) {
                        meta.orientation = view.getUint16(offset + i * 12 + 8, little);
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
    });
};

exports.default = function (file, size) {
    _lookOver('Rotate Image called');

    return Promise.resolve({
        file: file,
        orientation: 1,
        size: size && size.split('x')
    }).then(function (meta) {
        return _getDataUrl(meta);
    }).then(function (meta) {
        return _getOrientation(meta);
    }).then(function (meta) {
        return _resetOrientation(meta);
    });
};
//# sourceMappingURL=imagerotator.js.map