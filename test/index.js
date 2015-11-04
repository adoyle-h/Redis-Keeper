'use strict';

describe('#Keeper', function() {
    var should = require('should');
    var async = require('async');
    var util = require('../lib/util');
    var Keeper = require('../lib/Keeper');
    var Fakers = require('./fixtures/fakers');
    var client;
    var modelDefinitions = Fakers.modelDefinitions;
    var keeper;

    before(function(callback) {
        client = Fakers.createRedisClient();
        keeper = new Keeper({
            client: client,
        });
        client.flushall(function(err) {
            callback(err);
        });
    });

    it('the length of models which return by createModels(modelDefinitions) should equal the size of modelDefinitions', function() {
        var models = keeper.createModels(modelDefinitions);
        models.should.have.length(util.size(modelDefinitions));
    });

    it('keeper.models should equal the size of modelDefinitions', function() {
        util.size(keeper.models).should.equal(util.size(modelDefinitions));
    });

    it('keeper.Models should have these keys', function() {
        util.each([
            'STRING', 'HASH', 'LIST', 'SET', 'SORTED_SET'
        ], function(name) {
            should.exist(keeper.Models[name]);
        });
    });

    it('postModel.definitions should equal to modelDefinitions.post', function() {
        var post = keeper.model('post');
        post.definitions.should.equal(modelDefinitions.post);
    });



    it('test the generated key', function(callback) {
        var sample = keeper.model('sample').get('asd123');
        var key = 'sample:asd123';

        async.waterfall([
            function(callback) {
                client.exists(key, function(err, result) {
                    if (err) return callback(err);
                    result.should.equal(0);
                    callback();
                });
            },
            function(callback) {
                sample.set(1, function(err, result) {
                    if (err) return callback(err);
                    result.should.equal('OK');
                    callback();
                });
            },
            function(callback) {
                client.get(key, function(err, result) {
                    if (err) return callback(err);
                    result.should.equal('1');
                    callback();
                });
            },
            function(callback) {
                sample.get(function(err, result) {
                    if (err) return callback(err);
                    result.should.equal('1');
                    callback();
                });
            }
        ], function(err) {
            callback(err);
        });
    });

    it('test the generated complex key', function(callback) {
        var model = keeper.model('complexKey');
        var complexKey = model.get({
            a: 1,
            b: 'b',
            c: 3
        });

        var key = 'a:complex:key:1:b:3';

        async.waterfall([
            function(callback) {
                client.exists(key, function(err, result) {
                    if (err) return callback(err);
                    result.should.equal(0);
                    callback();
                });
            },
            function(callback) {
                complexKey.set(1, function(err, result) {
                    if (err) return callback(err);
                    result.should.equal('OK');
                    callback();
                });
            },
            function(callback) {
                client.get(key, function(err, result) {
                    if (err) return callback(err);
                    result.should.equal('1');
                    callback();
                });
            },
            function(callback) {
                complexKey.get(function(err, result) {
                    if (err) return callback(err);
                    result.should.equal('1');
                    callback();
                });
            }
        ], function(err) {
            callback(err);
        });
    });


    it('error should be delayed until callback', function(callback) {
        var sample = keeper.model('sample').get();
        var complex = keeper.model('complexKey').get({
            a: 1,
        });

        async.parallel([
            function(callback){
                sample.set(1, function(err) {
                    should.exist(err);
                    err.message.should.equal('the param should be a Number or String.');
                    callback();
                });
            },
            function(callback){
                complex.set(1, function(err) {
                    should.exist(err);
                    err.message.should.equal('the params do not match all the fields: a,b,c. Actual missing: b,c');
                    callback();
                });
            },
        ], function(err) {
            callback(err);
        });
    });



    it('test hset and hget', function(callback) {
        var post = keeper.model('post').get('1234');

        var field = 'c';
        var key = 'post:1234';
        var value = 'ccc';

        async.waterfall([
            function(callback) {
                post.hset(field, value, function(err, result) {
                    if (err) return callback(err);
                    result.should.equal(1);
                    callback();
                });
            },
            function(callback) {
                client.exists(key, function(err, result) {
                    if (err) return callback(err);
                    result.should.equal(1);
                    callback();
                });
            },
            function(callback) {
                post.hget(field, function(err, result) {
                    if (err) return callback(err);
                    result.should.equal(value);
                    callback();
                });
            }
        ], function(err) {
            callback(err);
        });
    });

    it('set redis client after new Keeper() && test set and get', function(callback) {
        var keeper2 = new Keeper();
        keeper2.setClient(client);
        keeper2.createModels(modelDefinitions);

        var string = keeper2.model('string').get();

        async.waterfall([
            function(callback) {
                string.set(1, function(err, result) {
                    if (err) return callback(err);
                    result.should.equal('OK');
                    callback();
                });
            },
            function(callback) {
                string.get(function(err, result) {
                    if (err) return callback(err);
                    result.should.equal('1');
                    callback();
                });
            }
        ], function(err) {
            callback(err);
        });
    });
});
