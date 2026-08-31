var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/i18next/dist/cjs/i18next.js
var require_i18next = __commonJS({
  "node_modules/i18next/dist/cjs/i18next.js"(exports2, module2) {
    "use strict";
    var isString = (obj) => typeof obj === "string";
    var defer = () => {
      let res;
      let rej;
      const promise = new Promise((resolve, reject) => {
        res = resolve;
        rej = reject;
      });
      promise.resolve = res;
      promise.reject = rej;
      return promise;
    };
    var makeString = (object) => {
      if (object == null)
        return "";
      return "" + object;
    };
    var copy = (a, s, t) => {
      a.forEach((m) => {
        if (s[m])
          t[m] = s[m];
      });
    };
    var lastOfPathSeparatorRegExp = /###/g;
    var cleanKey = (key) => key && key.indexOf("###") > -1 ? key.replace(lastOfPathSeparatorRegExp, ".") : key;
    var canNotTraverseDeeper = (object) => !object || isString(object);
    var getLastOfPath = (object, path, Empty) => {
      const stack = !isString(path) ? path : path.split(".");
      let stackIndex = 0;
      while (stackIndex < stack.length - 1) {
        if (canNotTraverseDeeper(object))
          return {};
        const key = cleanKey(stack[stackIndex]);
        if (!object[key] && Empty)
          object[key] = new Empty();
        if (Object.prototype.hasOwnProperty.call(object, key)) {
          object = object[key];
        } else {
          object = {};
        }
        ++stackIndex;
      }
      if (canNotTraverseDeeper(object))
        return {};
      return {
        obj: object,
        k: cleanKey(stack[stackIndex])
      };
    };
    var setPath = (object, path, newValue) => {
      const {
        obj,
        k
      } = getLastOfPath(object, path, Object);
      if (obj !== void 0 || path.length === 1) {
        obj[k] = newValue;
        return;
      }
      let e = path[path.length - 1];
      let p = path.slice(0, path.length - 1);
      let last = getLastOfPath(object, p, Object);
      while (last.obj === void 0 && p.length) {
        e = `${p[p.length - 1]}.${e}`;
        p = p.slice(0, p.length - 1);
        last = getLastOfPath(object, p, Object);
        if ((last == null ? void 0 : last.obj) && typeof last.obj[`${last.k}.${e}`] !== "undefined") {
          last.obj = void 0;
        }
      }
      last.obj[`${last.k}.${e}`] = newValue;
    };
    var pushPath = (object, path, newValue, concat) => {
      const {
        obj,
        k
      } = getLastOfPath(object, path, Object);
      obj[k] = obj[k] || [];
      obj[k].push(newValue);
    };
    var getPath = (object, path) => {
      const {
        obj,
        k
      } = getLastOfPath(object, path);
      if (!obj)
        return void 0;
      if (!Object.prototype.hasOwnProperty.call(obj, k))
        return void 0;
      return obj[k];
    };
    var getPathWithDefaults = (data, defaultData, key) => {
      const value = getPath(data, key);
      if (value !== void 0) {
        return value;
      }
      return getPath(defaultData, key);
    };
    var deepExtend = (target, source, overwrite) => {
      for (const prop in source) {
        if (prop !== "__proto__" && prop !== "constructor") {
          if (prop in target) {
            if (isString(target[prop]) || target[prop] instanceof String || isString(source[prop]) || source[prop] instanceof String) {
              if (overwrite)
                target[prop] = source[prop];
            } else {
              deepExtend(target[prop], source[prop], overwrite);
            }
          } else {
            target[prop] = source[prop];
          }
        }
      }
      return target;
    };
    var regexEscape = (str) => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    var _entityMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "/": "&#x2F;"
    };
    var escape = (data) => {
      if (isString(data)) {
        return data.replace(/[&<>"'\/]/g, (s) => _entityMap[s]);
      }
      return data;
    };
    var RegExpCache = class {
      constructor(capacity) {
        this.capacity = capacity;
        this.regExpMap = /* @__PURE__ */ new Map();
        this.regExpQueue = [];
      }
      getRegExp(pattern) {
        const regExpFromCache = this.regExpMap.get(pattern);
        if (regExpFromCache !== void 0) {
          return regExpFromCache;
        }
        const regExpNew = new RegExp(pattern);
        if (this.regExpQueue.length === this.capacity) {
          this.regExpMap.delete(this.regExpQueue.shift());
        }
        this.regExpMap.set(pattern, regExpNew);
        this.regExpQueue.push(pattern);
        return regExpNew;
      }
    };
    var chars = [" ", ",", "?", "!", ";"];
    var looksLikeObjectPathRegExpCache = new RegExpCache(20);
    var looksLikeObjectPath = (key, nsSeparator, keySeparator) => {
      nsSeparator = nsSeparator || "";
      keySeparator = keySeparator || "";
      const possibleChars = chars.filter((c) => nsSeparator.indexOf(c) < 0 && keySeparator.indexOf(c) < 0);
      if (possibleChars.length === 0)
        return true;
      const r = looksLikeObjectPathRegExpCache.getRegExp(`(${possibleChars.map((c) => c === "?" ? "\\?" : c).join("|")})`);
      let matched = !r.test(key);
      if (!matched) {
        const ki = key.indexOf(keySeparator);
        if (ki > 0 && !r.test(key.substring(0, ki))) {
          matched = true;
        }
      }
      return matched;
    };
    var deepFind = (obj, path, keySeparator = ".") => {
      if (!obj)
        return void 0;
      if (obj[path]) {
        if (!Object.prototype.hasOwnProperty.call(obj, path))
          return void 0;
        return obj[path];
      }
      const tokens = path.split(keySeparator);
      let current = obj;
      for (let i = 0; i < tokens.length; ) {
        if (!current || typeof current !== "object") {
          return void 0;
        }
        let next;
        let nextPath = "";
        for (let j = i; j < tokens.length; ++j) {
          if (j !== i) {
            nextPath += keySeparator;
          }
          nextPath += tokens[j];
          next = current[nextPath];
          if (next !== void 0) {
            if (["string", "number", "boolean"].indexOf(typeof next) > -1 && j < tokens.length - 1) {
              continue;
            }
            i += j - i + 1;
            break;
          }
        }
        current = next;
      }
      return current;
    };
    var getCleanedCode = (code) => code == null ? void 0 : code.replace(/_/g, "-");
    var consoleLogger = {
      type: "logger",
      log(args) {
        this.output("log", args);
      },
      warn(args) {
        this.output("warn", args);
      },
      error(args) {
        this.output("error", args);
      },
      output(type, args) {
        var _a, _b;
        (_b = (_a = console == null ? void 0 : console[type]) == null ? void 0 : _a.apply) == null ? void 0 : _b.call(_a, console, args);
      }
    };
    var Logger = class _Logger {
      constructor(concreteLogger, options = {}) {
        this.init(concreteLogger, options);
      }
      init(concreteLogger, options = {}) {
        this.prefix = options.prefix || "i18next:";
        this.logger = concreteLogger || consoleLogger;
        this.options = options;
        this.debug = options.debug;
      }
      log(...args) {
        return this.forward(args, "log", "", true);
      }
      warn(...args) {
        return this.forward(args, "warn", "", true);
      }
      error(...args) {
        return this.forward(args, "error", "");
      }
      deprecate(...args) {
        return this.forward(args, "warn", "WARNING DEPRECATED: ", true);
      }
      forward(args, lvl, prefix, debugOnly) {
        if (debugOnly && !this.debug)
          return null;
        if (isString(args[0]))
          args[0] = `${prefix}${this.prefix} ${args[0]}`;
        return this.logger[lvl](args);
      }
      create(moduleName) {
        return new _Logger(this.logger, {
          ...{
            prefix: `${this.prefix}:${moduleName}:`
          },
          ...this.options
        });
      }
      clone(options) {
        options = options || this.options;
        options.prefix = options.prefix || this.prefix;
        return new _Logger(this.logger, options);
      }
    };
    var baseLogger = new Logger();
    var EventEmitter = class {
      constructor() {
        this.observers = {};
      }
      on(events, listener) {
        events.split(" ").forEach((event) => {
          if (!this.observers[event])
            this.observers[event] = /* @__PURE__ */ new Map();
          const numListeners = this.observers[event].get(listener) || 0;
          this.observers[event].set(listener, numListeners + 1);
        });
        return this;
      }
      off(event, listener) {
        if (!this.observers[event])
          return;
        if (!listener) {
          delete this.observers[event];
          return;
        }
        this.observers[event].delete(listener);
      }
      emit(event, ...args) {
        if (this.observers[event]) {
          const cloned = Array.from(this.observers[event].entries());
          cloned.forEach(([observer, numTimesAdded]) => {
            for (let i = 0; i < numTimesAdded; i++) {
              observer(...args);
            }
          });
        }
        if (this.observers["*"]) {
          const cloned = Array.from(this.observers["*"].entries());
          cloned.forEach(([observer, numTimesAdded]) => {
            for (let i = 0; i < numTimesAdded; i++) {
              observer.apply(observer, [event, ...args]);
            }
          });
        }
      }
    };
    var ResourceStore = class extends EventEmitter {
      constructor(data, options = {
        ns: ["translation"],
        defaultNS: "translation"
      }) {
        super();
        this.data = data || {};
        this.options = options;
        if (this.options.keySeparator === void 0) {
          this.options.keySeparator = ".";
        }
        if (this.options.ignoreJSONStructure === void 0) {
          this.options.ignoreJSONStructure = true;
        }
      }
      addNamespaces(ns) {
        if (this.options.ns.indexOf(ns) < 0) {
          this.options.ns.push(ns);
        }
      }
      removeNamespaces(ns) {
        const index = this.options.ns.indexOf(ns);
        if (index > -1) {
          this.options.ns.splice(index, 1);
        }
      }
      getResource(lng, ns, key, options = {}) {
        var _a, _b;
        const keySeparator = options.keySeparator !== void 0 ? options.keySeparator : this.options.keySeparator;
        const ignoreJSONStructure = options.ignoreJSONStructure !== void 0 ? options.ignoreJSONStructure : this.options.ignoreJSONStructure;
        let path;
        if (lng.indexOf(".") > -1) {
          path = lng.split(".");
        } else {
          path = [lng, ns];
          if (key) {
            if (Array.isArray(key)) {
              path.push(...key);
            } else if (isString(key) && keySeparator) {
              path.push(...key.split(keySeparator));
            } else {
              path.push(key);
            }
          }
        }
        const result = getPath(this.data, path);
        if (!result && !ns && !key && lng.indexOf(".") > -1) {
          lng = path[0];
          ns = path[1];
          key = path.slice(2).join(".");
        }
        if (result || !ignoreJSONStructure || !isString(key))
          return result;
        return deepFind((_b = (_a = this.data) == null ? void 0 : _a[lng]) == null ? void 0 : _b[ns], key, keySeparator);
      }
      addResource(lng, ns, key, value, options = {
        silent: false
      }) {
        const keySeparator = options.keySeparator !== void 0 ? options.keySeparator : this.options.keySeparator;
        let path = [lng, ns];
        if (key)
          path = path.concat(keySeparator ? key.split(keySeparator) : key);
        if (lng.indexOf(".") > -1) {
          path = lng.split(".");
          value = ns;
          ns = path[1];
        }
        this.addNamespaces(ns);
        setPath(this.data, path, value);
        if (!options.silent)
          this.emit("added", lng, ns, key, value);
      }
      addResources(lng, ns, resources, options = {
        silent: false
      }) {
        for (const m in resources) {
          if (isString(resources[m]) || Array.isArray(resources[m]))
            this.addResource(lng, ns, m, resources[m], {
              silent: true
            });
        }
        if (!options.silent)
          this.emit("added", lng, ns, resources);
      }
      addResourceBundle(lng, ns, resources, deep, overwrite, options = {
        silent: false,
        skipCopy: false
      }) {
        let path = [lng, ns];
        if (lng.indexOf(".") > -1) {
          path = lng.split(".");
          deep = resources;
          resources = ns;
          ns = path[1];
        }
        this.addNamespaces(ns);
        let pack = getPath(this.data, path) || {};
        if (!options.skipCopy)
          resources = JSON.parse(JSON.stringify(resources));
        if (deep) {
          deepExtend(pack, resources, overwrite);
        } else {
          pack = {
            ...pack,
            ...resources
          };
        }
        setPath(this.data, path, pack);
        if (!options.silent)
          this.emit("added", lng, ns, resources);
      }
      removeResourceBundle(lng, ns) {
        if (this.hasResourceBundle(lng, ns)) {
          delete this.data[lng][ns];
        }
        this.removeNamespaces(ns);
        this.emit("removed", lng, ns);
      }
      hasResourceBundle(lng, ns) {
        return this.getResource(lng, ns) !== void 0;
      }
      getResourceBundle(lng, ns) {
        if (!ns)
          ns = this.options.defaultNS;
        return this.getResource(lng, ns);
      }
      getDataByLanguage(lng) {
        return this.data[lng];
      }
      hasLanguageSomeTranslations(lng) {
        const data = this.getDataByLanguage(lng);
        const n = data && Object.keys(data) || [];
        return !!n.find((v) => data[v] && Object.keys(data[v]).length > 0);
      }
      toJSON() {
        return this.data;
      }
    };
    var postProcessor = {
      processors: {},
      addPostProcessor(module3) {
        this.processors[module3.name] = module3;
      },
      handle(processors, value, key, options, translator) {
        processors.forEach((processor) => {
          var _a;
          value = ((_a = this.processors[processor]) == null ? void 0 : _a.process(value, key, options, translator)) ?? value;
        });
        return value;
      }
    };
    var PATH_KEY = Symbol("i18next/PATH_KEY");
    function createProxy() {
      const state = [];
      const handler = /* @__PURE__ */ Object.create(null);
      let proxy;
      handler.get = (target, key) => {
        var _a;
        (_a = proxy == null ? void 0 : proxy.revoke) == null ? void 0 : _a.call(proxy);
        if (key === PATH_KEY)
          return state;
        state.push(key);
        proxy = Proxy.revocable(target, handler);
        return proxy.proxy;
      };
      return Proxy.revocable(/* @__PURE__ */ Object.create(null), handler).proxy;
    }
    function keysFromSelector(selector, opts) {
      const {
        [PATH_KEY]: path
      } = selector(createProxy());
      const keySeparator = (opts == null ? void 0 : opts.keySeparator) ?? ".";
      const nsSeparator = (opts == null ? void 0 : opts.nsSeparator) ?? ":";
      if (path.length > 1 && nsSeparator) {
        const ns = opts == null ? void 0 : opts.ns;
        const nsArray = Array.isArray(ns) ? ns : null;
        if (nsArray && nsArray.length > 1 && nsArray.slice(1).includes(path[0])) {
          return `${path[0]}${nsSeparator}${path.slice(1).join(keySeparator)}`;
        }
      }
      return path.join(keySeparator);
    }
    var checkedLoadedFor = {};
    var shouldHandleAsObject = (res) => !isString(res) && typeof res !== "boolean" && typeof res !== "number";
    var Translator = class _Translator extends EventEmitter {
      constructor(services, options = {}) {
        super();
        copy(["resourceStore", "languageUtils", "pluralResolver", "interpolator", "backendConnector", "i18nFormat", "utils"], services, this);
        this.options = options;
        if (this.options.keySeparator === void 0) {
          this.options.keySeparator = ".";
        }
        this.logger = baseLogger.create("translator");
      }
      changeLanguage(lng) {
        if (lng)
          this.language = lng;
      }
      exists(key, o = {
        interpolation: {}
      }) {
        const opt = {
          ...o
        };
        if (key == null)
          return false;
        const resolved = this.resolve(key, opt);
        if ((resolved == null ? void 0 : resolved.res) === void 0)
          return false;
        const isObject = shouldHandleAsObject(resolved.res);
        if (opt.returnObjects === false && isObject) {
          return false;
        }
        return true;
      }
      extractFromKey(key, opt) {
        let nsSeparator = opt.nsSeparator !== void 0 ? opt.nsSeparator : this.options.nsSeparator;
        if (nsSeparator === void 0)
          nsSeparator = ":";
        const keySeparator = opt.keySeparator !== void 0 ? opt.keySeparator : this.options.keySeparator;
        let namespaces = opt.ns || this.options.defaultNS || [];
        const wouldCheckForNsInKey = nsSeparator && key.indexOf(nsSeparator) > -1;
        const seemsNaturalLanguage = !this.options.userDefinedKeySeparator && !opt.keySeparator && !this.options.userDefinedNsSeparator && !opt.nsSeparator && !looksLikeObjectPath(key, nsSeparator, keySeparator);
        if (wouldCheckForNsInKey && !seemsNaturalLanguage) {
          const m = key.match(this.interpolator.nestingRegexp);
          if (m && m.length > 0) {
            return {
              key,
              namespaces: isString(namespaces) ? [namespaces] : namespaces
            };
          }
          const parts = key.split(nsSeparator);
          if (nsSeparator !== keySeparator || nsSeparator === keySeparator && this.options.ns.indexOf(parts[0]) > -1)
            namespaces = parts.shift();
          key = parts.join(keySeparator);
        }
        return {
          key,
          namespaces: isString(namespaces) ? [namespaces] : namespaces
        };
      }
      translate(keys, o, lastKey) {
        let opt = typeof o === "object" ? {
          ...o
        } : o;
        if (typeof opt !== "object" && this.options.overloadTranslationOptionHandler) {
          opt = this.options.overloadTranslationOptionHandler(arguments);
        }
        if (typeof opt === "object")
          opt = {
            ...opt
          };
        if (!opt)
          opt = {};
        if (keys == null)
          return "";
        if (typeof keys === "function")
          keys = keysFromSelector(keys, {
            ...this.options,
            ...opt
          });
        if (!Array.isArray(keys))
          keys = [String(keys)];
        keys = keys.map((k) => typeof k === "function" ? keysFromSelector(k, {
          ...this.options,
          ...opt
        }) : String(k));
        const returnDetails = opt.returnDetails !== void 0 ? opt.returnDetails : this.options.returnDetails;
        const keySeparator = opt.keySeparator !== void 0 ? opt.keySeparator : this.options.keySeparator;
        const {
          key,
          namespaces
        } = this.extractFromKey(keys[keys.length - 1], opt);
        const namespace = namespaces[namespaces.length - 1];
        let nsSeparator = opt.nsSeparator !== void 0 ? opt.nsSeparator : this.options.nsSeparator;
        if (nsSeparator === void 0)
          nsSeparator = ":";
        const lng = opt.lng || this.language;
        const appendNamespaceToCIMode = opt.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;
        if ((lng == null ? void 0 : lng.toLowerCase()) === "cimode") {
          if (appendNamespaceToCIMode) {
            if (returnDetails) {
              return {
                res: `${namespace}${nsSeparator}${key}`,
                usedKey: key,
                exactUsedKey: key,
                usedLng: lng,
                usedNS: namespace,
                usedParams: this.getUsedParamsDetails(opt)
              };
            }
            return `${namespace}${nsSeparator}${key}`;
          }
          if (returnDetails) {
            return {
              res: key,
              usedKey: key,
              exactUsedKey: key,
              usedLng: lng,
              usedNS: namespace,
              usedParams: this.getUsedParamsDetails(opt)
            };
          }
          return key;
        }
        const resolved = this.resolve(keys, opt);
        let res = resolved == null ? void 0 : resolved.res;
        const resUsedKey = (resolved == null ? void 0 : resolved.usedKey) || key;
        const resExactUsedKey = (resolved == null ? void 0 : resolved.exactUsedKey) || key;
        const noObject = ["[object Number]", "[object Function]", "[object RegExp]"];
        const joinArrays = opt.joinArrays !== void 0 ? opt.joinArrays : this.options.joinArrays;
        const handleAsObjectInI18nFormat = !this.i18nFormat || this.i18nFormat.handleAsObject;
        const needsPluralHandling = opt.count !== void 0 && !isString(opt.count);
        const hasDefaultValue = _Translator.hasDefaultValue(opt);
        const defaultValueSuffix = needsPluralHandling ? this.pluralResolver.getSuffix(lng, opt.count, opt) : "";
        const defaultValueSuffixOrdinalFallback = opt.ordinal && needsPluralHandling ? this.pluralResolver.getSuffix(lng, opt.count, {
          ordinal: false
        }) : "";
        const needsZeroSuffixLookup = needsPluralHandling && !opt.ordinal && opt.count === 0;
        const defaultValue = needsZeroSuffixLookup && opt[`defaultValue${this.options.pluralSeparator}zero`] || opt[`defaultValue${defaultValueSuffix}`] || opt[`defaultValue${defaultValueSuffixOrdinalFallback}`] || opt.defaultValue;
        let resForObjHndl = res;
        if (handleAsObjectInI18nFormat && !res && hasDefaultValue) {
          resForObjHndl = defaultValue;
        }
        const handleAsObject = shouldHandleAsObject(resForObjHndl);
        const resType = Object.prototype.toString.apply(resForObjHndl);
        if (handleAsObjectInI18nFormat && resForObjHndl && handleAsObject && noObject.indexOf(resType) < 0 && !(isString(joinArrays) && Array.isArray(resForObjHndl))) {
          if (!opt.returnObjects && !this.options.returnObjects) {
            if (!this.options.returnedObjectHandler) {
              this.logger.warn("accessing an object - but returnObjects options is not enabled!");
            }
            const r = this.options.returnedObjectHandler ? this.options.returnedObjectHandler(resUsedKey, resForObjHndl, {
              ...opt,
              ns: namespaces
            }) : `key '${key} (${this.language})' returned an object instead of string.`;
            if (returnDetails) {
              resolved.res = r;
              resolved.usedParams = this.getUsedParamsDetails(opt);
              return resolved;
            }
            return r;
          }
          if (keySeparator) {
            const resTypeIsArray = Array.isArray(resForObjHndl);
            const copy2 = resTypeIsArray ? [] : {};
            const newKeyToUse = resTypeIsArray ? resExactUsedKey : resUsedKey;
            for (const m in resForObjHndl) {
              if (Object.prototype.hasOwnProperty.call(resForObjHndl, m)) {
                const deepKey = `${newKeyToUse}${keySeparator}${m}`;
                if (hasDefaultValue && !res) {
                  copy2[m] = this.translate(deepKey, {
                    ...opt,
                    defaultValue: shouldHandleAsObject(defaultValue) ? defaultValue[m] : void 0,
                    ...{
                      joinArrays: false,
                      ns: namespaces
                    }
                  });
                } else {
                  copy2[m] = this.translate(deepKey, {
                    ...opt,
                    ...{
                      joinArrays: false,
                      ns: namespaces
                    }
                  });
                }
                if (copy2[m] === deepKey)
                  copy2[m] = resForObjHndl[m];
              }
            }
            res = copy2;
          }
        } else if (handleAsObjectInI18nFormat && isString(joinArrays) && Array.isArray(res)) {
          res = res.join(joinArrays);
          if (res)
            res = this.extendTranslation(res, keys, opt, lastKey);
        } else {
          let usedDefault = false;
          let usedKey = false;
          if (!this.isValidLookup(res) && hasDefaultValue) {
            usedDefault = true;
            res = defaultValue;
          }
          if (!this.isValidLookup(res)) {
            usedKey = true;
            res = key;
          }
          const missingKeyNoValueFallbackToKey = opt.missingKeyNoValueFallbackToKey || this.options.missingKeyNoValueFallbackToKey;
          const resForMissing = missingKeyNoValueFallbackToKey && usedKey ? void 0 : res;
          const updateMissing = hasDefaultValue && defaultValue !== res && this.options.updateMissing;
          if (usedKey || usedDefault || updateMissing) {
            this.logger.log(updateMissing ? "updateKey" : "missingKey", lng, namespace, key, updateMissing ? defaultValue : res);
            if (keySeparator) {
              const fk = this.resolve(key, {
                ...opt,
                keySeparator: false
              });
              if (fk && fk.res)
                this.logger.warn("Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.");
            }
            let lngs = [];
            const fallbackLngs = this.languageUtils.getFallbackCodes(this.options.fallbackLng, opt.lng || this.language);
            if (this.options.saveMissingTo === "fallback" && fallbackLngs && fallbackLngs[0]) {
              for (let i = 0; i < fallbackLngs.length; i++) {
                lngs.push(fallbackLngs[i]);
              }
            } else if (this.options.saveMissingTo === "all") {
              lngs = this.languageUtils.toResolveHierarchy(opt.lng || this.language);
            } else {
              lngs.push(opt.lng || this.language);
            }
            const send = (l, k, specificDefaultValue) => {
              var _a;
              const defaultForMissing = hasDefaultValue && specificDefaultValue !== res ? specificDefaultValue : resForMissing;
              if (this.options.missingKeyHandler) {
                this.options.missingKeyHandler(l, namespace, k, defaultForMissing, updateMissing, opt);
              } else if ((_a = this.backendConnector) == null ? void 0 : _a.saveMissing) {
                this.backendConnector.saveMissing(l, namespace, k, defaultForMissing, updateMissing, opt);
              }
              this.emit("missingKey", l, namespace, k, res);
            };
            if (this.options.saveMissing) {
              if (this.options.saveMissingPlurals && needsPluralHandling) {
                lngs.forEach((language) => {
                  const suffixes = this.pluralResolver.getSuffixes(language, opt);
                  if (needsZeroSuffixLookup && opt[`defaultValue${this.options.pluralSeparator}zero`] && suffixes.indexOf(`${this.options.pluralSeparator}zero`) < 0) {
                    suffixes.push(`${this.options.pluralSeparator}zero`);
                  }
                  suffixes.forEach((suffix) => {
                    send([language], key + suffix, opt[`defaultValue${suffix}`] || defaultValue);
                  });
                });
              } else {
                send(lngs, key, defaultValue);
              }
            }
          }
          res = this.extendTranslation(res, keys, opt, resolved, lastKey);
          if (usedKey && res === key && this.options.appendNamespaceToMissingKey) {
            res = `${namespace}${nsSeparator}${key}`;
          }
          if ((usedKey || usedDefault) && this.options.parseMissingKeyHandler) {
            res = this.options.parseMissingKeyHandler(this.options.appendNamespaceToMissingKey ? `${namespace}${nsSeparator}${key}` : key, usedDefault ? res : void 0, opt);
          }
        }
        if (returnDetails) {
          resolved.res = res;
          resolved.usedParams = this.getUsedParamsDetails(opt);
          return resolved;
        }
        return res;
      }
      extendTranslation(res, key, opt, resolved, lastKey) {
        var _a, _b;
        if ((_a = this.i18nFormat) == null ? void 0 : _a.parse) {
          res = this.i18nFormat.parse(res, {
            ...this.options.interpolation.defaultVariables,
            ...opt
          }, opt.lng || this.language || resolved.usedLng, resolved.usedNS, resolved.usedKey, {
            resolved
          });
        } else if (!opt.skipInterpolation) {
          if (opt.interpolation)
            this.interpolator.init({
              ...opt,
              ...{
                interpolation: {
                  ...this.options.interpolation,
                  ...opt.interpolation
                }
              }
            });
          const skipOnVariables = isString(res) && (((_b = opt == null ? void 0 : opt.interpolation) == null ? void 0 : _b.skipOnVariables) !== void 0 ? opt.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables);
          let nestBef;
          if (skipOnVariables) {
            const nb = res.match(this.interpolator.nestingRegexp);
            nestBef = nb && nb.length;
          }
          let data = opt.replace && !isString(opt.replace) ? opt.replace : opt;
          if (this.options.interpolation.defaultVariables)
            data = {
              ...this.options.interpolation.defaultVariables,
              ...data
            };
          res = this.interpolator.interpolate(res, data, opt.lng || this.language || resolved.usedLng, opt);
          if (skipOnVariables) {
            const na = res.match(this.interpolator.nestingRegexp);
            const nestAft = na && na.length;
            if (nestBef < nestAft)
              opt.nest = false;
          }
          if (!opt.lng && resolved && resolved.res)
            opt.lng = this.language || resolved.usedLng;
          if (opt.nest !== false)
            res = this.interpolator.nest(res, (...args) => {
              if ((lastKey == null ? void 0 : lastKey[0]) === args[0] && !opt.context) {
                this.logger.warn(`It seems you are nesting recursively key: ${args[0]} in key: ${key[0]}`);
                return null;
              }
              return this.translate(...args, key);
            }, opt);
          if (opt.interpolation)
            this.interpolator.reset();
        }
        const postProcess = opt.postProcess || this.options.postProcess;
        const postProcessorNames = isString(postProcess) ? [postProcess] : postProcess;
        if (res != null && (postProcessorNames == null ? void 0 : postProcessorNames.length) && opt.applyPostProcessor !== false) {
          res = postProcessor.handle(postProcessorNames, res, key, this.options && this.options.postProcessPassResolved ? {
            i18nResolved: {
              ...resolved,
              usedParams: this.getUsedParamsDetails(opt)
            },
            ...opt
          } : opt, this);
        }
        return res;
      }
      resolve(keys, opt = {}) {
        let found;
        let usedKey;
        let exactUsedKey;
        let usedLng;
        let usedNS;
        if (isString(keys))
          keys = [keys];
        if (Array.isArray(keys))
          keys = keys.map((k) => typeof k === "function" ? keysFromSelector(k, {
            ...this.options,
            ...opt
          }) : k);
        keys.forEach((k) => {
          if (this.isValidLookup(found))
            return;
          const extracted = this.extractFromKey(k, opt);
          const key = extracted.key;
          usedKey = key;
          let namespaces = extracted.namespaces;
          if (this.options.fallbackNS)
            namespaces = namespaces.concat(this.options.fallbackNS);
          const needsPluralHandling = opt.count !== void 0 && !isString(opt.count);
          const needsZeroSuffixLookup = needsPluralHandling && !opt.ordinal && opt.count === 0;
          const needsContextHandling = opt.context !== void 0 && (isString(opt.context) || typeof opt.context === "number") && opt.context !== "";
          const codes = opt.lngs ? opt.lngs : this.languageUtils.toResolveHierarchy(opt.lng || this.language, opt.fallbackLng);
          namespaces.forEach((ns) => {
            var _a, _b;
            if (this.isValidLookup(found))
              return;
            usedNS = ns;
            if (!checkedLoadedFor[`${codes[0]}-${ns}`] && ((_a = this.utils) == null ? void 0 : _a.hasLoadedNamespace) && !((_b = this.utils) == null ? void 0 : _b.hasLoadedNamespace(usedNS))) {
              checkedLoadedFor[`${codes[0]}-${ns}`] = true;
              this.logger.warn(`key "${usedKey}" for languages "${codes.join(", ")}" won't get resolved as namespace "${usedNS}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
            }
            codes.forEach((code) => {
              var _a2;
              if (this.isValidLookup(found))
                return;
              usedLng = code;
              const finalKeys = [key];
              if ((_a2 = this.i18nFormat) == null ? void 0 : _a2.addLookupKeys) {
                this.i18nFormat.addLookupKeys(finalKeys, key, code, ns, opt);
              } else {
                let pluralSuffix;
                if (needsPluralHandling)
                  pluralSuffix = this.pluralResolver.getSuffix(code, opt.count, opt);
                const zeroSuffix = `${this.options.pluralSeparator}zero`;
                const ordinalPrefix = `${this.options.pluralSeparator}ordinal${this.options.pluralSeparator}`;
                if (needsPluralHandling) {
                  if (opt.ordinal && pluralSuffix.indexOf(ordinalPrefix) === 0) {
                    finalKeys.push(key + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator));
                  }
                  finalKeys.push(key + pluralSuffix);
                  if (needsZeroSuffixLookup) {
                    finalKeys.push(key + zeroSuffix);
                  }
                }
                if (needsContextHandling) {
                  const contextKey = `${key}${this.options.contextSeparator || "_"}${opt.context}`;
                  finalKeys.push(contextKey);
                  if (needsPluralHandling) {
                    if (opt.ordinal && pluralSuffix.indexOf(ordinalPrefix) === 0) {
                      finalKeys.push(contextKey + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator));
                    }
                    finalKeys.push(contextKey + pluralSuffix);
                    if (needsZeroSuffixLookup) {
                      finalKeys.push(contextKey + zeroSuffix);
                    }
                  }
                }
              }
              let possibleKey;
              while (possibleKey = finalKeys.pop()) {
                if (!this.isValidLookup(found)) {
                  exactUsedKey = possibleKey;
                  found = this.getResource(code, ns, possibleKey, opt);
                }
              }
            });
          });
        });
        return {
          res: found,
          usedKey,
          exactUsedKey,
          usedLng,
          usedNS
        };
      }
      isValidLookup(res) {
        return res !== void 0 && !(!this.options.returnNull && res === null) && !(!this.options.returnEmptyString && res === "");
      }
      getResource(code, ns, key, options = {}) {
        var _a;
        if ((_a = this.i18nFormat) == null ? void 0 : _a.getResource)
          return this.i18nFormat.getResource(code, ns, key, options);
        return this.resourceStore.getResource(code, ns, key, options);
      }
      getUsedParamsDetails(options = {}) {
        const optionsKeys = ["defaultValue", "ordinal", "context", "replace", "lng", "lngs", "fallbackLng", "ns", "keySeparator", "nsSeparator", "returnObjects", "returnDetails", "joinArrays", "postProcess", "interpolation"];
        const useOptionsReplaceForData = options.replace && !isString(options.replace);
        let data = useOptionsReplaceForData ? options.replace : options;
        if (useOptionsReplaceForData && typeof options.count !== "undefined") {
          data.count = options.count;
        }
        if (this.options.interpolation.defaultVariables) {
          data = {
            ...this.options.interpolation.defaultVariables,
            ...data
          };
        }
        if (!useOptionsReplaceForData) {
          data = {
            ...data
          };
          for (const key of optionsKeys) {
            delete data[key];
          }
        }
        return data;
      }
      static hasDefaultValue(options) {
        const prefix = "defaultValue";
        for (const option in options) {
          if (Object.prototype.hasOwnProperty.call(options, option) && prefix === option.substring(0, prefix.length) && void 0 !== options[option]) {
            return true;
          }
        }
        return false;
      }
    };
    var LanguageUtil = class {
      constructor(options) {
        this.options = options;
        this.supportedLngs = this.options.supportedLngs || false;
        this.logger = baseLogger.create("languageUtils");
      }
      getScriptPartFromCode(code) {
        code = getCleanedCode(code);
        if (!code || code.indexOf("-") < 0)
          return null;
        const p = code.split("-");
        if (p.length === 2)
          return null;
        p.pop();
        if (p[p.length - 1].toLowerCase() === "x")
          return null;
        return this.formatLanguageCode(p.join("-"));
      }
      getLanguagePartFromCode(code) {
        code = getCleanedCode(code);
        if (!code || code.indexOf("-") < 0)
          return code;
        const p = code.split("-");
        return this.formatLanguageCode(p[0]);
      }
      formatLanguageCode(code) {
        if (isString(code) && code.indexOf("-") > -1) {
          let formattedCode;
          try {
            formattedCode = Intl.getCanonicalLocales(code)[0];
          } catch (e) {
          }
          if (formattedCode && this.options.lowerCaseLng) {
            formattedCode = formattedCode.toLowerCase();
          }
          if (formattedCode)
            return formattedCode;
          if (this.options.lowerCaseLng) {
            return code.toLowerCase();
          }
          return code;
        }
        return this.options.cleanCode || this.options.lowerCaseLng ? code.toLowerCase() : code;
      }
      isSupportedCode(code) {
        if (this.options.load === "languageOnly" || this.options.nonExplicitSupportedLngs) {
          code = this.getLanguagePartFromCode(code);
        }
        return !this.supportedLngs || !this.supportedLngs.length || this.supportedLngs.indexOf(code) > -1;
      }
      getBestMatchFromCodes(codes) {
        if (!codes)
          return null;
        let found;
        codes.forEach((code) => {
          if (found)
            return;
          const cleanedLng = this.formatLanguageCode(code);
          if (!this.options.supportedLngs || this.isSupportedCode(cleanedLng))
            found = cleanedLng;
        });
        if (!found && this.options.supportedLngs) {
          codes.forEach((code) => {
            if (found)
              return;
            const lngScOnly = this.getScriptPartFromCode(code);
            if (this.isSupportedCode(lngScOnly))
              return found = lngScOnly;
            const lngOnly = this.getLanguagePartFromCode(code);
            if (this.isSupportedCode(lngOnly))
              return found = lngOnly;
            found = this.options.supportedLngs.find((supportedLng) => {
              if (supportedLng === lngOnly)
                return supportedLng;
              if (supportedLng.indexOf("-") < 0 && lngOnly.indexOf("-") < 0)
                return;
              if (supportedLng.indexOf("-") > 0 && lngOnly.indexOf("-") < 0 && supportedLng.substring(0, supportedLng.indexOf("-")) === lngOnly)
                return supportedLng;
              if (supportedLng.indexOf(lngOnly) === 0 && lngOnly.length > 1)
                return supportedLng;
            });
          });
        }
        if (!found)
          found = this.getFallbackCodes(this.options.fallbackLng)[0];
        return found;
      }
      getFallbackCodes(fallbacks, code) {
        if (!fallbacks)
          return [];
        if (typeof fallbacks === "function")
          fallbacks = fallbacks(code);
        if (isString(fallbacks))
          fallbacks = [fallbacks];
        if (Array.isArray(fallbacks))
          return fallbacks;
        if (!code)
          return fallbacks.default || [];
        let found = fallbacks[code];
        if (!found)
          found = fallbacks[this.getScriptPartFromCode(code)];
        if (!found)
          found = fallbacks[this.formatLanguageCode(code)];
        if (!found)
          found = fallbacks[this.getLanguagePartFromCode(code)];
        if (!found)
          found = fallbacks.default;
        return found || [];
      }
      toResolveHierarchy(code, fallbackCode) {
        const fallbackCodes = this.getFallbackCodes((fallbackCode === false ? [] : fallbackCode) || this.options.fallbackLng || [], code);
        const codes = [];
        const addCode = (c) => {
          if (!c)
            return;
          if (this.isSupportedCode(c)) {
            codes.push(c);
          } else {
            this.logger.warn(`rejecting language code not found in supportedLngs: ${c}`);
          }
        };
        if (isString(code) && (code.indexOf("-") > -1 || code.indexOf("_") > -1)) {
          if (this.options.load !== "languageOnly")
            addCode(this.formatLanguageCode(code));
          if (this.options.load !== "languageOnly" && this.options.load !== "currentOnly")
            addCode(this.getScriptPartFromCode(code));
          if (this.options.load !== "currentOnly")
            addCode(this.getLanguagePartFromCode(code));
        } else if (isString(code)) {
          addCode(this.formatLanguageCode(code));
        }
        fallbackCodes.forEach((fc) => {
          if (codes.indexOf(fc) < 0)
            addCode(this.formatLanguageCode(fc));
        });
        return codes;
      }
    };
    var suffixesOrder = {
      zero: 0,
      one: 1,
      two: 2,
      few: 3,
      many: 4,
      other: 5
    };
    var dummyRule = {
      select: (count) => count === 1 ? "one" : "other",
      resolvedOptions: () => ({
        pluralCategories: ["one", "other"]
      })
    };
    var PluralResolver = class {
      constructor(languageUtils, options = {}) {
        this.languageUtils = languageUtils;
        this.options = options;
        this.logger = baseLogger.create("pluralResolver");
        this.pluralRulesCache = {};
      }
      clearCache() {
        this.pluralRulesCache = {};
      }
      getRule(code, options = {}) {
        const cleanedCode = getCleanedCode(code === "dev" ? "en" : code);
        const type = options.ordinal ? "ordinal" : "cardinal";
        const cacheKey = JSON.stringify({
          cleanedCode,
          type
        });
        if (cacheKey in this.pluralRulesCache) {
          return this.pluralRulesCache[cacheKey];
        }
        let rule;
        try {
          rule = new Intl.PluralRules(cleanedCode, {
            type
          });
        } catch (err) {
          if (typeof Intl === "undefined") {
            this.logger.error("No Intl support, please use an Intl polyfill!");
            return dummyRule;
          }
          if (!code.match(/-|_/))
            return dummyRule;
          const lngPart = this.languageUtils.getLanguagePartFromCode(code);
          rule = this.getRule(lngPart, options);
        }
        this.pluralRulesCache[cacheKey] = rule;
        return rule;
      }
      needsPlural(code, options = {}) {
        let rule = this.getRule(code, options);
        if (!rule)
          rule = this.getRule("dev", options);
        return (rule == null ? void 0 : rule.resolvedOptions().pluralCategories.length) > 1;
      }
      getPluralFormsOfKey(code, key, options = {}) {
        return this.getSuffixes(code, options).map((suffix) => `${key}${suffix}`);
      }
      getSuffixes(code, options = {}) {
        let rule = this.getRule(code, options);
        if (!rule)
          rule = this.getRule("dev", options);
        if (!rule)
          return [];
        return rule.resolvedOptions().pluralCategories.sort((pluralCategory1, pluralCategory2) => suffixesOrder[pluralCategory1] - suffixesOrder[pluralCategory2]).map((pluralCategory) => `${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ""}${pluralCategory}`);
      }
      getSuffix(code, count, options = {}) {
        const rule = this.getRule(code, options);
        if (rule) {
          return `${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ""}${rule.select(count)}`;
        }
        this.logger.warn(`no plural rule found for: ${code}`);
        return this.getSuffix("dev", count, options);
      }
    };
    var deepFindWithDefaults = (data, defaultData, key, keySeparator = ".", ignoreJSONStructure = true) => {
      let path = getPathWithDefaults(data, defaultData, key);
      if (!path && ignoreJSONStructure && isString(key)) {
        path = deepFind(data, key, keySeparator);
        if (path === void 0)
          path = deepFind(defaultData, key, keySeparator);
      }
      return path;
    };
    var regexSafe = (val) => val.replace(/\$/g, "$$$$");
    var Interpolator = class {
      constructor(options = {}) {
        var _a;
        this.logger = baseLogger.create("interpolator");
        this.options = options;
        this.format = ((_a = options == null ? void 0 : options.interpolation) == null ? void 0 : _a.format) || ((value) => value);
        this.init(options);
      }
      init(options = {}) {
        if (!options.interpolation)
          options.interpolation = {
            escapeValue: true
          };
        const {
          escape: escape$1,
          escapeValue,
          useRawValueToEscape,
          prefix,
          prefixEscaped,
          suffix,
          suffixEscaped,
          formatSeparator,
          unescapeSuffix,
          unescapePrefix,
          nestingPrefix,
          nestingPrefixEscaped,
          nestingSuffix,
          nestingSuffixEscaped,
          nestingOptionsSeparator,
          maxReplaces,
          alwaysFormat
        } = options.interpolation;
        this.escape = escape$1 !== void 0 ? escape$1 : escape;
        this.escapeValue = escapeValue !== void 0 ? escapeValue : true;
        this.useRawValueToEscape = useRawValueToEscape !== void 0 ? useRawValueToEscape : false;
        this.prefix = prefix ? regexEscape(prefix) : prefixEscaped || "{{";
        this.suffix = suffix ? regexEscape(suffix) : suffixEscaped || "}}";
        this.formatSeparator = formatSeparator || ",";
        this.unescapePrefix = unescapeSuffix ? "" : unescapePrefix || "-";
        this.unescapeSuffix = this.unescapePrefix ? "" : unescapeSuffix || "";
        this.nestingPrefix = nestingPrefix ? regexEscape(nestingPrefix) : nestingPrefixEscaped || regexEscape("$t(");
        this.nestingSuffix = nestingSuffix ? regexEscape(nestingSuffix) : nestingSuffixEscaped || regexEscape(")");
        this.nestingOptionsSeparator = nestingOptionsSeparator || ",";
        this.maxReplaces = maxReplaces || 1e3;
        this.alwaysFormat = alwaysFormat !== void 0 ? alwaysFormat : false;
        this.resetRegExp();
      }
      reset() {
        if (this.options)
          this.init(this.options);
      }
      resetRegExp() {
        const getOrResetRegExp = (existingRegExp, pattern) => {
          if ((existingRegExp == null ? void 0 : existingRegExp.source) === pattern) {
            existingRegExp.lastIndex = 0;
            return existingRegExp;
          }
          return new RegExp(pattern, "g");
        };
        this.regexp = getOrResetRegExp(this.regexp, `${this.prefix}(.+?)${this.suffix}`);
        this.regexpUnescape = getOrResetRegExp(this.regexpUnescape, `${this.prefix}${this.unescapePrefix}(.+?)${this.unescapeSuffix}${this.suffix}`);
        this.nestingRegexp = getOrResetRegExp(this.nestingRegexp, `${this.nestingPrefix}((?:[^()"']+|"[^"]*"|'[^']*'|\\((?:[^()]|"[^"]*"|'[^']*')*\\))*?)${this.nestingSuffix}`);
      }
      interpolate(str, data, lng, options) {
        var _a;
        let match;
        let value;
        let replaces;
        const defaultData = this.options && this.options.interpolation && this.options.interpolation.defaultVariables || {};
        const handleFormat = (key) => {
          if (key.indexOf(this.formatSeparator) < 0) {
            const path = deepFindWithDefaults(data, defaultData, key, this.options.keySeparator, this.options.ignoreJSONStructure);
            return this.alwaysFormat ? this.format(path, void 0, lng, {
              ...options,
              ...data,
              interpolationkey: key
            }) : path;
          }
          const p = key.split(this.formatSeparator);
          const k = p.shift().trim();
          const f = p.join(this.formatSeparator).trim();
          return this.format(deepFindWithDefaults(data, defaultData, k, this.options.keySeparator, this.options.ignoreJSONStructure), f, lng, {
            ...options,
            ...data,
            interpolationkey: k
          });
        };
        this.resetRegExp();
        const missingInterpolationHandler = (options == null ? void 0 : options.missingInterpolationHandler) || this.options.missingInterpolationHandler;
        const skipOnVariables = ((_a = options == null ? void 0 : options.interpolation) == null ? void 0 : _a.skipOnVariables) !== void 0 ? options.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables;
        const todos = [{
          regex: this.regexpUnescape,
          safeValue: (val) => regexSafe(val)
        }, {
          regex: this.regexp,
          safeValue: (val) => this.escapeValue ? regexSafe(this.escape(val)) : regexSafe(val)
        }];
        todos.forEach((todo) => {
          replaces = 0;
          while (match = todo.regex.exec(str)) {
            const matchedVar = match[1].trim();
            value = handleFormat(matchedVar);
            if (value === void 0) {
              if (typeof missingInterpolationHandler === "function") {
                const temp = missingInterpolationHandler(str, match, options);
                value = isString(temp) ? temp : "";
              } else if (options && Object.prototype.hasOwnProperty.call(options, matchedVar)) {
                value = "";
              } else if (skipOnVariables) {
                value = match[0];
                continue;
              } else {
                this.logger.warn(`missed to pass in variable ${matchedVar} for interpolating ${str}`);
                value = "";
              }
            } else if (!isString(value) && !this.useRawValueToEscape) {
              value = makeString(value);
            }
            const safeValue = todo.safeValue(value);
            str = str.replace(match[0], safeValue);
            if (skipOnVariables) {
              todo.regex.lastIndex += value.length;
              todo.regex.lastIndex -= match[0].length;
            } else {
              todo.regex.lastIndex = 0;
            }
            replaces++;
            if (replaces >= this.maxReplaces) {
              break;
            }
          }
        });
        return str;
      }
      nest(str, fc, options = {}) {
        let match;
        let value;
        let clonedOptions;
        const handleHasOptions = (key, inheritedOptions) => {
          const sep = this.nestingOptionsSeparator;
          if (key.indexOf(sep) < 0)
            return key;
          const c = key.split(new RegExp(`${regexEscape(sep)}[ ]*{`));
          let optionsString = `{${c[1]}`;
          key = c[0];
          optionsString = this.interpolate(optionsString, clonedOptions);
          const matchedSingleQuotes = optionsString.match(/'/g);
          const matchedDoubleQuotes = optionsString.match(/"/g);
          if (((matchedSingleQuotes == null ? void 0 : matchedSingleQuotes.length) ?? 0) % 2 === 0 && !matchedDoubleQuotes || ((matchedDoubleQuotes == null ? void 0 : matchedDoubleQuotes.length) ?? 0) % 2 !== 0) {
            optionsString = optionsString.replace(/'/g, '"');
          }
          try {
            clonedOptions = JSON.parse(optionsString);
            if (inheritedOptions)
              clonedOptions = {
                ...inheritedOptions,
                ...clonedOptions
              };
          } catch (e) {
            this.logger.warn(`failed parsing options string in nesting for key ${key}`, e);
            return `${key}${sep}${optionsString}`;
          }
          if (clonedOptions.defaultValue && clonedOptions.defaultValue.indexOf(this.prefix) > -1)
            delete clonedOptions.defaultValue;
          return key;
        };
        while (match = this.nestingRegexp.exec(str)) {
          let formatters = [];
          clonedOptions = {
            ...options
          };
          clonedOptions = clonedOptions.replace && !isString(clonedOptions.replace) ? clonedOptions.replace : clonedOptions;
          clonedOptions.applyPostProcessor = false;
          delete clonedOptions.defaultValue;
          const keyEndIndex = /{.*}/.test(match[1]) ? match[1].lastIndexOf("}") + 1 : match[1].indexOf(this.formatSeparator);
          if (keyEndIndex !== -1) {
            formatters = match[1].slice(keyEndIndex).split(this.formatSeparator).map((elem) => elem.trim()).filter(Boolean);
            match[1] = match[1].slice(0, keyEndIndex);
          }
          value = fc(handleHasOptions.call(this, match[1].trim(), clonedOptions), clonedOptions);
          if (value && match[0] === str && !isString(value))
            return value;
          if (!isString(value))
            value = makeString(value);
          if (!value) {
            this.logger.warn(`missed to resolve ${match[1]} for nesting ${str}`);
            value = "";
          }
          if (formatters.length) {
            value = formatters.reduce((v, f) => this.format(v, f, options.lng, {
              ...options,
              interpolationkey: match[1].trim()
            }), value.trim());
          }
          str = str.replace(match[0], value);
          this.regexp.lastIndex = 0;
        }
        return str;
      }
    };
    var parseFormatStr = (formatStr) => {
      let formatName = formatStr.toLowerCase().trim();
      const formatOptions = {};
      if (formatStr.indexOf("(") > -1) {
        const p = formatStr.split("(");
        formatName = p[0].toLowerCase().trim();
        const optStr = p[1].substring(0, p[1].length - 1);
        if (formatName === "currency" && optStr.indexOf(":") < 0) {
          if (!formatOptions.currency)
            formatOptions.currency = optStr.trim();
        } else if (formatName === "relativetime" && optStr.indexOf(":") < 0) {
          if (!formatOptions.range)
            formatOptions.range = optStr.trim();
        } else {
          const opts = optStr.split(";");
          opts.forEach((opt) => {
            if (opt) {
              const [key, ...rest] = opt.split(":");
              const val = rest.join(":").trim().replace(/^'+|'+$/g, "");
              const trimmedKey = key.trim();
              if (!formatOptions[trimmedKey])
                formatOptions[trimmedKey] = val;
              if (val === "false")
                formatOptions[trimmedKey] = false;
              if (val === "true")
                formatOptions[trimmedKey] = true;
              if (!isNaN(val))
                formatOptions[trimmedKey] = parseInt(val, 10);
            }
          });
        }
      }
      return {
        formatName,
        formatOptions
      };
    };
    var createCachedFormatter = (fn) => {
      const cache = {};
      return (v, l, o) => {
        let optForCache = o;
        if (o && o.interpolationkey && o.formatParams && o.formatParams[o.interpolationkey] && o[o.interpolationkey]) {
          optForCache = {
            ...optForCache,
            [o.interpolationkey]: void 0
          };
        }
        const key = l + JSON.stringify(optForCache);
        let frm = cache[key];
        if (!frm) {
          frm = fn(getCleanedCode(l), o);
          cache[key] = frm;
        }
        return frm(v);
      };
    };
    var createNonCachedFormatter = (fn) => (v, l, o) => fn(getCleanedCode(l), o)(v);
    var Formatter = class {
      constructor(options = {}) {
        this.logger = baseLogger.create("formatter");
        this.options = options;
        this.init(options);
      }
      init(services, options = {
        interpolation: {}
      }) {
        this.formatSeparator = options.interpolation.formatSeparator || ",";
        const cf = options.cacheInBuiltFormats ? createCachedFormatter : createNonCachedFormatter;
        this.formats = {
          number: cf((lng, opt) => {
            const formatter = new Intl.NumberFormat(lng, {
              ...opt
            });
            return (val) => formatter.format(val);
          }),
          currency: cf((lng, opt) => {
            const formatter = new Intl.NumberFormat(lng, {
              ...opt,
              style: "currency"
            });
            return (val) => formatter.format(val);
          }),
          datetime: cf((lng, opt) => {
            const formatter = new Intl.DateTimeFormat(lng, {
              ...opt
            });
            return (val) => formatter.format(val);
          }),
          relativetime: cf((lng, opt) => {
            const formatter = new Intl.RelativeTimeFormat(lng, {
              ...opt
            });
            return (val) => formatter.format(val, opt.range || "day");
          }),
          list: cf((lng, opt) => {
            const formatter = new Intl.ListFormat(lng, {
              ...opt
            });
            return (val) => formatter.format(val);
          })
        };
      }
      add(name, fc) {
        this.formats[name.toLowerCase().trim()] = fc;
      }
      addCached(name, fc) {
        this.formats[name.toLowerCase().trim()] = createCachedFormatter(fc);
      }
      format(value, format, lng, options = {}) {
        const formats = format.split(this.formatSeparator);
        if (formats.length > 1 && formats[0].indexOf("(") > 1 && formats[0].indexOf(")") < 0 && formats.find((f) => f.indexOf(")") > -1)) {
          const lastIndex = formats.findIndex((f) => f.indexOf(")") > -1);
          formats[0] = [formats[0], ...formats.splice(1, lastIndex)].join(this.formatSeparator);
        }
        const result = formats.reduce((mem, f) => {
          var _a;
          const {
            formatName,
            formatOptions
          } = parseFormatStr(f);
          if (this.formats[formatName]) {
            let formatted = mem;
            try {
              const valOptions = ((_a = options == null ? void 0 : options.formatParams) == null ? void 0 : _a[options.interpolationkey]) || {};
              const l = valOptions.locale || valOptions.lng || options.locale || options.lng || lng;
              formatted = this.formats[formatName](mem, l, {
                ...formatOptions,
                ...options,
                ...valOptions
              });
            } catch (error) {
              this.logger.warn(error);
            }
            return formatted;
          } else {
            this.logger.warn(`there was no format function for ${formatName}`);
          }
          return mem;
        }, value);
        return result;
      }
    };
    var removePending = (q, name) => {
      if (q.pending[name] !== void 0) {
        delete q.pending[name];
        q.pendingCount--;
      }
    };
    var Connector = class extends EventEmitter {
      constructor(backend, store, services, options = {}) {
        var _a, _b;
        super();
        this.backend = backend;
        this.store = store;
        this.services = services;
        this.languageUtils = services.languageUtils;
        this.options = options;
        this.logger = baseLogger.create("backendConnector");
        this.waitingReads = [];
        this.maxParallelReads = options.maxParallelReads || 10;
        this.readingCalls = 0;
        this.maxRetries = options.maxRetries >= 0 ? options.maxRetries : 5;
        this.retryTimeout = options.retryTimeout >= 1 ? options.retryTimeout : 350;
        this.state = {};
        this.queue = [];
        (_b = (_a = this.backend) == null ? void 0 : _a.init) == null ? void 0 : _b.call(_a, services, options.backend, options);
      }
      queueLoad(languages, namespaces, options, callback) {
        const toLoad = {};
        const pending = {};
        const toLoadLanguages = {};
        const toLoadNamespaces = {};
        languages.forEach((lng) => {
          let hasAllNamespaces = true;
          namespaces.forEach((ns) => {
            const name = `${lng}|${ns}`;
            if (!options.reload && this.store.hasResourceBundle(lng, ns)) {
              this.state[name] = 2;
            } else if (this.state[name] < 0)
              ;
            else if (this.state[name] === 1) {
              if (pending[name] === void 0)
                pending[name] = true;
            } else {
              this.state[name] = 1;
              hasAllNamespaces = false;
              if (pending[name] === void 0)
                pending[name] = true;
              if (toLoad[name] === void 0)
                toLoad[name] = true;
              if (toLoadNamespaces[ns] === void 0)
                toLoadNamespaces[ns] = true;
            }
          });
          if (!hasAllNamespaces)
            toLoadLanguages[lng] = true;
        });
        if (Object.keys(toLoad).length || Object.keys(pending).length) {
          this.queue.push({
            pending,
            pendingCount: Object.keys(pending).length,
            loaded: {},
            errors: [],
            callback
          });
        }
        return {
          toLoad: Object.keys(toLoad),
          pending: Object.keys(pending),
          toLoadLanguages: Object.keys(toLoadLanguages),
          toLoadNamespaces: Object.keys(toLoadNamespaces)
        };
      }
      loaded(name, err, data) {
        const s = name.split("|");
        const lng = s[0];
        const ns = s[1];
        if (err)
          this.emit("failedLoading", lng, ns, err);
        if (!err && data) {
          this.store.addResourceBundle(lng, ns, data, void 0, void 0, {
            skipCopy: true
          });
        }
        this.state[name] = err ? -1 : 2;
        if (err && data)
          this.state[name] = 0;
        const loaded = {};
        this.queue.forEach((q) => {
          pushPath(q.loaded, [lng], ns);
          removePending(q, name);
          if (err)
            q.errors.push(err);
          if (q.pendingCount === 0 && !q.done) {
            Object.keys(q.loaded).forEach((l) => {
              if (!loaded[l])
                loaded[l] = {};
              const loadedKeys = q.loaded[l];
              if (loadedKeys.length) {
                loadedKeys.forEach((n) => {
                  if (loaded[l][n] === void 0)
                    loaded[l][n] = true;
                });
              }
            });
            q.done = true;
            if (q.errors.length) {
              q.callback(q.errors);
            } else {
              q.callback();
            }
          }
        });
        this.emit("loaded", loaded);
        this.queue = this.queue.filter((q) => !q.done);
      }
      read(lng, ns, fcName, tried = 0, wait = this.retryTimeout, callback) {
        if (!lng.length)
          return callback(null, {});
        if (this.readingCalls >= this.maxParallelReads) {
          this.waitingReads.push({
            lng,
            ns,
            fcName,
            tried,
            wait,
            callback
          });
          return;
        }
        this.readingCalls++;
        const resolver = (err, data) => {
          this.readingCalls--;
          if (this.waitingReads.length > 0) {
            const next = this.waitingReads.shift();
            this.read(next.lng, next.ns, next.fcName, next.tried, next.wait, next.callback);
          }
          if (err && data && tried < this.maxRetries) {
            setTimeout(() => {
              this.read.call(this, lng, ns, fcName, tried + 1, wait * 2, callback);
            }, wait);
            return;
          }
          callback(err, data);
        };
        const fc = this.backend[fcName].bind(this.backend);
        if (fc.length === 2) {
          try {
            const r = fc(lng, ns);
            if (r && typeof r.then === "function") {
              r.then((data) => resolver(null, data)).catch(resolver);
            } else {
              resolver(null, r);
            }
          } catch (err) {
            resolver(err);
          }
          return;
        }
        return fc(lng, ns, resolver);
      }
      prepareLoading(languages, namespaces, options = {}, callback) {
        if (!this.backend) {
          this.logger.warn("No backend was added via i18next.use. Will not load resources.");
          return callback && callback();
        }
        if (isString(languages))
          languages = this.languageUtils.toResolveHierarchy(languages);
        if (isString(namespaces))
          namespaces = [namespaces];
        const toLoad = this.queueLoad(languages, namespaces, options, callback);
        if (!toLoad.toLoad.length) {
          if (!toLoad.pending.length)
            callback();
          return null;
        }
        toLoad.toLoad.forEach((name) => {
          this.loadOne(name);
        });
      }
      load(languages, namespaces, callback) {
        this.prepareLoading(languages, namespaces, {}, callback);
      }
      reload(languages, namespaces, callback) {
        this.prepareLoading(languages, namespaces, {
          reload: true
        }, callback);
      }
      loadOne(name, prefix = "") {
        const s = name.split("|");
        const lng = s[0];
        const ns = s[1];
        this.read(lng, ns, "read", void 0, void 0, (err, data) => {
          if (err)
            this.logger.warn(`${prefix}loading namespace ${ns} for language ${lng} failed`, err);
          if (!err && data)
            this.logger.log(`${prefix}loaded namespace ${ns} for language ${lng}`, data);
          this.loaded(name, err, data);
        });
      }
      saveMissing(languages, namespace, key, fallbackValue, isUpdate, options = {}, clb = () => {
      }) {
        var _a, _b, _c, _d, _e;
        if (((_b = (_a = this.services) == null ? void 0 : _a.utils) == null ? void 0 : _b.hasLoadedNamespace) && !((_d = (_c = this.services) == null ? void 0 : _c.utils) == null ? void 0 : _d.hasLoadedNamespace(namespace))) {
          this.logger.warn(`did not save key "${key}" as the namespace "${namespace}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
          return;
        }
        if (key === void 0 || key === null || key === "")
          return;
        if ((_e = this.backend) == null ? void 0 : _e.create) {
          const opts = {
            ...options,
            isUpdate
          };
          const fc = this.backend.create.bind(this.backend);
          if (fc.length < 6) {
            try {
              let r;
              if (fc.length === 5) {
                r = fc(languages, namespace, key, fallbackValue, opts);
              } else {
                r = fc(languages, namespace, key, fallbackValue);
              }
              if (r && typeof r.then === "function") {
                r.then((data) => clb(null, data)).catch(clb);
              } else {
                clb(null, r);
              }
            } catch (err) {
              clb(err);
            }
          } else {
            fc(languages, namespace, key, fallbackValue, clb, opts);
          }
        }
        if (!languages || !languages[0])
          return;
        this.store.addResource(languages[0], namespace, key, fallbackValue);
      }
    };
    var get = () => ({
      debug: false,
      initAsync: true,
      ns: ["translation"],
      defaultNS: ["translation"],
      fallbackLng: ["dev"],
      fallbackNS: false,
      supportedLngs: false,
      nonExplicitSupportedLngs: false,
      load: "all",
      preload: false,
      simplifyPluralSuffix: true,
      keySeparator: ".",
      nsSeparator: ":",
      pluralSeparator: "_",
      contextSeparator: "_",
      partialBundledLanguages: false,
      saveMissing: false,
      updateMissing: false,
      saveMissingTo: "fallback",
      saveMissingPlurals: true,
      missingKeyHandler: false,
      missingInterpolationHandler: false,
      postProcess: false,
      postProcessPassResolved: false,
      returnNull: false,
      returnEmptyString: true,
      returnObjects: false,
      joinArrays: false,
      returnedObjectHandler: false,
      parseMissingKeyHandler: false,
      appendNamespaceToMissingKey: false,
      appendNamespaceToCIMode: false,
      overloadTranslationOptionHandler: (args) => {
        let ret = {};
        if (typeof args[1] === "object")
          ret = args[1];
        if (isString(args[1]))
          ret.defaultValue = args[1];
        if (isString(args[2]))
          ret.tDescription = args[2];
        if (typeof args[2] === "object" || typeof args[3] === "object") {
          const options = args[3] || args[2];
          Object.keys(options).forEach((key) => {
            ret[key] = options[key];
          });
        }
        return ret;
      },
      interpolation: {
        escapeValue: true,
        format: (value) => value,
        prefix: "{{",
        suffix: "}}",
        formatSeparator: ",",
        unescapePrefix: "-",
        nestingPrefix: "$t(",
        nestingSuffix: ")",
        nestingOptionsSeparator: ",",
        maxReplaces: 1e3,
        skipOnVariables: true
      },
      cacheInBuiltFormats: true
    });
    var transformOptions = (options) => {
      var _a, _b;
      if (isString(options.ns))
        options.ns = [options.ns];
      if (isString(options.fallbackLng))
        options.fallbackLng = [options.fallbackLng];
      if (isString(options.fallbackNS))
        options.fallbackNS = [options.fallbackNS];
      if (((_b = (_a = options.supportedLngs) == null ? void 0 : _a.indexOf) == null ? void 0 : _b.call(_a, "cimode")) < 0) {
        options.supportedLngs = options.supportedLngs.concat(["cimode"]);
      }
      if (typeof options.initImmediate === "boolean")
        options.initAsync = options.initImmediate;
      return options;
    };
    var noop = () => {
    };
    var bindMemberFunctions = (inst) => {
      const mems = Object.getOwnPropertyNames(Object.getPrototypeOf(inst));
      mems.forEach((mem) => {
        if (typeof inst[mem] === "function") {
          inst[mem] = inst[mem].bind(inst);
        }
      });
    };
    var SUPPORT_NOTICE_KEY = "__i18next_supportNoticeShown";
    var getSupportNoticeShown = () => typeof globalThis !== "undefined" && !!globalThis[SUPPORT_NOTICE_KEY];
    var setSupportNoticeShown = () => {
      if (typeof globalThis !== "undefined")
        globalThis[SUPPORT_NOTICE_KEY] = true;
    };
    var usesLocize = (inst) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
      if (((_c = (_b = (_a = inst == null ? void 0 : inst.modules) == null ? void 0 : _a.backend) == null ? void 0 : _b.name) == null ? void 0 : _c.indexOf("Locize")) > 0)
        return true;
      if (((_g = (_f = (_e = (_d = inst == null ? void 0 : inst.modules) == null ? void 0 : _d.backend) == null ? void 0 : _e.constructor) == null ? void 0 : _f.name) == null ? void 0 : _g.indexOf("Locize")) > 0)
        return true;
      if ((_i = (_h = inst == null ? void 0 : inst.options) == null ? void 0 : _h.backend) == null ? void 0 : _i.backends) {
        if (inst.options.backend.backends.some((b) => {
          var _a2, _b2, _c2;
          return ((_a2 = b == null ? void 0 : b.name) == null ? void 0 : _a2.indexOf("Locize")) > 0 || ((_c2 = (_b2 = b == null ? void 0 : b.constructor) == null ? void 0 : _b2.name) == null ? void 0 : _c2.indexOf("Locize")) > 0;
        }))
          return true;
      }
      if ((_k = (_j = inst == null ? void 0 : inst.options) == null ? void 0 : _j.backend) == null ? void 0 : _k.projectId)
        return true;
      if ((_m = (_l = inst == null ? void 0 : inst.options) == null ? void 0 : _l.backend) == null ? void 0 : _m.backendOptions) {
        if (inst.options.backend.backendOptions.some((b) => b == null ? void 0 : b.projectId))
          return true;
      }
      return false;
    };
    var I18n = class _I18n extends EventEmitter {
      constructor(options = {}, callback) {
        super();
        this.options = transformOptions(options);
        this.services = {};
        this.logger = baseLogger;
        this.modules = {
          external: []
        };
        bindMemberFunctions(this);
        if (callback && !this.isInitialized && !options.isClone) {
          if (!this.options.initAsync) {
            this.init(options, callback);
            return this;
          }
          setTimeout(() => {
            this.init(options, callback);
          }, 0);
        }
      }
      init(options = {}, callback) {
        this.isInitializing = true;
        if (typeof options === "function") {
          callback = options;
          options = {};
        }
        if (options.defaultNS == null && options.ns) {
          if (isString(options.ns)) {
            options.defaultNS = options.ns;
          } else if (options.ns.indexOf("translation") < 0) {
            options.defaultNS = options.ns[0];
          }
        }
        const defOpts = get();
        this.options = {
          ...defOpts,
          ...this.options,
          ...transformOptions(options)
        };
        this.options.interpolation = {
          ...defOpts.interpolation,
          ...this.options.interpolation
        };
        if (options.keySeparator !== void 0) {
          this.options.userDefinedKeySeparator = options.keySeparator;
        }
        if (options.nsSeparator !== void 0) {
          this.options.userDefinedNsSeparator = options.nsSeparator;
        }
        if (typeof this.options.overloadTranslationOptionHandler !== "function") {
          this.options.overloadTranslationOptionHandler = defOpts.overloadTranslationOptionHandler;
        }
        if (this.options.showSupportNotice !== false && !usesLocize(this) && !getSupportNoticeShown()) {
          if (typeof console !== "undefined" && typeof console.info !== "undefined")
            console.info("\u{1F310} i18next is made possible by our own product, Locize \u2014 consider powering your project with managed localization (AI, CDN, integrations): https://locize.com \u{1F499}");
          setSupportNoticeShown();
        }
        const createClassOnDemand = (ClassOrObject) => {
          if (!ClassOrObject)
            return null;
          if (typeof ClassOrObject === "function")
            return new ClassOrObject();
          return ClassOrObject;
        };
        if (!this.options.isClone) {
          if (this.modules.logger) {
            baseLogger.init(createClassOnDemand(this.modules.logger), this.options);
          } else {
            baseLogger.init(null, this.options);
          }
          let formatter;
          if (this.modules.formatter) {
            formatter = this.modules.formatter;
          } else {
            formatter = Formatter;
          }
          const lu = new LanguageUtil(this.options);
          this.store = new ResourceStore(this.options.resources, this.options);
          const s = this.services;
          s.logger = baseLogger;
          s.resourceStore = this.store;
          s.languageUtils = lu;
          s.pluralResolver = new PluralResolver(lu, {
            prepend: this.options.pluralSeparator,
            simplifyPluralSuffix: this.options.simplifyPluralSuffix
          });
          const usingLegacyFormatFunction = this.options.interpolation.format && this.options.interpolation.format !== defOpts.interpolation.format;
          if (usingLegacyFormatFunction) {
            this.logger.deprecate(`init: you are still using the legacy format function, please use the new approach: https://www.i18next.com/translation-function/formatting`);
          }
          if (formatter && (!this.options.interpolation.format || this.options.interpolation.format === defOpts.interpolation.format)) {
            s.formatter = createClassOnDemand(formatter);
            if (s.formatter.init)
              s.formatter.init(s, this.options);
            this.options.interpolation.format = s.formatter.format.bind(s.formatter);
          }
          s.interpolator = new Interpolator(this.options);
          s.utils = {
            hasLoadedNamespace: this.hasLoadedNamespace.bind(this)
          };
          s.backendConnector = new Connector(createClassOnDemand(this.modules.backend), s.resourceStore, s, this.options);
          s.backendConnector.on("*", (event, ...args) => {
            this.emit(event, ...args);
          });
          if (this.modules.languageDetector) {
            s.languageDetector = createClassOnDemand(this.modules.languageDetector);
            if (s.languageDetector.init)
              s.languageDetector.init(s, this.options.detection, this.options);
          }
          if (this.modules.i18nFormat) {
            s.i18nFormat = createClassOnDemand(this.modules.i18nFormat);
            if (s.i18nFormat.init)
              s.i18nFormat.init(this);
          }
          this.translator = new Translator(this.services, this.options);
          this.translator.on("*", (event, ...args) => {
            this.emit(event, ...args);
          });
          this.modules.external.forEach((m) => {
            if (m.init)
              m.init(this);
          });
        }
        this.format = this.options.interpolation.format;
        if (!callback)
          callback = noop;
        if (this.options.fallbackLng && !this.services.languageDetector && !this.options.lng) {
          const codes = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
          if (codes.length > 0 && codes[0] !== "dev")
            this.options.lng = codes[0];
        }
        if (!this.services.languageDetector && !this.options.lng) {
          this.logger.warn("init: no languageDetector is used and no lng is defined");
        }
        const storeApi = ["getResource", "hasResourceBundle", "getResourceBundle", "getDataByLanguage"];
        storeApi.forEach((fcName) => {
          this[fcName] = (...args) => this.store[fcName](...args);
        });
        const storeApiChained = ["addResource", "addResources", "addResourceBundle", "removeResourceBundle"];
        storeApiChained.forEach((fcName) => {
          this[fcName] = (...args) => {
            this.store[fcName](...args);
            return this;
          };
        });
        const deferred = defer();
        const load = () => {
          const finish = (err, t) => {
            this.isInitializing = false;
            if (this.isInitialized && !this.initializedStoreOnce)
              this.logger.warn("init: i18next is already initialized. You should call init just once!");
            this.isInitialized = true;
            if (!this.options.isClone)
              this.logger.log("initialized", this.options);
            this.emit("initialized", this.options);
            deferred.resolve(t);
            callback(err, t);
          };
          if (this.languages && !this.isInitialized)
            return finish(null, this.t.bind(this));
          this.changeLanguage(this.options.lng, finish);
        };
        if (this.options.resources || !this.options.initAsync) {
          load();
        } else {
          setTimeout(load, 0);
        }
        return deferred;
      }
      loadResources(language, callback = noop) {
        var _a, _b;
        let usedCallback = callback;
        const usedLng = isString(language) ? language : this.language;
        if (typeof language === "function")
          usedCallback = language;
        if (!this.options.resources || this.options.partialBundledLanguages) {
          if ((usedLng == null ? void 0 : usedLng.toLowerCase()) === "cimode" && (!this.options.preload || this.options.preload.length === 0))
            return usedCallback();
          const toLoad = [];
          const append = (lng) => {
            if (!lng)
              return;
            if (lng === "cimode")
              return;
            const lngs = this.services.languageUtils.toResolveHierarchy(lng);
            lngs.forEach((l) => {
              if (l === "cimode")
                return;
              if (toLoad.indexOf(l) < 0)
                toLoad.push(l);
            });
          };
          if (!usedLng) {
            const fallbacks = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
            fallbacks.forEach((l) => append(l));
          } else {
            append(usedLng);
          }
          (_b = (_a = this.options.preload) == null ? void 0 : _a.forEach) == null ? void 0 : _b.call(_a, (l) => append(l));
          this.services.backendConnector.load(toLoad, this.options.ns, (e) => {
            if (!e && !this.resolvedLanguage && this.language)
              this.setResolvedLanguage(this.language);
            usedCallback(e);
          });
        } else {
          usedCallback(null);
        }
      }
      reloadResources(lngs, ns, callback) {
        const deferred = defer();
        if (typeof lngs === "function") {
          callback = lngs;
          lngs = void 0;
        }
        if (typeof ns === "function") {
          callback = ns;
          ns = void 0;
        }
        if (!lngs)
          lngs = this.languages;
        if (!ns)
          ns = this.options.ns;
        if (!callback)
          callback = noop;
        this.services.backendConnector.reload(lngs, ns, (err) => {
          deferred.resolve();
          callback(err);
        });
        return deferred;
      }
      use(module3) {
        if (!module3)
          throw new Error("You are passing an undefined module! Please check the object you are passing to i18next.use()");
        if (!module3.type)
          throw new Error("You are passing a wrong module! Please check the object you are passing to i18next.use()");
        if (module3.type === "backend") {
          this.modules.backend = module3;
        }
        if (module3.type === "logger" || module3.log && module3.warn && module3.error) {
          this.modules.logger = module3;
        }
        if (module3.type === "languageDetector") {
          this.modules.languageDetector = module3;
        }
        if (module3.type === "i18nFormat") {
          this.modules.i18nFormat = module3;
        }
        if (module3.type === "postProcessor") {
          postProcessor.addPostProcessor(module3);
        }
        if (module3.type === "formatter") {
          this.modules.formatter = module3;
        }
        if (module3.type === "3rdParty") {
          this.modules.external.push(module3);
        }
        return this;
      }
      setResolvedLanguage(l) {
        if (!l || !this.languages)
          return;
        if (["cimode", "dev"].indexOf(l) > -1)
          return;
        for (let li = 0; li < this.languages.length; li++) {
          const lngInLngs = this.languages[li];
          if (["cimode", "dev"].indexOf(lngInLngs) > -1)
            continue;
          if (this.store.hasLanguageSomeTranslations(lngInLngs)) {
            this.resolvedLanguage = lngInLngs;
            break;
          }
        }
        if (!this.resolvedLanguage && this.languages.indexOf(l) < 0 && this.store.hasLanguageSomeTranslations(l)) {
          this.resolvedLanguage = l;
          this.languages.unshift(l);
        }
      }
      changeLanguage(lng, callback) {
        this.isLanguageChangingTo = lng;
        const deferred = defer();
        this.emit("languageChanging", lng);
        const setLngProps = (l) => {
          this.language = l;
          this.languages = this.services.languageUtils.toResolveHierarchy(l);
          this.resolvedLanguage = void 0;
          this.setResolvedLanguage(l);
        };
        const done = (err, l) => {
          if (l) {
            if (this.isLanguageChangingTo === lng) {
              setLngProps(l);
              this.translator.changeLanguage(l);
              this.isLanguageChangingTo = void 0;
              this.emit("languageChanged", l);
              this.logger.log("languageChanged", l);
            }
          } else {
            this.isLanguageChangingTo = void 0;
          }
          deferred.resolve((...args) => this.t(...args));
          if (callback)
            callback(err, (...args) => this.t(...args));
        };
        const setLng = (lngs) => {
          var _a, _b;
          if (!lng && !lngs && this.services.languageDetector)
            lngs = [];
          const fl = isString(lngs) ? lngs : lngs && lngs[0];
          const l = this.store.hasLanguageSomeTranslations(fl) ? fl : this.services.languageUtils.getBestMatchFromCodes(isString(lngs) ? [lngs] : lngs);
          if (l) {
            if (!this.language) {
              setLngProps(l);
            }
            if (!this.translator.language)
              this.translator.changeLanguage(l);
            (_b = (_a = this.services.languageDetector) == null ? void 0 : _a.cacheUserLanguage) == null ? void 0 : _b.call(_a, l);
          }
          this.loadResources(l, (err) => {
            done(err, l);
          });
        };
        if (!lng && this.services.languageDetector && !this.services.languageDetector.async) {
          setLng(this.services.languageDetector.detect());
        } else if (!lng && this.services.languageDetector && this.services.languageDetector.async) {
          if (this.services.languageDetector.detect.length === 0) {
            this.services.languageDetector.detect().then(setLng);
          } else {
            this.services.languageDetector.detect(setLng);
          }
        } else {
          setLng(lng);
        }
        return deferred;
      }
      getFixedT(lng, ns, keyPrefix) {
        const fixedT = (key, opts, ...rest) => {
          let o;
          if (typeof opts !== "object") {
            o = this.options.overloadTranslationOptionHandler([key, opts].concat(rest));
          } else {
            o = {
              ...opts
            };
          }
          o.lng = o.lng || fixedT.lng;
          o.lngs = o.lngs || fixedT.lngs;
          o.ns = o.ns || fixedT.ns;
          if (o.keyPrefix !== "")
            o.keyPrefix = o.keyPrefix || keyPrefix || fixedT.keyPrefix;
          const keySeparator = this.options.keySeparator || ".";
          let resultKey;
          if (o.keyPrefix && Array.isArray(key)) {
            resultKey = key.map((k) => {
              if (typeof k === "function")
                k = keysFromSelector(k, {
                  ...this.options,
                  ...opts
                });
              return `${o.keyPrefix}${keySeparator}${k}`;
            });
          } else {
            if (typeof key === "function")
              key = keysFromSelector(key, {
                ...this.options,
                ...opts
              });
            resultKey = o.keyPrefix ? `${o.keyPrefix}${keySeparator}${key}` : key;
          }
          return this.t(resultKey, o);
        };
        if (isString(lng)) {
          fixedT.lng = lng;
        } else {
          fixedT.lngs = lng;
        }
        fixedT.ns = ns;
        fixedT.keyPrefix = keyPrefix;
        return fixedT;
      }
      t(...args) {
        var _a;
        return (_a = this.translator) == null ? void 0 : _a.translate(...args);
      }
      exists(...args) {
        var _a;
        return (_a = this.translator) == null ? void 0 : _a.exists(...args);
      }
      setDefaultNamespace(ns) {
        this.options.defaultNS = ns;
      }
      hasLoadedNamespace(ns, options = {}) {
        if (!this.isInitialized) {
          this.logger.warn("hasLoadedNamespace: i18next was not initialized", this.languages);
          return false;
        }
        if (!this.languages || !this.languages.length) {
          this.logger.warn("hasLoadedNamespace: i18n.languages were undefined or empty", this.languages);
          return false;
        }
        const lng = options.lng || this.resolvedLanguage || this.languages[0];
        const fallbackLng = this.options ? this.options.fallbackLng : false;
        const lastLng = this.languages[this.languages.length - 1];
        if (lng.toLowerCase() === "cimode")
          return true;
        const loadNotPending = (l, n) => {
          const loadState = this.services.backendConnector.state[`${l}|${n}`];
          return loadState === -1 || loadState === 0 || loadState === 2;
        };
        if (options.precheck) {
          const preResult = options.precheck(this, loadNotPending);
          if (preResult !== void 0)
            return preResult;
        }
        if (this.hasResourceBundle(lng, ns))
          return true;
        if (!this.services.backendConnector.backend || this.options.resources && !this.options.partialBundledLanguages)
          return true;
        if (loadNotPending(lng, ns) && (!fallbackLng || loadNotPending(lastLng, ns)))
          return true;
        return false;
      }
      loadNamespaces(ns, callback) {
        const deferred = defer();
        if (!this.options.ns) {
          if (callback)
            callback();
          return Promise.resolve();
        }
        if (isString(ns))
          ns = [ns];
        ns.forEach((n) => {
          if (this.options.ns.indexOf(n) < 0)
            this.options.ns.push(n);
        });
        this.loadResources((err) => {
          deferred.resolve();
          if (callback)
            callback(err);
        });
        return deferred;
      }
      loadLanguages(lngs, callback) {
        const deferred = defer();
        if (isString(lngs))
          lngs = [lngs];
        const preloaded = this.options.preload || [];
        const newLngs = lngs.filter((lng) => preloaded.indexOf(lng) < 0 && this.services.languageUtils.isSupportedCode(lng));
        if (!newLngs.length) {
          if (callback)
            callback();
          return Promise.resolve();
        }
        this.options.preload = preloaded.concat(newLngs);
        this.loadResources((err) => {
          deferred.resolve();
          if (callback)
            callback(err);
        });
        return deferred;
      }
      dir(lng) {
        var _a, _b;
        if (!lng)
          lng = this.resolvedLanguage || (((_a = this.languages) == null ? void 0 : _a.length) > 0 ? this.languages[0] : this.language);
        if (!lng)
          return "rtl";
        try {
          const l = new Intl.Locale(lng);
          if (l && l.getTextInfo) {
            const ti = l.getTextInfo();
            if (ti && ti.direction)
              return ti.direction;
          }
        } catch (e) {
        }
        const rtlLngs = ["ar", "shu", "sqr", "ssh", "xaa", "yhd", "yud", "aao", "abh", "abv", "acm", "acq", "acw", "acx", "acy", "adf", "ads", "aeb", "aec", "afb", "ajp", "apc", "apd", "arb", "arq", "ars", "ary", "arz", "auz", "avl", "ayh", "ayl", "ayn", "ayp", "bbz", "pga", "he", "iw", "ps", "pbt", "pbu", "pst", "prp", "prd", "ug", "ur", "ydd", "yds", "yih", "ji", "yi", "hbo", "men", "xmn", "fa", "jpr", "peo", "pes", "prs", "dv", "sam", "ckb"];
        const languageUtils = ((_b = this.services) == null ? void 0 : _b.languageUtils) || new LanguageUtil(get());
        if (lng.toLowerCase().indexOf("-latn") > 1)
          return "ltr";
        return rtlLngs.indexOf(languageUtils.getLanguagePartFromCode(lng)) > -1 || lng.toLowerCase().indexOf("-arab") > 1 ? "rtl" : "ltr";
      }
      static createInstance(options = {}, callback) {
        const instance2 = new _I18n(options, callback);
        instance2.createInstance = _I18n.createInstance;
        return instance2;
      }
      cloneInstance(options = {}, callback = noop) {
        const forkResourceStore = options.forkResourceStore;
        if (forkResourceStore)
          delete options.forkResourceStore;
        const mergedOptions = {
          ...this.options,
          ...options,
          ...{
            isClone: true
          }
        };
        const clone = new _I18n(mergedOptions);
        if (options.debug !== void 0 || options.prefix !== void 0) {
          clone.logger = clone.logger.clone(options);
        }
        const membersToCopy = ["store", "services", "language"];
        membersToCopy.forEach((m) => {
          clone[m] = this[m];
        });
        clone.services = {
          ...this.services
        };
        clone.services.utils = {
          hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone)
        };
        if (forkResourceStore) {
          const clonedData = Object.keys(this.store.data).reduce((prev, l) => {
            prev[l] = {
              ...this.store.data[l]
            };
            prev[l] = Object.keys(prev[l]).reduce((acc, n) => {
              acc[n] = {
                ...prev[l][n]
              };
              return acc;
            }, prev[l]);
            return prev;
          }, {});
          clone.store = new ResourceStore(clonedData, mergedOptions);
          clone.services.resourceStore = clone.store;
        }
        if (options.interpolation) {
          const defOpts = get();
          const mergedInterpolation = {
            ...defOpts.interpolation,
            ...this.options.interpolation,
            ...options.interpolation
          };
          const mergedForInterpolator = {
            ...mergedOptions,
            interpolation: mergedInterpolation
          };
          clone.services.interpolator = new Interpolator(mergedForInterpolator);
        }
        clone.translator = new Translator(clone.services, mergedOptions);
        clone.translator.on("*", (event, ...args) => {
          clone.emit(event, ...args);
        });
        clone.init(mergedOptions, callback);
        clone.translator.options = mergedOptions;
        clone.translator.backendConnector.services.utils = {
          hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone)
        };
        return clone;
      }
      toJSON() {
        return {
          options: this.options,
          store: this.store,
          language: this.language,
          languages: this.languages,
          resolvedLanguage: this.resolvedLanguage
        };
      }
    };
    var instance = I18n.createInstance();
    instance.keyFromSelector = keysFromSelector;
    module2.exports = instance;
  }
});

// js/net-guard.js
var require_net_guard = __commonJS({
  "js/net-guard.js"(exports2, module2) {
    var net = require("net");
    var dns = require("dns");
    var https = require("https");
    function isPrivateIp(ip) {
      if (net.isIPv4(ip)) {
        const parts = ip.split(".").map(Number);
        if (parts[0] === 10)
          return true;
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
          return true;
        if (parts[0] === 192 && parts[1] === 168)
          return true;
        if (parts[0] === 127)
          return true;
        if (parts[0] === 169 && parts[1] === 254)
          return true;
        if (parts[0] === 0)
          return true;
        if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
          return true;
        if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2)
          return true;
        if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100)
          return true;
        if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113)
          return true;
        if (parts[0] >= 224 && parts[0] <= 239)
          return true;
        if (parts[0] >= 240)
          return true;
      }
      if (net.isIPv6(ip)) {
        const normalized = ip.toLowerCase();
        if (normalized === "::1" || normalized === "::")
          return true;
        if (normalized.startsWith("fe80:"))
          return true;
        if (normalized.startsWith("fc") || normalized.startsWith("fd"))
          return true;
        if (normalized.startsWith("::ffff:")) {
          const mapped = normalized.slice(7);
          if (net.isIPv4(mapped))
            return isPrivateIp(mapped);
        }
        if (normalized.startsWith("64:ff9b:"))
          return true;
        if (normalized.startsWith("2001:db8:"))
          return true;
        if (normalized.startsWith("2001:") && (normalized.startsWith("2001:0:") || normalized === "2001::"))
          return true;
        if (normalized.startsWith("2002:"))
          return true;
        if (normalized.startsWith("ff"))
          return true;
        if (normalized.startsWith("100:"))
          return true;
      }
      return false;
    }
    async function validateUrl(url) {
      if (typeof url !== "string" || !url.trim()) {
        throw new Error("Invalid URL");
      }
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") {
        throw new Error("Only HTTPS URLs are allowed");
      }
      const hostname = parsed.hostname.toLowerCase();
      if (hostname === "localhost" || hostname === "[::1]") {
        throw new Error("Access to localhost is blocked");
      }
      if (net.isIP(hostname)) {
        if (isPrivateIp(hostname)) {
          throw new Error(`Access to private IP address ${hostname} is blocked`);
        }
        return { parsed, addresses: [hostname] };
      }
      try {
        const addresses = await dns.promises.resolve4(hostname).catch(() => []);
        if (addresses.length === 0) {
          throw new Error(`DNS resolution returned no addresses for ${hostname}`);
        }
        const badAddr = addresses.find((addr) => isPrivateIp(addr));
        if (badAddr) {
          throw new Error(`Resolved address ${badAddr} for ${hostname} is private, access blocked`);
        }
        return { parsed, addresses };
      } catch (e) {
        if (e.message && (e.message.includes("private") || e.message.includes("blocked") || e.message.includes("no addresses")))
          throw e;
        throw new Error(`DNS resolution failed for ${hostname}: ${e.message}`);
      }
    }
    function pinnedLookup(addresses) {
      const list = addresses.map((ip) => ({ address: ip, family: 4 }));
      return (hostname, options, callback) => {
        if (options && options.all)
          return callback(null, list);
        return callback(null, list[0].address, 4);
      };
    }
    var NETWORK_ERROR_PATTERNS = /timed out|timeout|ENOTFOUND|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|EAI_AGAIN|socket hang up|DNS resolution/i;
    function isNetworkError2(err) {
      return NETWORK_ERROR_PATTERNS.test((err == null ? void 0 : err.message) || "") || NETWORK_ERROR_PATTERNS.test((err == null ? void 0 : err.code) || "");
    }
    async function secureHttpsGet(url, options, callback) {
      if (typeof options === "function") {
        callback = options;
        options = {};
      }
      options = options || {};
      const { addresses } = await validateUrl(url);
      const getOptions = { ...options, lookup: pinnedLookup(addresses) };
      return https.get(url, getOptions, callback);
    }
    module2.exports = {
      isPrivateIp,
      validateUrl,
      pinnedLookup,
      secureHttpsGet,
      isNetworkError: isNetworkError2
    };
  }
});

// js/binary.js
var require_binary = __commonJS({
  "js/binary.js"(exports2, module2) {
    var path = require("path");
    var fs = require("fs");
    var os = require("os");
    var crypto = require("crypto");
    var { spawn, execFileSync } = require("child_process");
    var { secureHttpsGet } = require_net_guard();
    var PLUGIN_ROOT = path.join(__dirname, "..");
    var BIN_DIR = path.join(PLUGIN_ROOT, "bin");
    var PINNED_VERSIONS = {
      ytdlp: {
        version: "2026.08.19",
        assets: {
          "yt-dlp.exe": { sha256: "66674953fe251b89f4d08c5f0e35e0728679bd67ab3d7d05c0562af101dd3e7a" },
          "yt-dlp_macos": { sha256: "0f192b7ec147ab6288885d6351d9ab67367640029b4377576ef46dd79cf7b202" },
          "yt-dlp_linux": { sha256: "58162f9bfdc27458ea47bfcb311cf47028f17d8154a8bf7d689861d46399230a" }
        },
        urlTemplate: "https://github.com/yt-dlp/yt-dlp/releases/download/{version}/{binary}"
      }
    };
    function verifySha256(filePath, expectedHash) {
      if (!expectedHash || typeof expectedHash !== "string" || expectedHash.length !== 64 || expectedHash.startsWith("<")) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
        }
        throw new Error(`SHA-256 verification failed for ${path.basename(filePath)}: hash missing or invalid`);
      }
      const fileBuffer = fs.readFileSync(filePath);
      const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      if (hash.toLowerCase() !== expectedHash.toLowerCase()) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
        }
        throw new Error(`SHA-256 verification failed for ${path.basename(filePath)}: expected ${expectedHash}, got ${hash}`);
      }
    }
    function getYtDlpBinaryName() {
      const platform = os.platform();
      switch (platform) {
        case "win32":
          return "yt-dlp.exe";
        case "darwin":
          return "yt-dlp_macos";
        case "linux":
          return "yt-dlp_linux";
        default:
          return "yt-dlp";
      }
    }
    function getYtDlpPath() {
      return path.join(BIN_DIR, getYtDlpBinaryName());
    }
    function isYtDlpInstalled2() {
      return fs.existsSync(getYtDlpPath());
    }
    function getEagleFfmpegPath() {
      const platform = os.platform();
      const archName = os.arch() === "arm64" ? "arm64" : "x64";
      const dataDir = platform === "darwin" ? path.join(os.homedir(), "Library", "Application Support", "Eagle") : platform === "win32" ? path.join(os.homedir(), "AppData", "Roaming", "Eagle") : path.join(os.homedir(), ".config", "Eagle");
      const dirName = platform === "darwin" ? `ffmpeg-mac-${archName}` : platform === "win32" ? `ffmpeg-win-${archName}` : `ffmpeg-linux-${archName}`;
      const bin = platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
      return path.join(dataDir, "Plugins", dirName, bin);
    }
    function resolveFfmpeg() {
      const p = getEagleFfmpegPath();
      if (fs.existsSync(p))
        return { source: "eagle", path: p };
      return null;
    }
    function getFfmpegSource2() {
      var _a;
      return ((_a = resolveFfmpeg()) == null ? void 0 : _a.source) ?? null;
    }
    function getFfmpegPath() {
      var _a;
      return ((_a = resolveFfmpeg()) == null ? void 0 : _a.path) ?? null;
    }
    var DOWNLOAD_IDLE_TIMEOUT_MS = 15e3;
    var DOWNLOAD_MAX_RETRIES = 2;
    function downloadFile(url, destPath, onProgress, retriesLeft = DOWNLOAD_MAX_RETRIES, idleTimeoutMs = DOWNLOAD_IDLE_TIMEOUT_MS, maxRedirects = 5) {
      return new Promise((resolve, reject) => {
        const tmpPath = `${destPath}.download`;
        const file = fs.createWriteStream(tmpPath);
        let settled = false;
        let request = null;
        const cleanupFile = () => {
          file.close();
          if (fs.existsSync(tmpPath)) {
            try {
              fs.unlinkSync(tmpPath);
            } catch (e) {
            }
          }
        };
        const handleFailure = (error) => {
          if (settled)
            return;
          settled = true;
          if (request)
            request.destroy();
          cleanupFile();
          if (retriesLeft > 0) {
            downloadFile(url, destPath, onProgress, retriesLeft - 1, idleTimeoutMs).then(resolve).catch(reject);
          } else {
            reject(error);
          }
        };
        const onResponse = (response) => {
          if ([301, 302, 307, 308].includes(response.statusCode)) {
            settled = true;
            cleanupFile();
            const redirectUrl = response.headers.location;
            if (!redirectUrl) {
              reject(new Error("Redirect missing location header"));
              return;
            }
            if (maxRedirects <= 0) {
              reject(new Error("Too many redirects"));
              return;
            }
            downloadFile(redirectUrl, destPath, onProgress, retriesLeft, idleTimeoutMs, maxRedirects - 1).then(resolve).catch(reject);
            return;
          }
          if (response.statusCode !== 200) {
            settled = true;
            cleanupFile();
            reject(new Error(`Download failed with status ${response.statusCode}`));
            return;
          }
          const totalSize = parseInt(response.headers["content-length"], 10);
          let downloadedSize = 0;
          response.on("data", (chunk) => {
            downloadedSize += chunk.length;
            if (onProgress && totalSize) {
              onProgress(Math.round(downloadedSize / totalSize * 100));
            }
          });
          response.on("error", handleFailure);
          response.pipe(file);
          file.on("finish", () => {
            if (settled)
              return;
            settled = true;
            file.close(() => {
              try {
                fs.renameSync(tmpPath, destPath);
                resolve(destPath);
              } catch (e) {
                if (fs.existsSync(tmpPath)) {
                  try {
                    fs.unlinkSync(tmpPath);
                  } catch (_) {
                  }
                }
                reject(e);
              }
            });
          });
          file.on("error", handleFailure);
        };
        secureHttpsGet(url, onResponse).then((req) => {
          request = req;
          request.setTimeout(idleTimeoutMs, () => {
            handleFailure(new Error("Download timed out: no data received"));
          });
          request.on("error", handleFailure);
        }).catch(handleFailure);
      });
    }
    function clearQuarantine(filePath) {
      try {
        execFileSync("xattr", ["-d", "com.apple.quarantine", filePath], { stdio: "ignore" });
      } catch (e) {
      }
    }
    async function downloadYtDlp2(onProgress) {
      if (!fs.existsSync(BIN_DIR)) {
        fs.mkdirSync(BIN_DIR, { recursive: true });
      }
      const destPath = getYtDlpPath();
      const binaryName = getYtDlpBinaryName();
      const asset = PINNED_VERSIONS.ytdlp.assets[binaryName];
      if (!asset)
        throw new Error(`Unsupported platform: ${os.platform()}`);
      const url = PINNED_VERSIONS.ytdlp.urlTemplate.replace("{version}", PINNED_VERSIONS.ytdlp.version).replace("{binary}", binaryName);
      await downloadFile(url, destPath, onProgress);
      verifySha256(destPath, asset.sha256);
      if (os.platform() !== "win32") {
        fs.chmodSync(destPath, "755");
      }
      if (os.platform() === "darwin") {
        clearQuarantine(destPath);
      }
      return destPath;
    }
    function getInstalledYtDlpVersion2() {
      return new Promise((resolve) => {
        const ytdlp = getYtDlpPath();
        if (!fs.existsSync(ytdlp)) {
          resolve(null);
          return;
        }
        const proc = spawn(ytdlp, ["--version"]);
        let output = "";
        proc.stdout.on("data", (d) => {
          output += d.toString();
        });
        proc.on("close", () => resolve(output.trim() || null));
        proc.on("error", () => resolve(null));
      });
    }
    function getLatestYtDlpVersion2() {
      return PINNED_VERSIONS.ytdlp.version;
    }
    async function checkAndUpdateYtDlp(onProgress) {
      const installedVersion = await getInstalledYtDlpVersion2();
      if (!installedVersion) {
        await downloadYtDlp2(onProgress);
        return true;
      }
      const latestVersion = getLatestYtDlpVersion2();
      if (installedVersion !== latestVersion) {
        await downloadYtDlp2(onProgress);
        return true;
      }
      return false;
    }
    function uninstallYtDlp2() {
      const ytdlp = getYtDlpPath();
      if (fs.existsSync(ytdlp)) {
        fs.unlinkSync(ytdlp);
      }
      try {
        if (fs.existsSync(BIN_DIR) && fs.readdirSync(BIN_DIR).length === 0) {
          fs.rmdirSync(BIN_DIR);
        }
      } catch (e) {
      }
    }
    async function getYtDlpUpdateInfo2() {
      const installedVersion = await getInstalledYtDlpVersion2();
      if (!installedVersion) {
        return { hasUpdate: false, latestVersion: null, installedVersion: null };
      }
      const latestVersion = await getLatestYtDlpVersion2();
      return {
        hasUpdate: installedVersion !== latestVersion,
        latestVersion,
        installedVersion
      };
    }
    module2.exports = {
      BIN_DIR,
      getYtDlpPath,
      getFfmpegPath,
      getFfmpegSource: getFfmpegSource2,
      isYtDlpInstalled: isYtDlpInstalled2,
      downloadYtDlp: downloadYtDlp2,
      uninstallYtDlp: uninstallYtDlp2,
      checkAndUpdateYtDlp,
      getInstalledYtDlpVersion: getInstalledYtDlpVersion2,
      getLatestYtDlpVersion: getLatestYtDlpVersion2,
      getYtDlpUpdateInfo: getYtDlpUpdateInfo2,
      verifySha256
    };
  }
});

