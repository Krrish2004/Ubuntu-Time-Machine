/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/electron-log/src/core/Buffering.js":
/*!*********************************************************!*\
  !*** ./node_modules/electron-log/src/core/Buffering.js ***!
  \*********************************************************/
/***/ ((module) => {



class Buffering {
  constructor({ processMessage }) {
    this.processMessage = processMessage;
    this.buffer = [];
    this.enabled = false;

    this.begin = this.begin.bind(this);
    this.commit = this.commit.bind(this);
    this.reject = this.reject.bind(this);
  }

  addMessage(message) {
    this.buffer.push(message);
  }

  begin() {
    this.enabled = [];
  }

  commit() {
    this.enabled = false;
    this.buffer.forEach((item) => this.processMessage(item));
    this.buffer = [];
  }

  reject() {
    this.enabled = false;
    this.buffer = [];
  }
}

module.exports = Buffering;


/***/ }),

/***/ "./node_modules/electron-log/src/core/Logger.js":
/*!******************************************************!*\
  !*** ./node_modules/electron-log/src/core/Logger.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const scopeFactory = __webpack_require__(/*! ./scope */ "./node_modules/electron-log/src/core/scope.js");
const Buffering = __webpack_require__(/*! ./Buffering */ "./node_modules/electron-log/src/core/Buffering.js");

/**
 * @property {Function} error
 * @property {Function} warn
 * @property {Function} info
 * @property {Function} verbose
 * @property {Function} debug
 * @property {Function} silly
 */
class Logger {
  static instances = {};

  dependencies = {};
  errorHandler = null;
  eventLogger = null;
  functions = {};
  hooks = [];
  isDev = false;
  levels = null;
  logId = null;
  scope = null;
  transports = {};
  variables = {};

  constructor({
    allowUnknownLevel = false,
    dependencies = {},
    errorHandler,
    eventLogger,
    initializeFn,
    isDev = false,
    levels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'],
    logId,
    transportFactories = {},
    variables,
  } = {}) {
    this.addLevel = this.addLevel.bind(this);
    this.create = this.create.bind(this);
    this.initialize = this.initialize.bind(this);
    this.logData = this.logData.bind(this);
    this.processMessage = this.processMessage.bind(this);

    this.allowUnknownLevel = allowUnknownLevel;
    this.buffering = new Buffering(this);
    this.dependencies = dependencies;
    this.initializeFn = initializeFn;
    this.isDev = isDev;
    this.levels = levels;
    this.logId = logId;
    this.scope = scopeFactory(this);
    this.transportFactories = transportFactories;
    this.variables = variables || {};

    for (const name of this.levels) {
      this.addLevel(name, false);
    }
    this.log = this.info;
    this.functions.log = this.log;

    this.errorHandler = errorHandler;
    errorHandler?.setOptions({ ...dependencies, logFn: this.error });

    this.eventLogger = eventLogger;
    eventLogger?.setOptions({ ...dependencies, logger: this });

    for (const [name, factory] of Object.entries(transportFactories)) {
      this.transports[name] = factory(this, dependencies);
    }

    Logger.instances[logId] = this;
  }

  static getInstance({ logId }) {
    return this.instances[logId] || this.instances.default;
  }

  addLevel(level, index = this.levels.length) {
    if (index !== false) {
      this.levels.splice(index, 0, level);
    }

    this[level] = (...args) => this.logData(args, { level });
    this.functions[level] = this[level];
  }

  catchErrors(options) {
    this.processMessage(
      {
        data: ['log.catchErrors is deprecated. Use log.errorHandler instead'],
        level: 'warn',
      },
      { transports: ['console'] },
    );
    return this.errorHandler.startCatching(options);
  }

  create(options) {
    if (typeof options === 'string') {
      options = { logId: options };
    }

    return new Logger({
      dependencies: this.dependencies,
      errorHandler: this.errorHandler,
      initializeFn: this.initializeFn,
      isDev: this.isDev,
      transportFactories: this.transportFactories,
      variables: { ...this.variables },
      ...options,
    });
  }

