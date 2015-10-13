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
 * @throw  {Error}
 * @return {String} key
 * @method generateKey
 */
RModel.prototype.generateKey = function(params) {
    var model = this;
    var key;
    var arr;
    var fields = model.fields;
    var splited = model.splited;
    var length = fields.length;

    if (length === 0) return model.key;

    if (length === 1 && util.isObject(params) === false) {
        if (!params) {
            throw new Error('the params cannot be empty');
        }
        arr = [splited[0], params, splited[1]];
        key = arr.join('');
    } else {
        var _params;
        var p;
        if (util.isArray(params) === false) {
            _params = params;
            params = [];
            util.each(_params, function(field) {
                p = params[field];
                if (p) params.push(p);
            });
        }

        if (params.length !== fields.length) {
            throw new Error('the params do not match all the fields: ' + fields.toString() + '. params: ' + JSON.stringify(params));
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

    return key;
};

/**
 * alias for getting the key
 */
RModel.prototype.getKey = function(params) {
    return this.generateKey(params);
};

// RModel.prototype.create = function(params) {
//     var model = this;
//     var key = model.getKey(params);
//     var args = util.toArray(arguments).slice(1).push(key);
//     model._create(args);
// };

// RModel.prototype.remove = function(params, callback) {
//     var model = this;
//     var key = model.getKey(params);
//     redis.del(key, callback);
// };

RModel.prototype.commands = [
    'del', 'dump', 'exists', 'expire', 'expireat', 'keys', 'migrate',
    'move', 'object', 'persist', 'pexpire', 'pexpireat', 'pttl', 'randomkey',
    'rename', 'renamenx', 'restore', 'get', 'ttl', 'type'
];

function getProxy(params) {
    var model = this;
    var key = model.generateKey(params);
    var proxy = new this.Proxy(key);
    proxy.client = model.client;
    return proxy;
}
RModel.prototype.get = getProxy;
RModel.prototype.getProxy = getProxy;

function wrapProxyCommand(command) {
    return function() {
        var proxy = this;
        var args = util.toArray(arguments);
        args.unshift(proxy.key);
        proxy.client[command].apply(proxy.client, args);
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
        Proxy.prototype[command] = wrapProxyCommand(command);
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