// js/sites/bilibili.js
var require_bilibili = __commonJS({
  "js/sites/bilibili.js"(exports2, module2) {
    function match(url) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
        return host === "bilibili.com" || host === "b23.tv" || host.endsWith(".bilibili.com");
      } catch {
        return false;
      }
    }
    function getSiteArgs(url) {
      return [
        "--referer",
        "https://www.bilibili.com",
        "--add-header",
        "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      ];
    }
    async function handleExecFailure({ stderr, args, onProgress, onOutput, execYtDlp, url }) {
      const is412 = stderr.includes("HTTP Error 412");
      const alreadyHasReferer = args.includes("--referer");
      if (is412 && !alreadyHasReferer) {
        const extraArgs = getSiteArgs(url);
        if (extraArgs.length > 0) {
          return await execYtDlp([...args, ...extraArgs], onProgress, onOutput, false);
        }
      }
      return null;
    }
    module2.exports = {
      match,
      getSiteArgs,
      handleExecFailure
    };
  }
});

// js/sites/twitter.js
var require_twitter = __commonJS({
  "js/sites/twitter.js"(exports2, module2) {
    function match(url) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
        return host === "twitter.com" || host === "x.com" || host.endsWith(".twitter.com") || host.endsWith(".x.com");
      } catch {
        return false;
      }
    }
    function getSiteArgs() {
      return [
        "--ignore-no-formats-error"
      ];
    }
    module2.exports = {
      match,
      getSiteArgs
    };
  }
});