  compareLevels(passLevel, checkLevel, levels = this.levels) {
    const pass = levels.indexOf(passLevel);
    const check = levels.indexOf(checkLevel);

    if (check === -1 || pass === -1) {
      return true;
    }

    return check <= pass;
  }

  initialize(options = {}) {
    this.initializeFn({ logger: this, ...this.dependencies, ...options });
  }

  logData(data, options = {}) {
    if (this.buffering.enabled) {
      this.buffering.addMessage({ data, ...options });
    } else {
      this.processMessage({ data, ...options });
    }
  }

  processMessage(message, { transports = this.transports } = {}) {
    if (message.cmd === 'errorHandler') {
      this.errorHandler.handle(message.error, {
        errorName: message.errorName,
        processType: 'renderer',
        showDialog: Boolean(message.showDialog),
      });
      return;
    }

    let level = message.level;
    if (!this.allowUnknownLevel) {
      level = this.levels.includes(message.level) ? message.level : 'info';
    }

    const normalizedMessage = {
      date: new Date(),
      logId: this.logId,
      ...message,
      level,
      variables: {
        ...this.variables,
        ...message.variables,
      },
    };

    for (const [transName, transFn] of this.transportEntries(transports)) {
      if (typeof transFn !== 'function' || transFn.level === false) {
        continue;
      }

      if (!this.compareLevels(transFn.level, message.level)) {
        continue;
      }

      try {
        // eslint-disable-next-line arrow-body-style
        const transformedMsg = this.hooks.reduce((msg, hook) => {
          return msg ? hook(msg, transFn, transName) : msg;
        }, normalizedMessage);

        if (transformedMsg) {
          transFn({ ...transformedMsg, data: [...transformedMsg.data] });
        }
      } catch (e) {
        this.processInternalErrorFn(e);
      }
    }
  }

  processInternalErrorFn(_e) {
    // Do nothing by default
  }

  transportEntries(transports = this.transports) {
    const transportArray = Array.isArray(transports)
      ? transports
      : Object.entries(transports);

    return transportArray
      .map((item) => {
        switch (typeof item) {
          case 'string':
            return this.transports[item] ? [item, this.transports[item]] : null;
          case 'function':
            return [item.name, item];
          default:
            return Array.isArray(item) ? item : null;
        }
      })
      .filter(Boolean);
  }
}

module.exports = Logger;


/***/ }),

/***/ "./node_modules/electron-log/src/core/scope.js":
/*!*****************************************************!*\
  !*** ./node_modules/electron-log/src/core/scope.js ***!
  \*****************************************************/
/***/ ((module) => {



module.exports = scopeFactory;

function scopeFactory(logger) {
  return Object.defineProperties(scope, {
    defaultLabel: { value: '', writable: true },
    labelPadding: { value: true, writable: true },
    maxLabelLength: { value: 0, writable: true },
    labelLength: {
      get() {
        switch (typeof scope.labelPadding) {
          case 'boolean': return scope.labelPadding ? scope.maxLabelLength : 0;
          case 'number': return scope.labelPadding;
          default: return 0;
        }
      },
    },
  });

  function scope(label) {
    scope.maxLabelLength = Math.max(scope.maxLabelLength, label.length);

    const newScope = {};
    for (const level of logger.levels) {
      newScope[level] = (...d) => logger.logData(d, { level, scope: label });
    }
    newScope.log = newScope.info;
    return newScope;
  }
}


/***/ }),

/***/ "./node_modules/electron-log/src/core/transforms/transform.js":
/*!********************************************************************!*\
  !*** ./node_modules/electron-log/src/core/transforms/transform.js ***!
  \********************************************************************/
/***/ ((module) => {



module.exports = { transform };

function transform({
  logger,
  message,
  transport,

  initialData = message?.data || [],
  transforms = transport?.transforms,
}) {
  return transforms.reduce((data, trans) => {
    if (typeof trans === 'function') {
      return trans({ data, logger, message, transport });
    }

    return data;
  }, initialData);
}


/***/ }),

/***/ "./node_modules/electron-log/src/renderer/index.js":
/*!*********************************************************!*\
  !*** ./node_modules/electron-log/src/renderer/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const Logger = __webpack_require__(/*! ../core/Logger */ "./node_modules/electron-log/src/core/Logger.js");
