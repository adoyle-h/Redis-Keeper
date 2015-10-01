'use strict';

var Airdromes = require('../../lib/Airdromes');
var util = require('../../lib/util');
var IORedis = require('ioredis');
var config = require('../config');

var TYPES = Airdromes.MODEL_TYPES;

exports.modelDefinitions = {
    post: {
        type: TYPES.HASH,
        key: 'post:{postId}',
        fileds: {
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
};

function createClient() {
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

exports.redisClient = createClient();