// js/sites/vimeo.js
var require_vimeo = __commonJS({
  "js/sites/vimeo.js"(exports2, module2) {
    function match(url) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
        return host === "vimeo.com" || host.endsWith(".vimeo.com");
      } catch {
        return false;
      }
    }
    function normalizeUrl(url) {
      try {
        const urlObj = new URL(url);
        if (urlObj.hostname === "vimeo.com" || urlObj.hostname === "www.vimeo.com") {
          const pathParts = urlObj.pathname.split("/").filter((p) => p);
          const videoId = pathParts.find((part) => /^\d+$/.test(part));
          if (videoId) {
            return `https://player.vimeo.com/video/${videoId}`;
          }
        }
        return url;
      } catch {
        return url;
      }
    }
    module2.exports = {
      match,
      normalizeUrl
    };
  }
});

// js/sites/instagram.js
var require_instagram = __commonJS({
  "js/sites/instagram.js"(exports2, module2) {
    function match(url) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
        return host === "instagram.com" || host.endsWith(".instagram.com");
      } catch {
        return false;
      }
    }
    function getSiteArgs() {
      return [
        "--referer",
        "https://www.instagram.com/",
        "--add-header",
        "User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      ];
    }
    async function handleExecFailure({ args, onProgress, onOutput, execYtDlp, hasCookieConsent }) {
      if (!args.includes("--cookies-from-browser") && hasCookieConsent()) {
        return await execYtDlp([...args, "--cookies-from-browser", "chrome"], onProgress, onOutput, false);
      }
      return null;
    }
    module2.exports = {
      match,
      getSiteArgs,
      handleExecFailure
    };
  }
});