const RendererErrorHandler = __webpack_require__(/*! ./lib/RendererErrorHandler */ "./node_modules/electron-log/src/renderer/lib/RendererErrorHandler.js");
const transportConsole = __webpack_require__(/*! ./lib/transports/console */ "./node_modules/electron-log/src/renderer/lib/transports/console.js");
const transportIpc = __webpack_require__(/*! ./lib/transports/ipc */ "./node_modules/electron-log/src/renderer/lib/transports/ipc.js");

module.exports = createLogger();
module.exports.Logger = Logger;
module.exports["default"] = module.exports;

function createLogger() {
  const logger = new Logger({
    allowUnknownLevel: true,
    errorHandler: new RendererErrorHandler(),
    initializeFn: () => {},
    logId: 'default',
    transportFactories: {
      console: transportConsole,
      ipc: transportIpc,
    },
    variables: {
      processType: 'renderer',
    },
  });

  logger.errorHandler.setOptions({
    logFn({ error, errorName, showDialog }) {
      logger.transports.console({
        data: [errorName, error].filter(Boolean),
        level: 'error',
      });
      logger.transports.ipc({
        cmd: 'errorHandler',
        error: {
          cause: error?.cause,
          code: error?.code,
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
        },
        errorName,
        logId: logger.logId,
        showDialog,
      });
    },
  });

  if (typeof window === 'object') {
    window.addEventListener('message', (event) => {
      const { cmd, logId, ...message } = event.data || {};
      const instance = Logger.getInstance({ logId });

      if (cmd === 'message') {
        instance.processMessage(message, { transports: ['console'] });
      }
    });
  }

  // To support custom levels
  return new Proxy(logger, {
    get(target, prop) {
      if (typeof target[prop] !== 'undefined') {
        return target[prop];
      }

      return (...data) => logger.logData(data, { level: prop });
    },
  });
}


/***/ }),

/***/ "./node_modules/electron-log/src/renderer/lib/RendererErrorHandler.js":
/*!****************************************************************************!*\
  !*** ./node_modules/electron-log/src/renderer/lib/RendererErrorHandler.js ***!
  \****************************************************************************/
/***/ ((module) => {



// eslint-disable-next-line no-console
const consoleError = console.error;

class RendererErrorHandler {
  logFn = null;
  onError = null;
  showDialog = false;
  preventDefault = true;

  constructor({ logFn = null } = {}) {
    this.handleError = this.handleError.bind(this);
    this.handleRejection = this.handleRejection.bind(this);
    this.startCatching = this.startCatching.bind(this);
    this.logFn = logFn;
  }

  handle(error, {
    logFn = this.logFn,
    errorName = '',
    onError = this.onError,
    showDialog = this.showDialog,
  } = {}) {
    try {
      if (onError?.({ error, errorName, processType: 'renderer' }) !== false) {
        logFn({ error, errorName, showDialog });
      }
    } catch {
      consoleError(error);
    }
  }

  setOptions({ logFn, onError, preventDefault, showDialog }) {
    if (typeof logFn === 'function') {
      this.logFn = logFn;
    }

    if (typeof onError === 'function') {
      this.onError = onError;
    }

    if (typeof preventDefault === 'boolean') {
      this.preventDefault = preventDefault;
    }

    if (typeof showDialog === 'boolean') {
      this.showDialog = showDialog;
    }
  }

  startCatching({ onError, showDialog } = {}) {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.setOptions({ onError, showDialog });

    window.addEventListener('error', (event) => {
      this.preventDefault && event.preventDefault?.();
      this.handleError(event.error || event);
    });
    window.addEventListener('unhandledrejection', (event) => {
      this.preventDefault && event.preventDefault?.();
      this.handleRejection(event.reason || event);
    });
  }

  handleError(error) {
    this.handle(error, { errorName: 'Unhandled' });
  }

  handleRejection(reason) {
    const error = reason instanceof Error
      ? reason
      : new Error(JSON.stringify(reason));
    this.handle(error, { errorName: 'Unhandled rejection' });
  }
}

module.exports = RendererErrorHandler;


/***/ }),

