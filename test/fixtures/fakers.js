'use strict';

var Keeper = require('../../lib/keeper');
var util = require('../../lib/util');
var IORedis = require('ioredis');
var config = require('../config');

var TYPES = Keeper.MODEL_TYPES;

exports.modelDefinitions = {
    string: {
        type: TYPES.STRING,
        key: 'this:is:a:string'
    },
    list: {
        type: TYPES.LIST,
        key: 'this:is:a:list',
    },
    set: {
        type: TYPES.SET,
        key: 'this:is:a:set',
    },
    sortedSet: {
        type: TYPES.SORTED_SET,
        key: 'this:is:a:list',
    },
    post: {
        type: TYPES.HASH,
        key: 'post:{postId}',
        fields: {
            count: {
                like: 'like:count',
                comment: 'comments:count',
            }
        },
    },
    postCommentsIndex: {
        type: TYPES.STRING,
        key: 'post:{postId}:comments:index',
        disabledCommands: ['decr'],
    },
    postCommentsCount: {
        type: TYPES.STRING,
        key: 'post:{postId}:comments:count',
    },
    sample: {
        type: TYPES.STRING,
        key: 'sample:{sampleId}'
    },
    complexKey: {
        type: TYPES.STRING,
        key: 'a:complex:key:{a}:{b}:{c}'
    },
};

function createRedisClient() {
    var redisClient = new IORedis({
        host: config.get('redis.host'),
        port: config.get('redis.port'),
        family: 4, // 4 (IPv4) or 6 (IPv6)
        password: config.get('redis.password'),
        db: config.get('redis.db'),
        connectTimeout: config.get('redis.connectTimeout'),
        retryStrategy: function (times) {
            var delay = Math.min(times * 2000, 10000);
            return delay;
        },
    });

    redisClient.on('connect', function() {
        console.log('Redis client was connected');
    });

    redisClient.on('error', function(err) {
        console.error(err, 'Occurred an error in redis client');
    });

    redisClient.on('close', function() {
        console.log('Redis client was closed');
    });

    redisClient.on('reconnecting', function(time) {
        console.log('Redis client will reconnect after %s ms', time);
    });

    return redisClient;
}

exports.createRedisClient = createRedisClient;