// js/sites/pinterest.js
var require_pinterest = __commonJS({
  "js/sites/pinterest.js"(exports2, module2) {
    var { validateUrl, secureHttpsGet } = require_net_guard();
    function match(url) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
        return host === "pinterest.com" || host.endsWith(".pinterest.com") || host === "pin.it";
      } catch {
        return false;
      }
    }
    function getSiteArgs() {
      return [
        "--referer",
        "https://www.pinterest.com/",
        "--add-header",
        "User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      ];
    }
    function fetchWithRedirect(url, maxRedirects = 5) {
      return new Promise(async (resolve) => {
        if (maxRedirects <= 0)
          return resolve(null);
        try {
          const u = new URL(url);
          const req = await secureHttpsGet(
            url,
            {
              headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              }
            },
            async (res) => {
              if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                let redirectUrl = res.headers.location;
                if (redirectUrl.startsWith("/")) {
                  redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
                }
                try {
                  await validateUrl(redirectUrl);
                  return fetchWithRedirect(redirectUrl, maxRedirects - 1).then(resolve);
                } catch (err) {
                  return resolve(null);
                }
              }
              let html = "";
              res.on("data", (chunk) => html += chunk);
              res.on("end", () => resolve(html));
            }
          );
          req.on("error", () => resolve(null));
          req.setTimeout(8e3, () => {
            req.destroy();
            resolve(null);
          });
        } catch (e) {
          resolve(null);
        }
      });
    }
    async function fetchPageHtml(url) {
      await validateUrl(url);
      return await fetchWithRedirect(url);
    }
    async function extractPinterestPinData(pinterestUrl) {
      try {
        const html = await fetchPageHtml(pinterestUrl);
        if (!html)
          return null;
        const pinIdMatch = pinterestUrl.match(/pin\/([\d]+)/);
        const pinId = pinIdMatch ? pinIdMatch[1] : null;
        const result = {
          isVideo: false,
          videos: null,
          imageUrl: null,
          title: "",
          description: "",
          link: null,
          sourceUrl: null
        };
        if (pinId) {
          const entityIdx = html.indexOf(`"entityId":"${pinId}"`);
          if (entityIdx !== -1) {
            const start = Math.max(0, entityIdx - 3e3);
            const end = Math.min(html.length, entityIdx + 3e3);
            const context = html.substring(start, end);
            const isVideoMatch = context.match(/"isVideo"\s*:\s*(true|false)/);
            if (isVideoMatch)
              result.isVideo = isVideoMatch[1] === "true";
            const videosMatch = context.match(/"videos"\s*:\s*(null|\{)/);
            if (videosMatch && videosMatch[1] !== "null")
              result.videos = true;
            const descMatch = context.match(/"description"\s*:\s*"([^"]{0,500})"/);
            if (descMatch)
              result.description = descMatch[1];
            const titleMatch = context.match(/"seoTitle"\s*:\s*"([^"]{0,200})"/);
            if (titleMatch && titleMatch[1])
              result.title = titleMatch[1];
            const linkMatch = context.match(/"link"\s*:\s*"([^"]+)"/);
            if (linkMatch)
              result.link = linkMatch[1];
          }
        }
        if (pinId) {
          const entityIdx = html.indexOf(`"entityId":"${pinId}"`);
          if (entityIdx !== -1) {
            const imgSearchStart = Math.max(0, entityIdx - 8e3);
            const imgSearchEnd = Math.min(html.length, entityIdx + 8e3);
            const imgContext = html.substring(imgSearchStart, imgSearchEnd);
            const origMatch = imgContext.match(/https:\/\/i\.pinimg\.com\/originals\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp))/i);
            if (origMatch) {
              result.imageUrl = `https://i.pinimg.com/originals/${origMatch[1]}`;
            } else {
              const anyMatch = imgContext.match(/https:\/\/i\.pinimg\.com\/(?:1200x|736x|564x|474x|236x|136x136|60x60|600x315)\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp))/i);
              if (anyMatch) {
                result.imageUrl = `https://i.pinimg.com/originals/${anyMatch[1]}`;
              }
            }
          }
        }
        if (!result.imageUrl) {
          const originalsMatch = html.match(/https:\/\/i\.pinimg\.com\/originals\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp)/i);
          if (originalsMatch) {
            result.imageUrl = originalsMatch[0];
          } else {
            const anyImgMatch = html.match(/https:\/\/i\.pinimg\.com\/(?:1200x|736x|564x|474x)\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp))/i);
            if (anyImgMatch) {
              result.imageUrl = `https://i.pinimg.com/originals/${anyImgMatch[1]}`;
            }
          }
        }
        const sourceMatches = html.match(
          /https:\/\/[^\s"'<>\\]*?(?:instagram\.com|youtube\.com|vimeo\.com|tiktok\.com)[^\s"'<>\\]*/gi
        );
        if (sourceMatches && sourceMatches.length > 0) {
          let cleanUrl = sourceMatches[0].replace(/\\\/|\\/g, "/");
          cleanUrl = cleanUrl.replace(/\\u0026/g, "&");
          result.sourceUrl = cleanUrl;
        }
        if (!result.title && result.description) {
          result.title = result.description.split("\n")[0].substring(0, 100);
        }
        if (!result.title)
          result.title = "Pinterest Pin";
        return result;
      } catch (e) {
        return null;
      }
    }
    async function customGetInfo(url, { execYtDlp, parseYtDlpOutput, getSiteArgsForUrl }) {
      const pinData = await extractPinterestPinData(url);
      if (!pinData)
        return null;
      const hasVideoContent = pinData.isVideo || pinData.videos;
      const hasVideoSource = !!pinData.sourceUrl;
      if (!hasVideoContent && !hasVideoSource && pinData.imageUrl) {
        return {
          type: "image",
          imageUrl: pinData.imageUrl,
          title: pinData.title || "Pinterest Pin",
          description: pinData.description || "",
          duration: 0,
          thumbnail: pinData.imageUrl,
          uploader: "Pinterest",
          extractor: "pinterest",
          webpage_url: url,
          id: null
        };
      }
      if (hasVideoSource && !hasVideoContent) {
        const targetUrl = pinData.sourceUrl.replace(/\?img_index=\d+/, "");
        await validateUrl(targetUrl);
        const args = ["--dump-json", "--no-warnings", ...getSiteArgsForUrl(targetUrl), targetUrl];
        try {
          const output = await execYtDlp(args);
          return parseYtDlpOutput(output, targetUrl);
        } catch (e) {
          if (pinData.imageUrl) {
            return {
              type: "image",
              imageUrl: pinData.imageUrl,
              title: pinData.title || "Pinterest Pin",
              description: pinData.description || "",
              duration: 0,
              thumbnail: pinData.imageUrl,
              uploader: "Pinterest",
              extractor: "pinterest",
              webpage_url: url,
              id: null
            };
          }
          throw e;
        }
      }
      return null;
    }
    async function handleExecFailure({ stderr, args, onProgress, onOutput, execYtDlp, hasCookieConsent, getSiteArgsForUrl, url }) {
      const isNoFormats = stderr.includes("No video formats found") || stderr.includes("[Pinterest]") || stderr.includes("login") || stderr.includes("redirect");
      if (!isNoFormats)
        return null;
      const alreadyTriedSource = args.some((a) => typeof a === "string" && (a.includes("instagram.com") || a.includes("youtube.com") || a.includes("vimeo.com") || a.includes("tiktok.com")));
      let extractedSourceUrl = null;
      if (!alreadyTriedSource) {
        let sourceUrl = await extractPinterestPinData(url).then((d) => (d == null ? void 0 : d.sourceUrl) ?? null);
        if (sourceUrl) {
          sourceUrl = sourceUrl.replace(/\?img_index=\d+/, "");
          extractedSourceUrl = sourceUrl;
          const oldSiteArgs = getSiteArgs();
          let cleanedArgs = args.filter((a) => !oldSiteArgs.includes(a) && a !== "--cookies-from-browser" && a !== "chrome");
          const newSiteArgs = getSiteArgsForUrl(sourceUrl);
          const newArgs = cleanedArgs.map((a) => a === url ? sourceUrl : a);
          newArgs.push(...newSiteArgs);
          try {
            return await execYtDlp(newArgs, onProgress, onOutput, false);
          } catch (e) {
            if (hasCookieConsent()) {
              try {
                return await execYtDlp([...newArgs, "--cookies-from-browser", "chrome"], onProgress, onOutput, false);
              } catch (e2) {
              }
            }
          }
        }
      }
      if (!extractedSourceUrl && hasCookieConsent()) {
        const alreadyTriedCookies = args.includes("--cookies-from-browser");
        if (!alreadyTriedCookies) {
          try {
            return await execYtDlp([...args, "--cookies-from-browser", "chrome"], onProgress, onOutput, false);
          } catch (e) {
          }
        }
      }
      return null;
    }
    module2.exports = {
      match,
      getSiteArgs,
      customGetInfo,
      handleExecFailure
    };
  }
});