/***/ "./node_modules/electron-log/src/renderer/lib/transports/console.js":
/*!**************************************************************************!*\
  !*** ./node_modules/electron-log/src/renderer/lib/transports/console.js ***!
  \**************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



/* eslint-disable no-console */

const { transform } = __webpack_require__(/*! ../../../core/transforms/transform */ "./node_modules/electron-log/src/core/transforms/transform.js");

module.exports = consoleTransportRendererFactory;

const consoleMethods = {
  error: console.error,
  warn: console.warn,
  info: console.info,
  verbose: console.info,
  debug: console.debug,
  silly: console.debug,
  log: console.log,
};

function consoleTransportRendererFactory(logger) {
  return Object.assign(transport, {
    format: '{h}:{i}:{s}.{ms}{scope} › {text}',
    transforms: [formatDataFn],

    writeFn({ message: { level, data } }) {
      const consoleLogFn = consoleMethods[level] || consoleMethods.info;

      // make an empty call stack
      setTimeout(() => consoleLogFn(...data));
    },
  });

  function transport(message) {
    transport.writeFn({
      message: { ...message, data: transform({ logger, message, transport }) },
    });
  }
}

function formatDataFn({
  data = [],
  logger = {},
  message = {},
  transport = {},
}) {
  if (typeof transport.format === 'function') {
    return transport.format({
      data,
      level: message?.level || 'info',
      logger,
      message,
      transport,
    });
  }

  if (typeof transport.format !== 'string') {
    return data;
  }

  data.unshift(transport.format);

  // Concatenate the first two data items to support printf-like templates
  if (typeof data[1] === 'string' && data[1].match(/%[1cdfiOos]/)) {
    data = [`${data[0]} ${data[1]}`, ...data.slice(2)];
  }

  const date = message.date || new Date();
  data[0] = data[0]
    .replace(/\{(\w+)}/g, (substring, name) => {
      switch (name) {
        case 'level': return message.level;
        case 'logId': return message.logId;
        case 'scope': {
          const scope = message.scope || logger.scope?.defaultLabel;
          return scope ? ` (${scope})` : '';
        }
        case 'text': return '';

        case 'y': return date.getFullYear().toString(10);
        case 'm': return (date.getMonth() + 1).toString(10)
          .padStart(2, '0');
        case 'd': return date.getDate().toString(10).padStart(2, '0');
        case 'h': return date.getHours().toString(10).padStart(2, '0');
        case 'i': return date.getMinutes().toString(10).padStart(2, '0');
        case 's': return date.getSeconds().toString(10).padStart(2, '0');
        case 'ms': return date.getMilliseconds().toString(10)
          .padStart(3, '0');
        case 'iso': return date.toISOString();

        default: return message.variables?.[name] || substring;
      }
    })
    .trim();

  return data;
}


/***/ }),

/***/ "./node_modules/electron-log/src/renderer/lib/transports/ipc.js":
/*!**********************************************************************!*\
  !*** ./node_modules/electron-log/src/renderer/lib/transports/ipc.js ***!
  \**********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



const { transform } = __webpack_require__(/*! ../../../core/transforms/transform */ "./node_modules/electron-log/src/core/transforms/transform.js");

module.exports = ipcTransportRendererFactory;

const RESTRICTED_TYPES = new Set([Promise, WeakMap, WeakSet]);

function ipcTransportRendererFactory(logger) {
  return Object.assign(transport, {
    depth: 5,
    transforms: [serializeFn],
  });

  function transport(message) {
    if (!window.__electronLog) {
      logger.processMessage(
        {
          data: ['electron-log: logger isn\'t initialized in the main process'],
          level: 'error',
        },
        { transports: ['console'] },
      );
      return;
    }

    try {
      const serialized = transform({
        initialData: message,
        logger,
        message,
        transport,
      });

      __electronLog.sendToMain(serialized);
    } catch (e) {
      logger.transports.console({
        data: ['electronLog.transports.ipc', e, 'data:', message.data],
        level: 'error',
      });
    }
  }
}

/**
 * Is type primitive, including null and undefined
 * @param {any} value
 * @returns {boolean}
 */
function isPrimitive(value) {
  return Object(value) !== value;
}

