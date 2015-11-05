'use strict';

var util = require('./util');

/**
 * Redis Model Base Class
 *
 * the `definitions.key` could be a raw key or a key template.
 *
 * key template, such as "post:{postId}:comments", "post:{postId}:comments:{commentId}" etc.
 * the variable wrapped with braces (like postId) will be replaced with real params
 * when `RModel.prototype.get(params)` is called.
 *
 * @param  {Object} definitions  your origin definitions could be saved into `this.definitions`
 * @param  {String} definitions.key  key template
 * @param  {Array<String>} definitions.allowedCommands
 * @param  {Array<String>} definitions.disabledCommands
 * @method RModel
 */
function RModel(definitions) {
    var model = this;
    var key = definitions.key;
    var allowedCommands = definitions.allowedCommands;
    var disabledCommands = definitions.disabledCommands;
    var r = /\{\w+\}/g;

    var commands = model.commands || [];

    if (allowedCommands) {
        commands = util.intersection(commands, allowedCommands);
    }

    if (disabledCommands) {
        commands = util.difference(commands, disabledCommands);
    }

    var splited = key.split(r);
    var fields = util.map(key.match(r), function(field) {
        return field.slice(1, -1);
    });

    model.definitions = definitions;
    model.commands = commands;
    model.splited = splited;
    model.fields = fields;
    model.key = key;
    model.allowedCommands = allowedCommands;
    model.disabledCommands = disabledCommands;
    model.Proxy = model.defineProxy();  // this line should be last
}

module.exports = RModel;

RModel.prototype.type = 'GENERIC';

function checkParamType(param) {
    return (util.isNumber(param) || util.isString(param));
}

/**
 * generate key
 *
 * when params is an object, its keys must equal to the key template of the model.
 * e.g.
 * key template: "post:{postId}:comments:{commentId}"
 * params: { postId: "1", commentId: 2 }
 * return: "post:1:comments:2"
 *
 * or params could be an array, the values should be filled in order.
 * e.g.
 * key template: "post:{postId}:comments:{commentId}"
 * params: ["1", 2]
 * return: "post:1:comments:2"
 *
 * or params could be a number or string.
 * e.g.
 * key template: "post:{postId}"
 * params: [1]
 * return: "post:1"
 *
 *
 * when `model.key` is a raw key, such as "post:comments", params could be empty or anything else. It just return the raw key.
 *
 * @param  {Null|Number|String|Array|Object} params
 * @return {Object} {key, error}
 * @method generateKey
 */
function generateKey(params) {
    var model = this;
    var key;
    var arr = [];
    var fields = model.fields;
    var splited = model.splited;
    var length = fields.length;

    if (length === 0) return {key: model.key};

    if (length === 1) {
        if (checkParamType(params) === false) {
            return {error: new Error('the param should be a Number or String.')};
        }
        arr = [splited[0], params, splited[1]];
        key = arr.join('');
    } else {
        var _params = params;
        if (util.isArray(params) === false) {
            if (util.isObject(params) === false) {
                return {error: new Error('params should be an Array or Object.')};
            }

            params = [];
            _params = util.reduce(fields, function(obj, f) {
                var p = _params[f];
                if (checkParamType(p)) {
                    obj[f] = p;
                    params.push(p);
                }
                return obj;
            }, {});
        }

        if (params.length !== fields.length) {
            var missing = util.difference(fields, util.keys(_params));
            var message = 'the params do not match all the fields: ' + fields.toString() + '. Actual missing: ' + missing.toString();
            return {error: new Error(message)};
        }

        var len = splited.length + params.length;

        for (var i = 0; i < len; i++) {
            if (i % 2 === 0) {
                arr.push(splited[i/2]);
            } else {
                arr.push(params[(i-1)/2]);
            }
        }

        key = arr.join('');
    }

    return {key: key};
}

/**
 * getting the key, alias for generateKey
 *
 * if error happened, throw this error
 *
 * @throw  {Error}
 * @return {String} key
 * @method getKey
 */
RModel.prototype.getKey = function(params) {
    var result = generateKey.call(this, params);
    if (result.error) throw result.error;
    return result.key;
};

RModel.prototype.commands = [
    'del', 'dump', 'exists', 'expire', 'expireat', 'keys', 'migrate',
    'move', 'object', 'persist', 'pexpire', 'pexpireat', 'pttl', 'randomkey',
    'rename', 'renamenx', 'restore', 'get', 'ttl', 'type'
];

function getProxy(params) {
    var model = this;
    var result = generateKey.call(model, params);
    var key = result.key || '';
    var proxy = new model.Proxy(key);
    if (result.error) {
        proxy._error = result.error;
    }

    return proxy;
}
RModel.prototype.get = getProxy;
RModel.prototype.getProxy = getProxy;

RModel.prototype.setClient = function(client) {
    var model = this;
    model.client = client;
    model.Proxy.prototype.client = client;
};

function wrapProxyCommand(command) {
    return function() {
        var proxy = this;
        var args;
        var callback;
        if (!proxy._error) {
            args = util.toArray(arguments);
            args.unshift(proxy.key);
            proxy.client[command].apply(proxy.client, args);
        } else {
            callback = util.last(arguments);
            callback(proxy._error);
        }

        return proxy;
    };
}

/**
 * define a proxy class
 *
 * The Proxy is a wrapper for redis client. It has these properties as below:
 * - key: used in redis command
 * - model: point to the related model
 * - <redis-commands-in-lower-case>: these commands are different based on which type of model used
 *
 * @return {Class}  proxy class
 * @method defineProxy
 */
RModel.prototype.defineProxy = function() {
    var model = this;

    function Proxy(key) {
        var proxy = this;
        proxy.key = key;
    }

    Proxy.prototype.model = model;
    util.each(model.commands, function(command) {
        var func = wrapProxyCommand(command);
        Proxy.prototype[command] = func;
        Proxy.prototype[command.toUpperCase()] = func;
    });

    model.customizeProxy(Proxy);

    return Proxy;
};


/**
 * This is a interface.
 * Override this function to custom Proxy class for your business environment
 *
 * @param  {Class}  Proxy  you must modify this object for custom
 * @return {Class}  the same Proxy class
 * @method customizeProxy
 */
RModel.prototype.customizeProxy = function(Proxy) {
    return Proxy;
};