// js/sites/index.js
var require_sites = __commonJS({
  "js/sites/index.js"(exports2, module2) {
    var bilibili = require_bilibili();
    var twitter = require_twitter();
    var vimeo = require_vimeo();
    var instagram = require_instagram();
    var pinterest = require_pinterest();
    var adapters = [
      bilibili,
      twitter,
      vimeo,
      instagram,
      pinterest
    ];
    function findAdapter(url) {
      if (!url || typeof url !== "string")
        return null;
      for (const adapter of adapters) {
        if (adapter.match(url)) {
          return adapter;
        }
      }
      return null;
    }
    function normalizeUrl(url) {
      const adapter = findAdapter(url);
      if (adapter && typeof adapter.normalizeUrl === "function") {
        return adapter.normalizeUrl(url);
      }
      return url;
    }
    function getSiteArgs(url) {
      const adapter = findAdapter(url);
      if (adapter && typeof adapter.getSiteArgs === "function") {
        return adapter.getSiteArgs(url);
      }
      return [];
    }
    async function customGetInfo(url, context) {
      const adapter = findAdapter(url);
      if (adapter && typeof adapter.customGetInfo === "function") {
        return await adapter.customGetInfo(url, context);
      }
      return null;
    }
    async function handleExecFailure(context) {
      const { url } = context;
      const adapter = findAdapter(url);
      if (adapter && typeof adapter.handleExecFailure === "function") {
        return await adapter.handleExecFailure(context);
      }
      return null;
    }
    module2.exports = {
      findAdapter,
      normalizeUrl,
      getSiteArgs,
      customGetInfo,
      handleExecFailure
    };
  }
});