function serializeFn({
  data,
  depth,
  seen = new WeakSet(),
  transport = {},
} = {}) {
  const actualDepth = depth || transport.depth || 5;

  if (seen.has(data)) {
    return '[Circular]';
  }

  if (actualDepth < 1) {
    if (isPrimitive(data)) {
      return data;
    }

    if (Array.isArray(data)) {
      return '[Array]';
    }

    return `[${typeof data}]`;
  }

  if (['function', 'symbol'].includes(typeof data)) {
    return data.toString();
  }

  if (isPrimitive(data)) {
    return data;
  }

  // Object types

  if (RESTRICTED_TYPES.has(data.constructor)) {
    return `[${data.constructor.name}]`;
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializeFn({
      data: item,
      depth: actualDepth - 1,
      seen,
    }));
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (data instanceof Error) {
    return data.stack;
  }

  if (data instanceof Map) {
    return new Map(
      Array
        .from(data)
        .map(([key, value]) => [
          serializeFn({ data: key, depth: actualDepth - 1, seen }),
          serializeFn({ data: value, depth: actualDepth - 1, seen }),
        ]),
    );
  }

  if (data instanceof Set) {
    return new Set(
      Array.from(data).map(
        (val) => serializeFn({ data: val, depth: actualDepth - 1, seen }),
      ),
    );
  }

  seen.add(data);

  return Object.fromEntries(
    Object.entries(data).map(
      ([key, value]) => [
        key,
        serializeFn({ data: value, depth: actualDepth - 1, seen }),
      ],
    ),
  );
}


/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("electron");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!***************************!*\
  !*** ./src/main/index.ts ***!
  \***************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ "electron");
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! fs */ "fs");
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var child_process__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! child_process */ "child_process");
/* harmony import */ var child_process__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(child_process__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var electron_log__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! electron-log */ "./node_modules/electron-log/src/renderer/index.js");
/* harmony import */ var electron_log__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(electron_log__WEBPACK_IMPORTED_MODULE_4__);
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }






// Configure logging
electron_log__WEBPACK_IMPORTED_MODULE_4__.transports.console.level = 'debug';
electron_log__WEBPACK_IMPORTED_MODULE_4__.transports.file.level = 'debug';
electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Application starting');

// Store windows globally to prevent garbage collection
var mainWindow = null;
var tray = null;
var isQuitting = false;

// Path to core binary
var isDevelopment = "development" !== 'production';
var coreExecutablePath = isDevelopment ? path__WEBPACK_IMPORTED_MODULE_1__.join(process.cwd(), '../core/build/bin/utm-core') : path__WEBPACK_IMPORTED_MODULE_1__.join(process.resourcesPath, 'bin/utm-core');
electron_log__WEBPACK_IMPORTED_MODULE_4__.info("Core executable path: ".concat(coreExecutablePath));
electron_log__WEBPACK_IMPORTED_MODULE_4__.info("Development mode: ".concat(isDevelopment));

/**
 * Create the main application window
 */
