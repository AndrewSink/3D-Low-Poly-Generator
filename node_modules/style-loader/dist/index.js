"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _utils = require("./utils");

var _options = _interopRequireDefault(require("./options.json"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const loaderAPI = () => {};

loaderAPI.pitch = function loader(request) {
  const options = this.getOptions(_options.default);
  const insert = typeof options.insert === "string" ? JSON.stringify(options.insert) : '"head"';
  const insertIsFunction = typeof options.insert === "function";
  const injectType = options.injectType || "styleTag";
  const {
    styleTagTransform
  } = options;
  const esModule = typeof options.esModule !== "undefined" ? options.esModule : true;
  const runtimeOptions = {
    injectType: options.injectType,
    attributes: options.attributes,
    insert: options.insert,
    base: options.base
  };
  let setAttributesFn;

  if (typeof options.attributes !== "undefined") {
    setAttributesFn = typeof options.attributes.nonce === "undefined" ? `function(style, attributes) {
        var nonce =
          typeof __webpack_nonce__ !== "undefined" ? __webpack_nonce__ : null;

        if (nonce) {
          attributes.nonce = nonce;
        }

        Object.keys(attributes).forEach((key) => {
          style.setAttribute(key, attributes[key]);
        });
      }` : `function(style, attributes) {
        Object.keys(attributes).forEach((key) => {
          style.setAttribute(key, attributes[key]);
        });
      }`;
  } else {
    setAttributesFn = `function(style) {
        var nonce =
          typeof __webpack_nonce__ !== "undefined" ? __webpack_nonce__ : null;

        if (nonce) {
          style.setAttribute("nonce", nonce);
        }
      }`;
  }

  const insertFn = insertIsFunction ? options.insert.toString() : `function(style){
    var target = getTarget(${insert});

    if (!target) {
      throw new Error(
        "Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
      );
    }

    target.appendChild(style);
  }`;
  const styleTagTransformFn = typeof styleTagTransform === "function" ? styleTagTransform.toString() : `function(css, style){
      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
      while (style.firstChild) {
        style.removeChild(style.firstChild);
      }

      style.appendChild(document.createTextNode(css));
    }
  }`;

  switch (injectType) {
    case "linkTag":
      {
        const hmrCode = this.hot ? (0, _utils.getLinkHmrCode)(esModule, this, request) : "";
        return `
      ${(0, _utils.getImportLinkAPICode)(esModule, this)}
      ${(0, _utils.getImportGetTargetCode)(esModule, this, insertIsFunction)}
      ${(0, _utils.getImportLinkContentCode)(esModule, this, request)}
      ${esModule ? "" : `content = content.__esModule ? content.default : content;`}

var options = ${JSON.stringify(runtimeOptions)};

options.insert = ${insertFn};

var update = API(content, options);

${hmrCode}

${esModule ? "export default {}" : ""}`;
      }

    case "lazyStyleTag":
    case "lazyAutoStyleTag":
    case "lazySingletonStyleTag":
      {
        const isSingleton = injectType === "lazySingletonStyleTag";
        const isAuto = injectType === "lazyAutoStyleTag";
        const hmrCode = this.hot ? (0, _utils.getStyleHmrCode)(esModule, this, request, true) : "";
        return `
      var exported = {};

      ${(0, _utils.getImportStyleAPICode)(esModule, this)}
      ${(0, _utils.getImportStyleDomAPICode)(esModule, this, isSingleton, isAuto)}
      ${(0, _utils.getImportGetTargetCode)(esModule, this, insertIsFunction)}
      ${(0, _utils.getImportInsertStyleElementCode)(esModule, this)}
      ${(0, _utils.getImportStyleContentCode)(esModule, this, request)}
      ${isAuto ? (0, _utils.getImportIsOldIECode)(esModule, this) : ""}
      ${esModule ? `if (content && content.locals) {
              exported.locals = content.locals;
            }
            ` : `content = content.__esModule ? content.default : content;

            exported.locals = content.locals || {};`}

var refs = 0;
var update;
var options = ${JSON.stringify(runtimeOptions)};

${(0, _utils.getStyleTagTransformFn)(styleTagTransformFn, isSingleton)};
options.setAttributes = ${setAttributesFn};
options.insert = ${insertFn};
options.domAPI = ${(0, _utils.getdomAPI)(isAuto)};
options.insertStyleElement = insertStyleElement;

exported.use = function() {
  if (!(refs++)) {
    update = API(content, options);
  }

  return exported;
};
exported.unuse = function() {
  if (refs > 0 && !--refs) {
    update();
    update = null;
  }
};

${hmrCode}

${(0, _utils.getExportLazyStyleCode)(esModule, this, request)}
`;
      }

    case "styleTag":
    case "autoStyleTag":
    case "singletonStyleTag":
    default:
      {
        const isSingleton = injectType === "singletonStyleTag";
        const isAuto = injectType === "autoStyleTag";
        const hmrCode = this.hot ? (0, _utils.getStyleHmrCode)(esModule, this, request, false) : "";
        return `
      ${(0, _utils.getImportStyleAPICode)(esModule, this)}
      ${(0, _utils.getImportStyleDomAPICode)(esModule, this, isSingleton, isAuto)}
      ${(0, _utils.getImportGetTargetCode)(esModule, this, insertIsFunction)}
      ${(0, _utils.getImportInsertStyleElementCode)(esModule, this)}
      ${(0, _utils.getImportStyleContentCode)(esModule, this, request)}
      ${isAuto ? (0, _utils.getImportIsOldIECode)(esModule, this) : ""}
      ${esModule ? "" : `content = content.__esModule ? content.default : content;`}

var options = ${JSON.stringify(runtimeOptions)};

${(0, _utils.getStyleTagTransformFn)(styleTagTransformFn, isSingleton)};
options.setAttributes = ${setAttributesFn};
options.insert = ${insertFn};
options.domAPI = ${(0, _utils.getdomAPI)(isAuto)};
options.insertStyleElement = insertStyleElement;

var update = API(content, options);

${hmrCode}

${(0, _utils.getExportStyleCode)(esModule, this, request)}
`;
      }
  }
};

var _default = loaderAPI;
exports.default = _default;