// js/downloader.js
var require_downloader = __commonJS({
  "js/downloader.js"(exports2, module2) {
    var path = require("path");
    var fs = require("fs");
    var os = require("os");
    var { spawn } = require("child_process");
    var i18next3 = require_i18next();
    var { getYtDlpPath, getFfmpegPath, BIN_DIR, downloadYtDlp: downloadYtDlp2 } = require_binary();
    var { validateUrl, secureHttpsGet } = require_net_guard();
    var siteAdapters = require_sites();
    var cookieConsentGranted = false;
    function setCookieConsent(granted) {
      cookieConsentGranted = Boolean(granted);
    }
    function hasCookieConsent() {
      return cookieConsentGranted;
    }
    function isCorruptedBinaryError(error) {
      return error.code === "EBADMACHO" || error.code === "ENOEXEC" || error.errno === -88;
    }
    function execYtDlp(args, onProgress, onOutput, allowRecovery = true) {
      return new Promise((resolve, reject) => {
        const ytdlp = getYtDlpPath();
        if (!fs.existsSync(ytdlp)) {
          reject(new Error(i18next3.t("error.ytdlpNotInstalled")));
          return;
        }
        if (os.platform() !== "win32") {
          try {
            fs.chmodSync(ytdlp, "755");
          } catch (e) {
          }
        }
        const recoverFromCorruptBinary = (error) => {
          try {
            fs.unlinkSync(ytdlp);
          } catch (e) {
          }
          downloadYtDlp2().then(() => execYtDlp(args, onProgress, onOutput, false)).then(resolve).catch(() => reject(new Error(`${i18next3.t("error.failedToExecuteYtdlp")}: ${error.message}`)));
        };
        const finalArgs = args.includes("--force-ipv4") ? args : ["--force-ipv4", ...args];
        let proc;
        try {
          proc = spawn(ytdlp, finalArgs, { cwd: BIN_DIR });
        } catch (error) {
          if (allowRecovery && isCorruptedBinaryError(error)) {
            recoverFromCorruptBinary(error);
            return;
          }
          reject(new Error(`${i18next3.t("error.failedToExecuteYtdlp")}: ${error.message}`));
          return;
        }
        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (data) => {
          const output = data.toString();
          stdout += output;
          if (onOutput)
            onOutput(output);
          const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
          if (progressMatch && onProgress) {
            const percent = parseFloat(progressMatch[1]);
            const sizeMatch = output.match(/of\s+~?\s*(\S+)/);
            const totalSize = sizeMatch ? sizeMatch[1] : "";
            const speedMatch = output.match(/at\s+(\S+)/);
            const currentSpeed = speedMatch ? speedMatch[1] : "";
            const etaMatch = output.match(/ETA\s+(\S+)/);
            const eta = etaMatch ? etaMatch[1] : "";
            onProgress({
              percent,
              totalSize,
              currentSpeed,
              eta
            });
          }
        });
        proc.stderr.on("data", (data) => {
          stderr += data.toString();
        });
        proc.on("error", (error) => {
          if (allowRecovery && isCorruptedBinaryError(error)) {
            recoverFromCorruptBinary(error);
            return;
          }
          let detail = error.message;
          if (error.code === "ENOENT") {
            detail = i18next3.t("error.ytdlpNotFound") + " (ENOENT)";
          } else if (error.code === "EACCES") {
            detail = i18next3.t("error.ytdlpPermissionDenied") + " (EACCES)";
          }
          reject(new Error(`${i18next3.t("error.failedToExecuteYtdlp")}: ${detail}`));
        });
        proc.on("close", async (code) => {
          if (code === 0) {
            resolve(stdout);
          } else {
            const urlArg = args.find((a) => typeof a === "string" && a.startsWith("https"));
            if (urlArg) {
              try {
                const recoveryResult = await siteAdapters.handleExecFailure({
                  code,
                  stderr,
                  args,
                  onProgress,
                  onOutput,
                  execYtDlp,
                  hasCookieConsent,
                  getSiteArgsForUrl: siteAdapters.getSiteArgs,
                  url: urlArg
                });
                if (recoveryResult !== null) {
                  resolve(recoveryResult);
                  return;
                }
              } catch (recoveryErr) {
              }
            }
            reject(
              new Error(`${i18next3.t("error.ytdlpExitedWithCode")} ${code}: ${stderr}`)
            );
          }
        });
      });
    }
    async function downloadFile(url, outputPath, onProgress, maxRedirects = 5) {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
      return new Promise((resolve, reject) => {
        (async () => {
          let req;
          try {
            req = await secureHttpsGet(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              }
            }, (res) => {
              if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                if (maxRedirects <= 0)
                  return reject(new Error("Too many redirects"));
                let redirectUrl = res.headers.location;
                if (redirectUrl.startsWith("/")) {
                  const u = new URL(url);
                  redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
                }
                res.resume();
                downloadFile(redirectUrl, outputPath, onProgress, maxRedirects - 1).then(resolve).catch(reject);
                return;
              }
              if (res.statusCode < 200 || res.statusCode >= 400) {
                return reject(new Error(`HTTP ${res.statusCode}`));
              }
              const contentLength = parseInt(res.headers["content-length"] || "0", 10);
              const fileStream = fs.createWriteStream(outputPath);
              let received = 0;
              res.on("data", (chunk) => {
                received += chunk.length;
                if (onProgress && contentLength > 0) {
                  onProgress({ percent: Math.round(received / contentLength * 100) });
                }
              });
              res.pipe(fileStream);
              fileStream.on("finish", () => {
                fileStream.close();
                if (onProgress)
                  onProgress({ percent: 100 });
                resolve(outputPath);
              });
              fileStream.on("error", reject);
            });
          } catch (e) {
            return reject(e);
          }
          req.on("error", reject);
          req.setTimeout(3e4, () => {
            req.destroy();
            reject(new Error("Download timeout"));
          });
        })();
      });
    }
    async function getVideoInfo(url) {
      await validateUrl(url);
      url = siteAdapters.normalizeUrl(url);
      const customInfo = await siteAdapters.customGetInfo(url, {
        execYtDlp,
        parseYtDlpOutput,
        getSiteArgsForUrl: siteAdapters.getSiteArgs
      });
      if (customInfo) {
        return customInfo;
      }
      const args = ["--dump-json", "--no-warnings", ...siteAdapters.getSiteArgs(url), url];
      let output;
      try {
        output = await execYtDlp(args);
      } catch (err) {
        if (hasCookieConsent()) {
          const cookieArgs = [...args, "--cookies-from-browser", "chrome"];
          output = await execYtDlp(cookieArgs);
        } else {
          throw err;
        }
      }
      return parseYtDlpOutput(output, url);
    }
    function parseYtDlpOutput(output, fallbackUrl) {
      const lines = output.trim().split("\n").filter(Boolean);
      let info = {};
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed._type === "video" || parsed.title || parsed.playlist_title) {
            info = parsed;
            if (parsed.title)
              break;
          } else if (!info.id) {
            info = parsed;
          }
        } catch (e) {
        }
      }
      return {
        title: info.title || info.playlist_title || i18next3.t("error.untitledVideo"),
        description: info.description || "",
        duration: info.duration || 0,
        thumbnail: info.thumbnail || null,
        uploader: info.uploader || info.channel || info.playlist_uploader || i18next3.t("error.unknown"),
        extractor: info.extractor || i18next3.t("error.unknown"),
        webpage_url: info.webpage_url || fallbackUrl,
        id: info.id || null
      };
    }
    function sanitizeFilename(filename) {
      let str = typeof filename === "string" && filename.trim().length > 0 ? filename : "";
      if (!str) {
        try {
          if (typeof i18next3 !== "undefined" && typeof i18next3.t === "function") {
            const res = i18next3.t("error.untitledVideo");
            if (typeof res === "string" && res.length > 0)
              str = res;
          }
        } catch (e) {
        }
      }
      if (!str || typeof str !== "string") {
        str = "Untitled Video";
      }
      return str.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ").trim().slice(0, 200) || "Untitled Video";
    }
    function getTempDir() {
      const tempDir = path.join(os.tmpdir(), "eagle-video-downloader");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      return tempDir;
    }
    async function downloadVideo(url, onProgress, onStatus, preloadedInfo = null) {
      await validateUrl(url);
      let videoInfo;
      if (preloadedInfo) {
        videoInfo = preloadedInfo;
      } else {
        if (onStatus)
          onStatus(i18next3.t("download.fetchingInfo"));
        try {
          videoInfo = await getVideoInfo(url);
          if (onStatus && videoInfo && videoInfo.title) {
            const foundMsg = typeof i18next3 !== "undefined" && i18next3.t ? i18next3.t("download.foundVideo") : "Found Video";
            onStatus(`${foundMsg}: ${videoInfo.title}`);
          }
        } catch (error) {
          videoInfo = {
            title: typeof i18next3 !== "undefined" && i18next3.t ? i18next3.t("error.untitledVideo") : "Untitled Video",
            extractor: typeof i18next3 !== "undefined" && i18next3.t ? i18next3.t("error.unknown") : "Unknown"
          };
        }
      }
      if (videoInfo && videoInfo.type === "image" && videoInfo.imageUrl) {
        await validateUrl(videoInfo.imageUrl);
        const outputDir2 = getTempDir();
        const sanitizedTitle2 = sanitizeFilename(videoInfo.title);
        const urlPath = new URL(videoInfo.imageUrl).pathname;
        const ext = path.extname(urlPath) || ".jpg";
        const filename = `${sanitizedTitle2}${ext}`;
        const outputPath = path.join(outputDir2, filename);
        if (onStatus)
          onStatus(i18next3.t("ui.downloading"));
        await downloadFile(videoInfo.imageUrl, outputPath, onProgress);
        return [{
          path: outputPath,
          metadata: videoInfo,
          filename
        }];
      }
      const outputDir = getTempDir();
      const sanitizedTitle = sanitizeFilename(videoInfo.title);
      const outputTemplate = path.join(outputDir, `${sanitizedTitle}_%(autonumber)s.%(ext)s`);
      let targetUrl = videoInfo && typeof videoInfo.webpage_url === "string" && videoInfo.webpage_url.startsWith("https") ? videoInfo.webpage_url : url;
      targetUrl = siteAdapters.normalizeUrl(targetUrl);
      await validateUrl(targetUrl);
      const args = [
        targetUrl,
        "-o",
        outputTemplate,
        "-f",
        "bestvideo+bestaudio/best/b",
        "--merge-output-format",
        "mp4",
        "--no-warnings",
        ...siteAdapters.getSiteArgs(targetUrl)
      ];
      const ffmpeg = getFfmpegPath();
      if (ffmpeg && fs.existsSync(ffmpeg)) {
        args.push("--ffmpeg-location", path.dirname(ffmpeg));
      }
      if (onStatus)
        onStatus(i18next3.t("ui.downloading"));
      const filesBefore = new Set(fs.existsSync(outputDir) ? fs.readdirSync(outputDir) : []);
      await execYtDlp(args, onProgress);
      const filesAfter = fs.readdirSync(outputDir);
      const newFiles = filesAfter.filter((f) => !filesBefore.has(f) && f.startsWith(sanitizedTitle));
      if (newFiles.length === 0) {
        throw new Error(i18next3.t("error.fileNotFound"));
      }
      return newFiles.map((filename) => ({
        path: path.join(outputDir, filename),
        metadata: videoInfo,
        filename
      }));
    }
    function cleanup(filePath) {
      try {
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
      }
    }
    module2.exports = {
      downloadVideo,
      getVideoInfo,
      cleanup,
      setCookieConsent,
      hasCookieConsent
    };
  }
});