function createMainWindow() {
  electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Creating main window');
  mainWindow = new electron__WEBPACK_IMPORTED_MODULE_0__.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path__WEBPACK_IMPORTED_MODULE_1__.join(__dirname, 'preload.js')
    },
    show: false
  });
  var htmlPath = path__WEBPACK_IMPORTED_MODULE_1__.join(__dirname, '../index.html');
  electron_log__WEBPACK_IMPORTED_MODULE_4__.info("Loading HTML from: ".concat(htmlPath));

  // Load main window content
  if (isDevelopment) {
    mainWindow.loadFile(htmlPath);
    electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Opening DevTools in development mode');
    // Open DevTools in development mode
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(htmlPath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', function () {
    electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Main window ready to show');
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Handle window close event
  mainWindow.on('close', function (event) {
    electron_log__WEBPACK_IMPORTED_MODULE_4__.debug('Window close event triggered');
    if (!isQuitting) {
      electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Hiding window instead of closing');
      event.preventDefault();
      if (mainWindow) {
        mainWindow.hide();
      }
      return false;
    }
    electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Window closing');
    return true;
  });

  // Clean up on closed
  mainWindow.on('closed', function () {
    electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Main window closed');
    mainWindow = null;
  });
  return mainWindow;
}

/**
 * Create the system tray icon
 */
function createTray() {
  electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Creating system tray');
  // For development, use a simple approach
  var iconPath = path__WEBPACK_IMPORTED_MODULE_1__.join(__dirname, '..', 'assets', 'icons', '16x16.png');
  electron_log__WEBPACK_IMPORTED_MODULE_4__.debug("Looking for icon at: ".concat(iconPath));

  // Fallback to a system icon if our custom icon is not found
  if (!fs__WEBPACK_IMPORTED_MODULE_2__.existsSync(iconPath)) {
    var alternateIconPath = path__WEBPACK_IMPORTED_MODULE_1__.join(__dirname, 'assets', 'icons', '16x16.png');
    electron_log__WEBPACK_IMPORTED_MODULE_4__.debug("Primary icon not found, trying alternate path: ".concat(alternateIconPath));
    iconPath = alternateIconPath;

    // Create a directory for the icon if it doesn't exist
    if (!fs__WEBPACK_IMPORTED_MODULE_2__.existsSync(path__WEBPACK_IMPORTED_MODULE_1__.dirname(iconPath))) {
      electron_log__WEBPACK_IMPORTED_MODULE_4__.debug('Creating icon directory');
      fs__WEBPACK_IMPORTED_MODULE_2__.mkdirSync(path__WEBPACK_IMPORTED_MODULE_1__.dirname(iconPath), {
        recursive: true
      });
      // Touch the file to create it if it doesn't exist
      fs__WEBPACK_IMPORTED_MODULE_2__.writeFileSync(iconPath, '');
      electron_log__WEBPACK_IMPORTED_MODULE_4__.debug('Created empty icon file as fallback');
    }
  }
  electron_log__WEBPACK_IMPORTED_MODULE_4__.info("Using icon from: ".concat(iconPath));
  tray = new electron__WEBPACK_IMPORTED_MODULE_0__.Tray(iconPath);
  var contextMenu = electron__WEBPACK_IMPORTED_MODULE_0__.Menu.buildFromTemplate([{
    label: 'Show Ubuntu Time Machine',
    click: function click() {
      electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Tray: Show application clicked');
      if (mainWindow) mainWindow.show();
    }
  }, {
    type: 'separator'
  }, {
    label: 'Perform Backup Now',
    click: function click() {
      electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Tray: Perform Backup clicked');
      sendToRenderer('trigger-backup');
    }
  }, {
    label: 'Check for Updates',
    click: function click() {
      electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Tray: Check for Updates clicked');
      checkForUpdates();
    }
  }, {
    type: 'separator'
  }, {
    label: 'Quit',
    click: function click() {
      electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Tray: Quit clicked');
      isQuitting = true;
      electron__WEBPACK_IMPORTED_MODULE_0__.app.quit();
    }
  }]);
  tray.setToolTip('Ubuntu Time Machine');
  tray.setContextMenu(contextMenu);
  tray.on('click', function () {
    electron_log__WEBPACK_IMPORTED_MODULE_4__.debug('Tray icon clicked');
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Hiding main window from tray click');
        mainWindow.hide();
      } else {
        electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Showing main window from tray click');
        mainWindow.show();
      }
    }
  });
  return tray;
}

/**
 * Send a message to the renderer process
 */
function sendToRenderer(channel) {
  for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }
  electron_log__WEBPACK_IMPORTED_MODULE_4__.debug("Sending to renderer: ".concat(channel), args);
  if (mainWindow && mainWindow.webContents) {
    var _mainWindow$webConten;
    (_mainWindow$webConten = mainWindow.webContents).send.apply(_mainWindow$webConten, [channel].concat(args));
  } else {
    electron_log__WEBPACK_IMPORTED_MODULE_4__.warn("Failed to send to renderer: ".concat(channel, " (window not available)"));
  }
}

/**
 * Check for application updates
 */
function checkForUpdates() {
  electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Checking for updates');
  // Implementation of checkForUpdates function
}

