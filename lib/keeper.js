'use strict';

var util = require('./util');
var RModel = require('./model');


var MODEL_TYPES = {};   // MODEL_TYPE will be added by Keeper.defineModelClass()
var Models = {};        // this will be added by Keeper.defineModelClass()

/**
 * Keeper Class
 *
 * @param  {Object} params
 * @param  {Object} params.client  a redis client
 * @method Keeper
 */
function Keeper(params) {
    var keeper = this;

    keeper.client = params.client;
    keeper.models = {};        // this will be added by Keeper.createModel()
}

module.exports = Keeper;

Keeper.MODEL_TYPES = Keeper.prototype.MODEL_TYPES = MODEL_TYPES;
Keeper.Models = Keeper.prototype.Models = Models;

/**
 * get a model instance according to the specific name
 *
 * @param  {String}  name  the name of model instance
 * @return {RModel}  the instance
 * @method getModel
 */
function getModel(name) {
    return this.models[name];
}
Keeper.prototype.getModel = getModel;
Keeper.prototype.model = getModel;

/**
 * get a Model Class according to the specific name
 *
 * @param  {String} name  the name of model class
 * @return {Class}  a model class
 * @method Model
 */
function getModelClass(name) {
    return Models[name];
}
Keeper.prototype.Model = getModelClass;
Keeper.prototype.getModelClass = getModelClass;


/**
 * create the instance of Model
 *
 * The model instance will has these properties as below:
 * - client: point to redis client
 * - Proxy: a proxy class
 * - definitions: the origin definitions of model from `RModel(definitions)`
 * - commands: what commands can be called in a proxy instance
 * - splited: private property. a splited array from key
 * - fields: private property. the fields in key template
 * - key: the key from `definitions.key`
 * - allowedCommands: the key from `definitions.allowedCommands`
 * - disabledCommands: the key from `definitions.disabledCommands`
 *
 *
 * @param  {String} name  instance's name
 * @param  {Object} definitions  specify the key and other properties
 * @param  {MODEL_TYPE} definitions.type  refer to keeper.MODEL_TYPES
 * @param  {String} definitions.key  a raw key or a key template
 * @param  {...} definitions.<other-custom-things>
 * @return {RModel} the instance of Model
 * @method createModel
 */
Keeper.prototype.createModel = function(name, definitions) {
    var keeper = this;
    var Model = keeper.Models[definitions.type];

    if (keeper.models[name]) {
        throw new Error('redis model has been loaded. name=' + name);
    }

    if (!Model) {
        throw new Error('model type is invalid. name=' + name + ', type=' + definitions.type);
    }

    var model = new Model(definitions);
    model.client = keeper.client;

    keeper.models[name] = model;

    return model;
};

/**
 * see createModel(name, definitions)
 *
 * @param  {Array<Object>}  params  Object like that: {<name>: <definitions>}
 * @return {Array<RModel>}
 * @method createModels
 */
Keeper.prototype.createModels = function(params) {
    var keeper = this;
    return util.map(params, function(definition, name) {
        return keeper.createModel(name, definition);
    });
};

/**
 * define a RModel SubClass
 *
 * @param  {Object} definitions
 * @param  {String} definitions.type  the type of redis model, like 'SET'\'STRING'
 * @param  {Array<String>} definitions.commands  an set of commands which the proxy of model could use default
 * @param  {Function} definitions.customizeProxy  customize your Proxy class
 * @return {Class} a model class
 * @method defineModelClass
 */
function defineModelClass(definitions) {
    var type = util.snakeCase(definitions.type).toUpperCase();

    var Model = function() {
        Model.super_.apply(this, arguments);
    };
    util.inherits(Model, RModel);

    var commands = Model.super_.prototype.commands.concat(definitions.commands);

    util.extend(Model.prototype, {
        type: type,
        commands: commands,
    });

    if (definitions.customizeProxy) Model.prototype.customizeProxy = definitions.customizeProxy;

    MODEL_TYPES[type] = type;
    Models[type] = Model;

    return Model;
}

/**
 * define a bunch of RModel SubClass
 *
 * see defineModelClass(definition)
 *
 * @param  {Array<Object>} arr  an array of definitions.
 * @return {Array<Class>}  an array of model classes
 * @method defineModelClasses
 */
function defineModelClasses(arr) {
    return util.map(arr, defineModelClass);
}

Keeper.prototype.defineModelClass = defineModelClass;
Keeper.prototype.defineModelClasses = defineModelClasses;

// redis build-in Models
defineModelClasses([{
    type: 'STRING',
    commands: [
        'append', 'bitcount', 'bitop', 'decr', 'decrby', 'get', 'getbit',
        'getrange', 'getset', 'incr', 'incrby', 'incrbyfloat', 'mget', 'mset',
        'msetnx', 'psetex', 'set', 'setbit', 'setex', 'setnx', 'setrange',
        'strlen',
    ],
}, {
    type: 'HASH',
    commands: [
        'hdel', 'hexists', 'hget', 'hgetall', 'hincrby', 'hincrbyfloat',
        'hkeys', 'hlen', 'hmget', 'hmset', 'hset', 'hsetnx', 'hvals',
    ],
    customizeProxy: function(Proxy) {
        var model = this;
        var fields = model.definitions.fields;
        if (fields) {
            Proxy.fields = fields;
            Proxy.prototype.fields = fields;
        }
    },
}, {
    type: 'LIST',
    commands: [
        'blpop', 'brpop', 'brpoplpush', 'lindex', 'linsert', 'llen', 'lpop',
        'lpush', 'lpushx', 'lrange', 'lrem', 'lset', 'ltrim', 'rpop',
        'rpoplpush', 'rpush', 'rpushx',
    ],
}, {
    type: 'SET',
    commands: [
        'sadd', 'scard', 'sdiff', 'sdiffstore', 'sinter', 'sinterstore',
        'sismember', 'smembers', 'smove', 'spop', 'srandmember', 'srem',
        'sunion', 'sunionstore',
    ],
}, {
    type: 'SORTED_SET',
    commands: [
        'zadd', 'zcard', 'zcount', 'zincrby', 'zinterstore', 'zrange',
        'zrangebyscore', 'zrank', 'zrem', 'zremrangebyrank', 'zremrangebyscore',
        'zrevrange', 'zrevrangebyscore', 'zrevrank', 'zscore', 'zunionstore',
    ],
}]);

module.exports = Keeper;