// js/ui.js
var require_ui = __commonJS({
  "js/ui.js"(exports2, module2) {
    function updateTheme() {
      const THEME_SUPPORT = {
        AUTO: eagle.app.isDarkColors() ? "gray" : "light",
        LIGHT: "light",
        LIGHTGRAY: "lightgray",
        GRAY: "gray",
        DARK: "dark",
        BLUE: "blue",
        PURPLE: "purple"
      };
      const theme = eagle.app.theme.toUpperCase();
      const themeName = THEME_SUPPORT[theme] ?? "dark";
      const htmlEl = document.querySelector("html");
      htmlEl.classList.add("no-transition");
      htmlEl.setAttribute("theme", themeName);
      htmlEl.setAttribute("platform", eagle.app.platform);
      htmlEl.classList.remove("no-transition");
    }
    function showMainUI() {
      var _a;
      (_a = document.getElementById("mainContainer")) == null ? void 0 : _a.classList.remove("hidden");
    }
    function isValidUrl(string) {
      try {
        const url = new URL(string);
        return url.protocol === "https:";
      } catch (_) {
        return false;
      }
    }
    function setupInputBar() {
      const urlInput = document.getElementById("urlInput");
      const addButton = document.getElementById("addButton");
      if (!urlInput || !addButton)
        return;
      addButton.classList.add("disabled");
      urlInput.addEventListener("input", () => {
        setInputBarState("idle");
        addButton.classList.toggle("disabled", urlInput.value.trim().length === 0);
      });
      const handleSubmit = () => {
        const url = urlInput.value.trim();
        if (!url)
          return;
        if (!isValidUrl(url)) {
          setInputBarState("error", i18next.t("error.invalidUrl"));
          return;
        }
        document.dispatchEvent(new CustomEvent("startDownload", { detail: { url } }));
        urlInput.value = "";
        addButton.classList.add("disabled");
        setInputBarState("idle");
      };
      addButton.addEventListener("click", handleSubmit);
      urlInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter")
          handleSubmit();
      });
    }
    function setInputBarState(state, errorMessage = "") {
      const addButton = document.getElementById("addButton");
      const buttonImg = addButton == null ? void 0 : addButton.querySelector("img");
      const tooltip = addButton == null ? void 0 : addButton.querySelector(".error-tooltip");
      addButton == null ? void 0 : addButton.classList.remove("error");
      if (tooltip)
        tooltip.textContent = "";
      if (buttonImg)
        buttonImg.src = "assets/icon_download.svg";
      if (state === "error") {
        addButton == null ? void 0 : addButton.classList.add("error");
        if (tooltip && errorMessage)
          tooltip.textContent = errorMessage;
        if (buttonImg)
          buttonImg.src = "assets/icon_error.svg";
      }
    }
    function appendQueueItem(item) {
      const list = document.querySelector(".download-list");
      if (!list)
        return;
      list.appendChild(createQueueItemEl(item));
      list.scrollTop = list.scrollHeight;
    }
    function createQueueItemEl(item) {
      const el = document.createElement("div");
      el.className = `download-item ${item.state}`;
      el.dataset.id = item.id;
      el.innerHTML = `
    <div class="item-title">${escapeHtml(item.title)}</div>
    <div class="item-progress-bar">
      <div class="item-progress-fill" style="width: ${item.progress}%"></div>
    </div>
    <div class="item-footer">
      <span class="item-meta">${escapeHtml(getMetaText(item))}</span>
      <div class="item-actions ${item.state === "error" ? "" : "hidden"}">
        <button class="item-action-btn" data-action="retry" data-id="${item.id}">${i18next.t("queue.retry")}</button>
        <button class="item-action-btn" data-action="copyError" data-id="${item.id}" id="copy-error-btn-${item.id}">${i18next.t("queue.copyError")}</button>
        <button class="item-action-btn" data-action="copy" data-id="${item.id}" id="copy-btn-${item.id}">${i18next.t("queue.copyUrl")}</button>
      </div>
    </div>
  `;
      return el;
    }
    function updateQueueItem(id, data) {
      const el = document.querySelector(`.download-item[data-id="${id}"]`);
      if (!el)
        return;
      el.className = `download-item ${data.state}`;
      const titleEl = el.querySelector(".item-title");
      if (titleEl)
        titleEl.textContent = data.title;
      const fill = el.querySelector(".item-progress-fill");
      if (fill)
        fill.style.width = `${data.progress}%`;
      const meta = el.querySelector(".item-meta");
      if (meta)
        meta.textContent = getMetaText(data);
      const actions = el.querySelector(".item-actions");
      if (actions)
        actions.classList.toggle("hidden", data.state !== "error");
    }
    function showCopiedFeedback(id) {
      const btn = document.getElementById(`copy-btn-${id}`);
      if (!btn)
        return;
      const original = btn.textContent;
      btn.textContent = i18next.t("queue.copied");
      setTimeout(() => {
        btn.textContent = original;
      }, 1500);
    }
    function showCopiedErrorFeedback(id) {
      const btn = document.getElementById(`copy-error-btn-${id}`);
      if (!btn)
        return;
      const original = btn.textContent;
      btn.textContent = i18next.t("queue.copied");
      setTimeout(() => {
        btn.textContent = original;
      }, 1500);
    }
    function getMetaText(item) {
      switch (item.state) {
        case "waiting":
          return i18next.t("queue.waiting");
        case "preparing":
          return i18next.t("queue.preparing");
        case "downloading":
          return item.speed ? `${Math.round(item.progress)}% \xB7 ${item.speed}` : `${Math.round(item.progress)}%`;
        case "completed":
          return i18next.t("queue.completed");
        case "error":
          return item.error || i18next.t("queue.error");
        default:
          return "";
      }
    }
    function escapeHtml(str) {
      return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function getDepCardEls(prefix) {
      return {
        statusEl: document.getElementById(`${prefix}Badge`),
        detailEl: document.getElementById(`${prefix}Detail`),
        progressWrap: document.getElementById(`${prefix}ProgressWrap`),
        progressFill: document.getElementById(`${prefix}ProgressFill`),
        actionsEl: document.getElementById(`${prefix}Actions`)
      };
    }
    function updateDepsBadge(hasNotice) {
      const badge = document.getElementById("depsBadge");
      if (!badge)
        return;
      badge.classList.toggle("hidden", !hasNotice);
    }
    function switchSubpageTab(tabName) {
      const tabBtnSettings = document.getElementById("tabBtnSettings");
      const tabBtnDeps = document.getElementById("tabBtnDeps");
      const settingsPanel = document.getElementById("settingsPanel");
      const depsPanel = document.getElementById("depsPanel");
      if (tabName === "settings") {
        tabBtnSettings == null ? void 0 : tabBtnSettings.classList.add("active");
        tabBtnDeps == null ? void 0 : tabBtnDeps.classList.remove("active");
        settingsPanel == null ? void 0 : settingsPanel.classList.remove("hidden");
        depsPanel == null ? void 0 : depsPanel.classList.add("hidden");
      } else {
        tabBtnSettings == null ? void 0 : tabBtnSettings.classList.remove("active");
        tabBtnDeps == null ? void 0 : tabBtnDeps.classList.add("active");
        settingsPanel == null ? void 0 : settingsPanel.classList.add("hidden");
        depsPanel == null ? void 0 : depsPanel.classList.remove("hidden");
      }
    }
    function showDepsPage({ tab = "settings", gating = false, cookieConsentPref = false, autoAddSourcePref = true } = {}) {
      var _a, _b;
      const tabBtnSettings = document.getElementById("tabBtnSettings");
      const tabBtnDeps = document.getElementById("tabBtnDeps");
      const autoAddLabel = document.getElementById("autoAddSourceLabel");
      const autoAddHint = document.getElementById("autoAddSourceHint");
      const autoAddToggle = document.getElementById("autoAddSourceToggle");
      const cookieLabel = document.getElementById("cookieConsentLabel");
      const cookieHint = document.getElementById("cookieConsentHint");
      const cookieToggle = document.getElementById("cookieConsentToggle");
      const notice = document.getElementById("depsNotice");
      const ytdlpDesc = document.getElementById("ytdlpDesc");
      const ffmpegDesc = document.getElementById("ffmpegDesc");
      if (tabBtnSettings)
        tabBtnSettings.textContent = i18next.t("deps.tabSettings");
      if (tabBtnDeps)
        tabBtnDeps.textContent = i18next.t("deps.tabDependencies");
      if (autoAddLabel)
        autoAddLabel.textContent = i18next.t("deps.autoAddSourceLabel");
      if (autoAddHint)
        autoAddHint.textContent = i18next.t("deps.autoAddSourceHint");
      if (autoAddToggle)
        autoAddToggle.checked = autoAddSourcePref;
      if (cookieLabel)
        cookieLabel.textContent = i18next.t("deps.cookieConsentLabel");
      if (cookieHint)
        cookieHint.textContent = i18next.t("deps.cookieConsentHint");
      if (cookieToggle)
        cookieToggle.checked = cookieConsentPref;
      if (notice)
        notice.textContent = i18next.t("deps.setupRequired");
      if (ytdlpDesc)
        ytdlpDesc.textContent = i18next.t("deps.ytdlpDesc");
      if (ffmpegDesc)
        ffmpegDesc.textContent = i18next.t("deps.ffmpegDesc");
      switchSubpageTab(gating ? "dependencies" : tab);
      (_a = document.getElementById("depsContainer")) == null ? void 0 : _a.classList.remove("hidden");
      (_b = document.getElementById("mainContainer")) == null ? void 0 : _b.classList.add("hidden");
      setDepsGating(gating);
    }
    function setDepsGating(gating) {
      var _a, _b;
      (_a = document.getElementById("depsBackBtn")) == null ? void 0 : _a.classList.toggle("hidden", gating);
      (_b = document.getElementById("depsNotice")) == null ? void 0 : _b.classList.toggle("hidden", !gating);
      if (gating) {
        switchSubpageTab("dependencies");
      }
    }
    function hideDepsPage() {
      var _a, _b;
      setDepsGating(false);
      (_a = document.getElementById("depsContainer")) == null ? void 0 : _a.classList.add("hidden");
      (_b = document.getElementById("mainContainer")) == null ? void 0 : _b.classList.remove("hidden");
    }
    function updateYtdlpCard(state, data = {}) {
      const { statusEl, detailEl, progressWrap, progressFill, actionsEl } = getDepCardEls("ytdlp");
      if (!statusEl)
        return;
      statusEl.className = "dep-badge";
      progressWrap == null ? void 0 : progressWrap.classList.add("hidden");
      switch (state) {
        case "checking":
          statusEl.classList.add("checking");
          statusEl.textContent = i18next.t("deps.checking");
          if (detailEl)
            detailEl.textContent = "";
          if (actionsEl)
            actionsEl.innerHTML = "";
          break;
        case "installed": {
          statusEl.classList.add("ok");
          statusEl.textContent = i18next.t("deps.installed");
          if (detailEl) {
            const versionPart = data.version ? i18next.t("deps.versionInstalled", { version: data.version }) : "";
            const checkingPart = data.checkingUpdate ? i18next.t("deps.checkingUpdate") : "";
            detailEl.textContent = [versionPart, checkingPart].filter(Boolean).join("  \xB7  ");
          }
          if (actionsEl) {
            actionsEl.innerHTML = `
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
          }
          break;
        }
        case "latest":
          statusEl.classList.add("ok");
          statusEl.textContent = i18next.t("deps.latest");
          if (detailEl)
            detailEl.textContent = i18next.t("deps.versionInstalled", { version: data.version });
          if (actionsEl) {
            actionsEl.innerHTML = `
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
          }
          break;
        case "outdated":
          statusEl.classList.add("update");
          statusEl.textContent = i18next.t("deps.outdated");
          if (detailEl)
            detailEl.textContent = i18next.t("deps.versionUpdate", { from: data.installedVersion, to: data.latestVersion });
          if (actionsEl) {
            actionsEl.innerHTML = `
          <button class="dep-btn primary" data-ytdlp-action="update">${i18next.t("deps.update")}</button>
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
          }
          break;
        case "missing":
          statusEl.classList.add("missing");
          statusEl.textContent = i18next.t("deps.missing");
          if (detailEl)
            detailEl.textContent = "";
          if (actionsEl) {
            actionsEl.innerHTML = `
          <button class="dep-btn primary" data-ytdlp-action="install">${i18next.t("deps.install")}</button>
        `;
          }
          break;
        case "error":
          statusEl.classList.add("missing");
          statusEl.textContent = i18next.t("deps.downloadFailed");
          if (detailEl)
            detailEl.textContent = data.message || "";
          if (actionsEl) {
            actionsEl.innerHTML = `
          <button class="dep-btn primary" data-ytdlp-action="${data.retryAction || "install"}">${i18next.t("deps.retry")}</button>
        `;
          }
          break;
        case "busy": {
          statusEl.classList.add("busy");
          statusEl.textContent = data.statusText || i18next.t("deps.updating");
          const pct = Math.round(data.percent || 0);
          if (detailEl)
            detailEl.textContent = i18next.t("deps.progressText", { percent: pct });
          progressWrap == null ? void 0 : progressWrap.classList.remove("hidden");
          if (progressFill)
            progressFill.style.width = `${pct}%`;
          if (actionsEl)
            actionsEl.innerHTML = "";
          break;
        }
        case "done":
          statusEl.classList.add("ok");
          statusEl.textContent = data.statusText || i18next.t("deps.doneInstalled");
          if (detailEl)
            detailEl.textContent = data.version ? i18next.t("deps.versionInstalled", { version: data.version }) : "";
          if (actionsEl) {
            actionsEl.innerHTML = `
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
          }
          break;
      }
    }
    function updateFfmpegCard(state, data = {}) {
      const { statusEl, detailEl, progressWrap, actionsEl } = getDepCardEls("ffmpeg");
      if (!statusEl)
        return;
      statusEl.className = "dep-badge";
      progressWrap == null ? void 0 : progressWrap.classList.add("hidden");
      switch (state) {
        case "checking":
          statusEl.classList.add("checking");
          statusEl.textContent = i18next.t("deps.checking");
          if (detailEl)
            detailEl.textContent = "";
          if (actionsEl)
            actionsEl.innerHTML = "";
          break;
        case "eagle":
          statusEl.classList.add("ok");
          statusEl.textContent = i18next.t("deps.eagleBuiltin");
          if (detailEl) {
            detailEl.textContent = i18next.t("deps.ffmpegManaged");
          }
          if (actionsEl)
            actionsEl.innerHTML = "";
          break;
        case "missing":
        default:
          statusEl.classList.add("missing");
          statusEl.textContent = i18next.t("deps.notFound");
          if (detailEl) {
            detailEl.textContent = i18next.t("deps.ffmpegNotFoundHint");
          }
          if (actionsEl) {
            actionsEl.innerHTML = `<button class="dep-btn primary" data-ffmpeg-action="open-store">${i18next.t("deps.installFfmpegDep")}</button>`;
          }
          break;
      }
    }
    module2.exports = {
      updateTheme,
      showMainUI,
      isValidUrl,
      setupInputBar,
      setInputBarState,
      appendQueueItem,
      updateQueueItem,
      showCopiedFeedback,
      showCopiedErrorFeedback,
      showDepsPage,
      hideDepsPage,
      setDepsGating,
      switchSubpageTab,
      updateDepsBadge,
      updateYtdlpCard,
      updateFfmpegCard
    };
  }
});

// Plugin/_locales/en.json
var require_en = __commonJS({
  "Plugin/_locales/en.json"(exports2, module2) {
    module2.exports = {
      manifest: {
        app: {
          name: "Video Downloader"
        }
      },
      ui: {
        appTitle: "Video Downloader",
        inputPlaceholder: "Paste any video URL...",
        downloadBtn: "Download",
        downloadingBtn: "Downloading...",
        preparing: "Preparing...",
        waiting: "Waiting...",
        downloading: "Downloading...",
        completed: "Complete",
        retry: "Retry",
        cancel: "Cancel",
        addToQueue: "Add to Queue",
        loading: "Loading...",
        successDownload: "Successful download"
      },
      queue: {
        waiting: "Waiting...",
        preparing: "Fetching video info...",
        downloading: "Downloading",
        completed: "Completed",
        error: "Download failed",
        retry: "Retry",
        copyUrl: "Copy URL",
        copyError: "Copy Error",
        copied: "Copied!"
      },
      download: {
        fetchingInfo: "Fetching video information...",
        foundVideo: "Found video",
        complete: "Download complete, importing to Eagle...",
        importSuccess: "Import successful",
        failed: "Download failed"
      },
      error: {
        notInitialized: "Plugin not yet initialized",
        emptyUrl: "Please enter a video URL",
        invalidUrl: "Please enter a valid HTTPS video URL",
        fileNotFound: "Download complete but file not found",
        eagleImportFailed: "Failed to import to Eagle",
        duplicateFound: "This video already exists in library",
        checkingDuplicate: "Checking for duplicates...",
        clickToRedownload: "Click to re-download and import",
        eagleApiNotAvailable: "Eagle API not available",
        untitledVideo: "Untitled Video",
        downloadedVideo: "Downloaded Video",
        ytdlpNotInstalled: "yt-dlp not installed",
        ytdlpNotFound: "yt-dlp executable not found, please restart the plugin to re-download",
        ytdlpPermissionDenied: "yt-dlp has no execute permission",
        failedToExecuteYtdlp: "Failed to execute yt-dlp",
        ytdlpExitedWithCode: "yt-dlp exited with code",
        networkUnavailable: "Network unavailable \u2014 check your connection or proxy settings and retry",
        unknown: "Unknown"
      },
      progress: {
        remaining: "Remaining"
      },
      update: {
        available: "New yt-dlp version available ({{version}})",
        clickToUpdate: "Update",
        updating: "Updating... {{percent}}%",
        done: "\u2713 Updated to latest version"
      },
      deps: {
        title: "Settings & Dependencies",
        tabSettings: "Settings",
        tabDependencies: "Dependencies",
        sectionPreferences: "Preferences",
        sectionEngines: "Core Engines",
        autoAddSourceLabel: "Auto-set Eagle Data Source",
        autoAddSourceHint: "When enabled, original web URLs are automatically saved to Eagle items",
        cookieConsentLabel: "Allow browser cookie access",
        cookieConsentHint: "When enabled, downloading Pinterest and Instagram videos may read your Chrome login session. Cookies are only sent to the respective platform sites.",
        setupRequired: "These components are required for first-time use. The main view will open automatically once setup is complete.",
        back: "Back",
        ytdlpDesc: "Video extraction & download engine",
        ffmpegDesc: "Video merging & transcoding engine",
        ffmpegManaged: "Managed by Eagle, no action needed",
        ffmpegNotFoundHint: "Eagle built-in FFmpeg plugin not found. Please click the button below to install it.",
        ffmpegUnsupported: "Eagle official FFmpeg plugin is required for audio/video merging",
        installFfmpegDep: "Install FFmpeg Dependency",
        checking: "Checking...",
        installed: "Installed",
        checkingUpdate: "Checking for updates...",
        latest: "Up to date",
        outdated: "Update",
        missing: "Not installed",
        eagleBuiltin: "Eagle built-in",
        notFound: "Not found",
        installing: "Installing...",
        updating: "Updating...",
        reinstalling: "Reinstalling...",
        doneInstalled: "Installed",
        doneUpdated: "Updated",
        doneReinstalled: "Reinstalled",
        install: "Install",
        update: "Update",
        reinstall: "Reinstall",
        uninstall: "Uninstall",
        retry: "Retry",
        downloadFailed: "Download failed",
        versionInstalled: "Version: {{version}}",
        versionUpdate: "{{from}} \u2192 {{to}}",
        progressText: "Downloading... {{percent}}%"
      }
    };
  }
});