// Application initialization
electron__WEBPACK_IMPORTED_MODULE_0__.app.whenReady().then(function () {
  electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Electron app ready');
  createMainWindow();
  createTray();

  // Check if core binary exists
  electron_log__WEBPACK_IMPORTED_MODULE_4__.debug("Checking if core exists at: ".concat(coreExecutablePath));
  if (!fs__WEBPACK_IMPORTED_MODULE_2__.existsSync(coreExecutablePath)) {
    electron_log__WEBPACK_IMPORTED_MODULE_4__.error("Core binary not found at: ".concat(coreExecutablePath));
    electron__WEBPACK_IMPORTED_MODULE_0__.dialog.showErrorBox('Core Component Missing', "The core backup component was not found at: ".concat(coreExecutablePath));
    electron__WEBPACK_IMPORTED_MODULE_0__.app.quit();
    return;
  }
  electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Core binary verified');

  // Set up IPC handlers
  setupIpcHandlers();

  // Check for updates on startup
  if (!isDevelopment) {
    electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Scheduling update check');
    setTimeout(checkForUpdates, 3000);
  }
});

// Prevent multiple instances
var gotTheLock = electron__WEBPACK_IMPORTED_MODULE_0__.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron_log__WEBPACK_IMPORTED_MODULE_4__.warn('Another instance is already running. Quitting this instance.');
  electron__WEBPACK_IMPORTED_MODULE_0__.app.quit();
} else {
  electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Got single instance lock');
  electron__WEBPACK_IMPORTED_MODULE_0__.app.on('second-instance', function () {
    electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Second instance detected, focusing main window');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// MacOS specific behavior
electron__WEBPACK_IMPORTED_MODULE_0__.app.on('activate', function () {
  electron_log__WEBPACK_IMPORTED_MODULE_4__.debug('Activate event triggered');
  if (electron__WEBPACK_IMPORTED_MODULE_0__.BrowserWindow.getAllWindows().length === 0) {
    electron_log__WEBPACK_IMPORTED_MODULE_4__.info('No windows found, creating main window');
    createMainWindow();
  }
});

// Prepare to quit
electron__WEBPACK_IMPORTED_MODULE_0__.app.on('before-quit', function () {
  electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Application is preparing to quit');
  isQuitting = true;
});

// Clean up
electron__WEBPACK_IMPORTED_MODULE_0__.app.on('quit', function () {
  electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Application is quitting');
  tray = null;
});

// Set up IPC handlers for renderer communication
function setupIpcHandlers() {
  electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Setting up IPC handlers');

  // Execute core command
  electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('execute-core-command', /*#__PURE__*/function () {
    var _ref = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee(event, args) {
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            electron_log__WEBPACK_IMPORTED_MODULE_4__.info("Executing core command with args: ".concat(args.join(' ')));
            return _context.abrupt("return", new Promise(function (resolve, reject) {
              electron_log__WEBPACK_IMPORTED_MODULE_4__.debug("Spawning process: ".concat(coreExecutablePath, " ").concat(args.join(' ')));
              var command = child_process__WEBPACK_IMPORTED_MODULE_3__.spawn(coreExecutablePath, args);
              var stdout = '';
              var stderr = '';
              command.stdout.on('data', function (data) {
                var chunk = data.toString();
                stdout += chunk;
                electron_log__WEBPACK_IMPORTED_MODULE_4__.debug("Core stdout: ".concat(chunk.trim()));
                sendToRenderer('core-command-output', chunk);
              });
              command.stderr.on('data', function (data) {
                var chunk = data.toString();
                stderr += chunk;
                electron_log__WEBPACK_IMPORTED_MODULE_4__.warn("Core stderr: ".concat(chunk.trim()));
                sendToRenderer('core-command-error', chunk);
              });
              command.on('close', function (code) {
                electron_log__WEBPACK_IMPORTED_MODULE_4__.info("Core command completed with code: ".concat(code));
                if (code === 0) {
                  electron_log__WEBPACK_IMPORTED_MODULE_4__.debug('Command successful');
                  resolve({
                    success: true,
                    stdout: stdout,
                    stderr: stderr
                  });
                } else {
                  electron_log__WEBPACK_IMPORTED_MODULE_4__.error("Command failed with code ".concat(code));
                  reject({
                    success: false,
                    code: code,
                    stdout: stdout,
                    stderr: stderr
                  });
                }
              });
              command.on('error', function (error) {
                electron_log__WEBPACK_IMPORTED_MODULE_4__.error("Error executing core command: ".concat(error.message));
                reject({
                  success: false,
                  error: error.message
                });
              });
            }));
          case 2:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }());

  // Get list of available backup profiles
  electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('get-backup-profiles', /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Getting backup profiles');
          return _context2.abrupt("return", new Promise(function (resolve, reject) {
            electron_log__WEBPACK_IMPORTED_MODULE_4__.debug("Executing: ".concat(coreExecutablePath, " --list-profiles"));
            var command = child_process__WEBPACK_IMPORTED_MODULE_3__.spawn(coreExecutablePath, ['--list-profiles']);
            var stdout = '';
            var stderr = '';
            command.stdout.on('data', function (data) {
              var chunk = data.toString();
              stdout += chunk;
              electron_log__WEBPACK_IMPORTED_MODULE_4__.debug("Profile list stdout: ".concat(chunk.trim()));
            });
            command.stderr.on('data', function (data) {
              var chunk = data.toString();
              stderr += chunk;
              electron_log__WEBPACK_IMPORTED_MODULE_4__.warn("Profile list stderr: ".concat(chunk.trim()));
            });
            command.on('close', function (code) {
              electron_log__WEBPACK_IMPORTED_MODULE_4__.info("Profile list command completed with code: ".concat(code));
              if (code === 0) {
                var lines = stdout.split('\n').filter(function (line) {
                  return line.trim().startsWith('-');
                });
                var profiles = lines.map(function (line) {
                  return line.trim().substring(2).trim();
                });
                electron_log__WEBPACK_IMPORTED_MODULE_4__.info("Found ".concat(profiles.length, " profiles"));
                electron_log__WEBPACK_IMPORTED_MODULE_4__.debug("Profiles: ".concat(JSON.stringify(profiles)));
                resolve(profiles);
              } else {
                electron_log__WEBPACK_IMPORTED_MODULE_4__.error("Profile list failed with code ".concat(code, ": ").concat(stderr));
                reject({
                  code: code,
                  stderr: stderr
                });
              }
            });
            command.on('error', function (error) {
              electron_log__WEBPACK_IMPORTED_MODULE_4__.error("Error listing profiles: ".concat(error.message));
              reject(error);
            });
          }));
        case 2:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  })));

  // Open external URL
  electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('open-external-url', /*#__PURE__*/function () {
    var _ref3 = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee3(event, url) {
      return _regeneratorRuntime().wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            electron_log__WEBPACK_IMPORTED_MODULE_4__.info("Opening external URL: ".concat(url));
            return _context3.abrupt("return", electron__WEBPACK_IMPORTED_MODULE_0__.shell.openExternal(url));
          case 2:
          case "end":
            return _context3.stop();
        }
      }, _callee3);
    }));
    return function (_x3, _x4) {
      return _ref3.apply(this, arguments);
    };
  }());

  // Show open directory dialog
  electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain.handle('show-open-directory-dialog', /*#__PURE__*/_asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
    var result;
    return _regeneratorRuntime().wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          electron_log__WEBPACK_IMPORTED_MODULE_4__.info('Showing directory selection dialog');
          _context4.next = 3;
          return electron__WEBPACK_IMPORTED_MODULE_0__.dialog.showOpenDialog({
            properties: ['openDirectory']
          });
        case 3:
          result = _context4.sent;
          electron_log__WEBPACK_IMPORTED_MODULE_4__.info("Directory selection result: ".concat(result.canceled ? 'canceled' : result.filePaths.join(', ')));
          return _context4.abrupt("return", result.filePaths);
        case 6:
        case "end":
          return _context4.stop();
      }
    }, _callee4);
  })));
  electron_log__WEBPACK_IMPORTED_MODULE_4__.info('IPC handlers setup complete');
}
})();

/******/ })()
;
//# sourceMappingURL=main.js.map