// Plugin/_locales/zh_CN.json
var require_zh_CN = __commonJS({
  "Plugin/_locales/zh_CN.json"(exports2, module2) {
    module2.exports = {
      manifest: {
        app: {
          name: "\u89C6\u9891\u4E0B\u8F7D\u5668"
        }
      },
      ui: {
        appTitle: "\u89C6\u9891\u4E0B\u8F7D\u5668",
        inputPlaceholder: "\u7C98\u8D34\u4EFB\u610F\u89C6\u9891\u94FE\u63A5...",
        downloadBtn: "\u4E0B\u8F7D",
        downloadingBtn: "\u4E0B\u8F7D\u4E2D...",
        preparing: "\u51C6\u5907\u4E2D...",
        waiting: "\u7B49\u5F85\u4E2D...",
        downloading: "\u4E0B\u8F7D\u4E2D...",
        completed: "\u5B8C\u6210",
        retry: "\u91CD\u8BD5",
        cancel: "\u53D6\u6D88",
        addToQueue: "\u6DFB\u52A0\u5230\u961F\u5217",
        loading: "\u52A0\u8F7D\u4E2D...",
        successDownload: "\u4E0B\u8F7D\u6210\u529F"
      },
      queue: {
        waiting: "\u7B49\u5F85\u4E2D...",
        preparing: "\u83B7\u53D6\u89C6\u9891\u4FE1\u606F...",
        downloading: "\u4E0B\u8F7D\u4E2D",
        completed: "\u5DF2\u5B8C\u6210",
        error: "\u4E0B\u8F7D\u5931\u8D25",
        retry: "\u91CD\u8BD5",
        copyUrl: "\u590D\u5236\u94FE\u63A5",
        copyError: "\u590D\u5236\u9519\u8BEF",
        copied: "\u5DF2\u590D\u5236"
      },
      download: {
        fetchingInfo: "\u6B63\u5728\u83B7\u53D6\u89C6\u9891\u4FE1\u606F...",
        foundVideo: "\u627E\u5230\u89C6\u9891",
        complete: "\u4E0B\u8F7D\u5B8C\u6210\uFF0C\u6B63\u5728\u5BFC\u5165 Eagle...",
        importSuccess: "\u5BFC\u5165\u6210\u529F",
        failed: "\u4E0B\u8F7D\u5931\u8D25"
      },
      error: {
        notInitialized: "\u63D2\u4EF6\u5C1A\u672A\u521D\u59CB\u5316\u5B8C\u6210",
        emptyUrl: "\u8BF7\u8F93\u5165\u89C6\u9891\u94FE\u63A5",
        invalidUrl: "\u8BF7\u8F93\u5165\u6709\u6548\u7684 HTTPS \u89C6\u9891\u94FE\u63A5",
        fileNotFound: "\u4E0B\u8F7D\u5B8C\u6210\u4F46\u627E\u4E0D\u5230\u6587\u4EF6",
        eagleImportFailed: "\u5BFC\u5165 Eagle \u5931\u8D25",
        duplicateFound: "\u8BE5\u89C6\u9891\u5DF2\u5B58\u5728\u4E8E\u5E93\u4E2D",
        checkingDuplicate: "\u6B63\u5728\u68C0\u67E5\u91CD\u590D...",
        clickToRedownload: "\u70B9\u51FB\u91CD\u65B0\u4E0B\u8F7D\u5E76\u5BFC\u5165",
        eagleApiNotAvailable: "Eagle API \u4E0D\u53EF\u7528",
        untitledVideo: "\u672A\u547D\u540D\u89C6\u9891",
        downloadedVideo: "\u5DF2\u4E0B\u8F7D\u89C6\u9891",
        ytdlpNotInstalled: "yt-dlp \u672A\u5B89\u88C5",
        ytdlpNotFound: "\u627E\u4E0D\u5230 yt-dlp \u6267\u884C\u6587\u4EF6\uFF0C\u8BF7\u91CD\u542F\u63D2\u4EF6\u91CD\u65B0\u4E0B\u8F7D",
        ytdlpPermissionDenied: "yt-dlp \u6CA1\u6709\u6267\u884C\u6743\u9650",
        failedToExecuteYtdlp: "\u6267\u884C yt-dlp \u5931\u8D25",
        ytdlpExitedWithCode: "yt-dlp \u9000\u51FA\uFF0C\u4EE3\u7801",
        networkUnavailable: "\u7F51\u7EDC\u4E0D\u53EF\u7528 \u2014\u2014 \u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u63A5\u6216\u4EE3\u7406\u8BBE\u7F6E\u540E\u91CD\u8BD5",
        unknown: "\u672A\u77E5"
      },
      progress: {
        remaining: "\u5269\u4F59"
      },
      update: {
        available: "\u53D1\u73B0\u65B0\u7248\u672C yt-dlp ({{version}})",
        clickToUpdate: "\u66F4\u65B0",
        updating: "\u6B63\u5728\u66F4\u65B0... {{percent}}%",
        done: "\u2713 \u5DF2\u66F4\u65B0\u81F3\u6700\u65B0\u7248"
      },
      deps: {
        title: "\u8BBE\u7F6E\u4E0E\u4F9D\u8D56\u7BA1\u7406",
        tabSettings: "\u504F\u597D\u8BBE\u7F6E",
        tabDependencies: "\u4F9D\u8D56\u7BA1\u7406",
        sectionPreferences: "\u504F\u597D\u8BBE\u7F6E",
        sectionEngines: "\u6838\u5FC3\u5F15\u64CE\u4F9D\u8D56",
        autoAddSourceLabel: "\u81EA\u52A8\u8BBE\u7F6E Eagle \u6570\u636E\u6765\u6E90",
        autoAddSourceHint: "\u5F00\u542F\u540E\uFF0C\u4E0B\u8F7D\u89C6\u9891\u65F6\u4F1A\u81EA\u52A8\u5728 Eagle \u4E2D\u8BB0\u5F55\u539F\u59CB\u7F51\u9875 URL",
        cookieConsentLabel: "\u5141\u8BB8\u4F7F\u7528\u6D4F\u89C8\u5668 Cookie",
        cookieConsentHint: "\u5F00\u542F\u540E\uFF0C\u4E0B\u8F7D Pinterest \u548C Instagram \u89C6\u9891\u65F6\u53EF\u80FD\u8BFB\u53D6 Chrome \u6D4F\u89C8\u5668\u7684\u767B\u5F55\u4FE1\u606F\u3002Cookie \u4EC5\u53D1\u9001\u81F3\u5BF9\u5E94\u5E73\u53F0\u7F51\u7AD9\u3002",
        setupRequired: "\u9996\u6B21\u4F7F\u7528\u9700\u8981\u5148\u5B89\u88C5\u4EE5\u4E0B\u7EC4\u4EF6\uFF0C\u5B89\u88C5\u5B8C\u6210\u540E\u5C06\u81EA\u52A8\u8FDB\u5165\u4E3B\u754C\u9762",
        back: "\u8FD4\u56DE",
        ytdlpDesc: "\u89C6\u9891\u89E3\u6790\u4E0E\u4E0B\u8F7D\u5F15\u64CE",
        ffmpegDesc: "\u89C6\u9891\u5408\u5E76\u4E0E\u8F6C\u7801\u5F15\u64CE",
        ffmpegManaged: "\u7531 Eagle \u7BA1\u7406\uFF0C\u65E0\u9700\u624B\u52A8\u64CD\u4F5C",
        ffmpegNotFoundHint: "\u672A\u68C0\u6D4B\u5230 Eagle \u5185\u7F6E FFmpeg \u63D2\u4EF6\uFF0C\u8BF7\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u5B89\u88C5",
        ffmpegUnsupported: "\u9700\u5B89\u88C5 Eagle \u5B98\u65B9 FFmpeg \u63D2\u4EF6\u4EE5\u652F\u6301\u97F3\u89C6\u9891\u5408\u5E76",
        installFfmpegDep: "\u5B89\u88C5 FFmpeg \u4F9D\u8D56",
        checking: "\u68C0\u67E5\u4E2D...",
        installed: "\u5DF2\u5B89\u88C5",
        checkingUpdate: "\u68C0\u67E5\u66F4\u65B0\u4E2D...",
        latest: "\u5DF2\u662F\u6700\u65B0\u7248",
        outdated: "\u6709\u65B0\u7248\u672C",
        missing: "\u672A\u5B89\u88C5",
        eagleBuiltin: "Eagle \u5185\u7F6E",
        notFound: "\u672A\u627E\u5230",
        installing: "\u5B89\u88C5\u4E2D...",
        updating: "\u66F4\u65B0\u4E2D...",
        reinstalling: "\u91CD\u88C5\u4E2D...",
        doneInstalled: "\u5B89\u88C5\u5B8C\u6210",
        doneUpdated: "\u66F4\u65B0\u5B8C\u6210",
        doneReinstalled: "\u91CD\u88C5\u5B8C\u6210",
        install: "\u5B89\u88C5",
        update: "\u66F4\u65B0",
        reinstall: "\u91CD\u65B0\u5B89\u88C5",
        uninstall: "\u5378\u8F7D",
        retry: "\u91CD\u8BD5",
        downloadFailed: "\u4E0B\u8F7D\u5931\u8D25",
        versionInstalled: "\u7248\u672C\uFF1A{{version}}",
        versionUpdate: "{{from}} \u2192 {{to}}",
        progressText: "\u6B63\u5728\u4E0B\u8F7D... {{percent}}%"
      }
    };
  }
});

// js/plugin.js
var i18next2 = require_i18next();
var {
  isYtDlpInstalled,
  downloadYtDlp,
  uninstallYtDlp,
  getYtDlpUpdateInfo,
  getInstalledYtDlpVersion,
  getLatestYtDlpVersion,
  getFfmpegSource
} = require_binary();
var { isNetworkError } = require_net_guard();
var downloader = require_downloader();
var ui = require_ui();
var isInitialized = false;
async function importToEagle(videoPath, metadata, sourceUrl) {
  if (typeof eagle === "undefined") {
    throw new Error(i18next2.t("error.eagleApiNotAvailable"));
  }
  const importOptions = {
    name: metadata.title || i18next2.t("error.downloadedVideo"),
    website: sourceUrl || void 0,
    tags: [metadata.extractor || "video"],
    annotation: metadata.description ? metadata.description.slice(0, 500) : ""
  };
  try {
    return await eagle.item.addFromPath(videoPath, importOptions);
  } catch (error) {
    throw new Error(`${i18next2.t("error.eagleImportFailed")}: ${error.message}`);
  }
}
var COOKIE_CONSENT_KEY = "eagle-video-downloader.cookieConsent";
var AUTO_ADD_SOURCE_KEY = "eagle-video-downloader.autoAddSource";
function getCookieConsentPref() {
  const val = localStorage.getItem(COOKIE_CONSENT_KEY);
  return val === "true";
}
function setCookieConsentPref(value) {
  localStorage.setItem(COOKIE_CONSENT_KEY, String(value));
  downloader.setCookieConsent(Boolean(value));
}
function getAutoAddSourcePref() {
  const val = localStorage.getItem(AUTO_ADD_SOURCE_KEY);
  return val === null ? true : val === "true";
}
function setAutoAddSourcePref(value) {
  localStorage.setItem(AUTO_ADD_SOURCE_KEY, String(value));
}
var downloadQueue = [];
var MAX_CONCURRENT = 3;
var activeCount = 0;
var queueIdCounter = 0;
async function initI18n() {
  const enTranslation = require_en();
  const zhCNTranslation = require_zh_CN();
  await i18next2.init({
    lng: eagle.app.locale || "en",
    fallbackLng: "en",
    resources: {
      en: { translation: enTranslation },
      zh_CN: { translation: zhCNTranslation }
    }
  });
  global.i18next = i18next2;
}
function applyTranslations() {
  const appName = document.getElementById("appName");
  if (appName)
    appName.textContent = i18next2.t("ui.appTitle");
  const urlInput = document.getElementById("urlInput");
  if (urlInput)
    urlInput.placeholder = i18next2.t("ui.inputPlaceholder");
}
eagle.onPluginCreate(async (plugin) => {
  await initI18n();
  applyTranslations();
  ui.updateTheme();
  setupEventListeners();
  downloader.setCookieConsent(getCookieConsentPref());
  await initializeBinaries();
});
eagle.onThemeChanged(() => {
  ui.updateTheme();
});
function setupEventListeners() {
  var _a, _b;
  document.getElementById("closeButton").addEventListener("click", () => {
    window.close();
  });
  document.getElementById("depsEntryBtn").addEventListener("click", openDepsPage);
  document.getElementById("depsBackBtn").addEventListener("click", closeDepsPage);
  (_a = document.getElementById("tabBtnSettings")) == null ? void 0 : _a.addEventListener("click", () => {
    ui.switchSubpageTab("settings");
  });
  (_b = document.getElementById("tabBtnDeps")) == null ? void 0 : _b.addEventListener("click", () => {
    ui.switchSubpageTab("dependencies");
  });
  const autoAddToggle = document.getElementById("autoAddSourceToggle");
  if (autoAddToggle) {
    autoAddToggle.addEventListener("change", (e) => {
      setAutoAddSourcePref(e.target.checked);
    });
  }
  const cookieToggle = document.getElementById("cookieConsentToggle");
  if (cookieToggle) {
    cookieToggle.addEventListener("change", (e) => {
      setCookieConsentPref(e.target.checked);
    });
  }
  document.getElementById("ytdlpActions").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ytdlp-action]");
    if (btn)
      handleYtdlpAction(btn.dataset.ytdlpAction);
  });
  const ffmpegActions = document.getElementById("ffmpegActions");
  if (ffmpegActions) {
    ffmpegActions.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-ffmpeg-action]");
      if (btn && btn.dataset.ffmpegAction === "open-store") {
        openEagleFfmpegStore();
      }
    });
  }
  document.addEventListener("startDownload", (e) => {
    addToQueue(e.detail.url);
  });
  document.querySelector(".download-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn)
      return;
    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id);
    if (action === "retry")
      retryDownload(id);
    if (action === "copyError")
      copyError(id);
    if (action === "copy")
      copyUrl(id);
  });
}
async function openEagleFfmpegStore() {
  if (typeof eagle !== "undefined" && eagle.extraModule && eagle.extraModule.ffmpeg && typeof eagle.extraModule.ffmpeg.install === "function") {
    try {
      await eagle.extraModule.ffmpeg.install();
      return;
    } catch (e) {
    }
  }
  const isZh = eagle.app.locale && eagle.app.locale.startsWith("zh");
  const url = isZh ? "https://community-cn.eagle.cool/plugin/detail/eagle-plugin-ffmpeg" : "https://community.eagle.cool/plugin/detail/eagle-plugin-ffmpeg";
  try {
    const { shell } = require("electron");
    shell.openExternal(url);
  } catch (e) {
    window.open(url, "_blank");
  }
}
async function initializeBinaries() {
  if (depsReady()) {
    isInitialized = true;
    initializeMainUI();
    checkForUpdateAndNotify();
    return;
  }
  ui.showDepsPage({
    tab: "dependencies",
    gating: true,
    cookieConsentPref: getCookieConsentPref(),
    autoAddSourcePref: getAutoAddSourcePref()
  });
  ui.updateDepsBadge(true);
  loadDepsInfo();
}
function depsReady() {
  return isYtDlpInstalled() && !!getFfmpegSource();
}
function refreshDepsGatingState() {
  if (depsReady()) {
    if (!isInitialized) {
      isInitialized = true;
      ui.hideDepsPage();
      initializeMainUI();
      checkForUpdateAndNotify();
    } else {
      getYtDlpUpdateInfo().then(({ hasUpdate }) => {
        ui.updateDepsBadge(hasUpdate);
      }).catch(() => {
        ui.updateDepsBadge(false);
      });
    }
  } else {
    isInitialized = false;
    ui.setDepsGating(true);
    ui.updateDepsBadge(true);
  }
}
function initializeMainUI() {
  ui.showMainUI();
  ui.setupInputBar();
  const urlInput = document.getElementById("urlInput");
  if (urlInput)
    urlInput.focus();
}
function addToQueue(url) {
  if (!isInitialized)
    return;
  const item = {
    id: ++queueIdCounter,
    url,
    title: url,
    state: "waiting",
    progress: 0,
    speed: "",
    error: null
  };
  downloadQueue.push(item);
  ui.appendQueueItem(item);
  processQueue();
}
function processQueue() {
  while (activeCount < MAX_CONCURRENT) {
    const nextItem = downloadQueue.find((item) => item.state === "waiting");
    if (!nextItem)
      break;
    activeCount++;
    executeDownload(nextItem);
  }
}
async function executeDownload(item) {
  try {
    item.state = "preparing";
    ui.updateQueueItem(item.id, item);
    const videoInfo = await downloader.getVideoInfo(item.url);
    item.title = videoInfo.title || i18next2.t("error.untitledVideo");
    item.state = "downloading";
    ui.updateQueueItem(item.id, item);
    const results = await downloader.downloadVideo(
      item.url,
      (progress) => {
        item.progress = progress.percent || 0;
        item.speed = progress.currentSpeed || "";
        ui.updateQueueItem(item.id, item);
      },
      null,
      videoInfo
    );
    item.state = "completed";
    item.progress = 100;
    item.speed = "";
    ui.updateQueueItem(item.id, item);
    for (const result of results) {
      const sourceUrl = getAutoAddSourcePref() ? item.url : void 0;
      await importToEagle(result.path, result.metadata, sourceUrl);
      downloader.cleanup(result.path);
    }
  } catch (error) {
    item.state = "error";
    item.error = isNetworkError(error) ? i18next2.t("error.networkUnavailable") : error.message || i18next2.t("download.failed");
    ui.updateQueueItem(item.id, item);
  } finally {
    activeCount--;
    processQueue();
  }
}
function retryDownload(id) {
  const item = downloadQueue.find((item2) => item2.id === id);
  if (!item || item.state !== "error")
    return;
  item.state = "waiting";
  item.progress = 0;
  item.error = null;
  item.speed = "";
  ui.updateQueueItem(item.id, item);
  processQueue();
}
async function copyError(id) {
  const item = downloadQueue.find((item2) => item2.id === id);
  if (!item || !item.error)
    return;
  try {
    await navigator.clipboard.writeText(item.error);
    ui.showCopiedErrorFeedback(id);
  } catch (error) {
    console.error("Failed to copy error:", error);
  }
}
async function checkForUpdateAndNotify() {
  try {
    const { hasUpdate } = await getYtDlpUpdateInfo();
    ui.updateDepsBadge(hasUpdate || !depsReady());
  } catch (e) {
    ui.updateDepsBadge(!depsReady());
  }
}
function openDepsPage() {
  ui.showDepsPage({
    tab: "settings",
    cookieConsentPref: getCookieConsentPref(),
    autoAddSourcePref: getAutoAddSourcePref()
  });
  loadDepsInfo();
}
function closeDepsPage() {
  ui.hideDepsPage();
}
function loadDepsInfo(options = {}) {
  const ffmpegSource = getFfmpegSource();
  const ytdlpInstalled = isYtDlpInstalled();
  if (ffmpegSource === "eagle") {
    ui.updateFfmpegCard("eagle", {});
  } else {
    ui.updateFfmpegCard("missing", {});
  }
  if (!ytdlpInstalled) {
    ui.updateYtdlpCard("missing");
    return;
  }
  if (options.ytdlpKnownLatest) {
    ui.updateYtdlpCard("latest", { version: options.ytdlpKnownLatest });
  } else {
    loadYtdlpUpdateStatus();
  }
}
function loadYtdlpUpdateStatus() {
  ui.updateYtdlpCard("installed", { checkingUpdate: true });
  const latestVersion = getLatestYtDlpVersion();
  getInstalledYtDlpVersion().then((installedVersion) => {
    if (!installedVersion) {
      ui.updateYtdlpCard("missing");
      return;
    }
    if (installedVersion !== latestVersion) {
      ui.updateYtdlpCard("outdated", { installedVersion, latestVersion });
    } else {
      ui.updateYtdlpCard("latest", { version: installedVersion });
    }
  }).catch(() => {
  });
}
async function handleYtdlpAction(action) {
  if (action === "uninstall") {
    uninstallYtDlp();
    ui.updateYtdlpCard("missing");
    refreshDepsGatingState();
    return;
  }
  const statusKey = {
    install: "deps.installing",
    update: "deps.updating",
    reinstall: "deps.reinstalling"
  }[action] || "deps.updating";
  const doneKey = {
    install: "deps.doneInstalled",
    update: "deps.doneUpdated",
    reinstall: "deps.doneReinstalled"
  }[action] || "deps.doneInstalled";
  const statusText = i18next2.t(statusKey);
  ui.updateYtdlpCard("busy", { statusText, percent: 0 });
  try {
    await downloadYtDlp((progress) => {
      ui.updateYtdlpCard("busy", { statusText, percent: progress });
    });
    const version = await getInstalledYtDlpVersion();
    ui.updateYtdlpCard("done", { statusText: i18next2.t(doneKey), version });
    setTimeout(() => {
      loadDepsInfo({ ytdlpKnownLatest: version });
      refreshDepsGatingState();
    }, 1500);
  } catch (e) {
    const message = isNetworkError(e) ? i18next2.t("error.networkUnavailable") : e.message;
    ui.updateYtdlpCard("error", { message, retryAction: action });
  }
}
async function copyUrl(id) {
  const item = downloadQueue.find((item2) => item2.id === id);
  if (!item)
    return;
  try {
    await navigator.clipboard.writeText(item.url);
    ui.showCopiedFeedback(id);
  } catch (error) {
    console.error("Failed to copy URL:", error);
  }
}
module.exports = {};
