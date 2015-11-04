'use strict';

describe('#Keeper', function() {
    var should = require('should');
    var async = require('async');
    var util = require('../lib/util');
    var Keeper = require('../lib/Keeper');
    var Fakers = require('./fixtures/fakers');
    var client = Fakers.redisClient;
    var modelDefinitions = Fakers.modelDefinitions;
    var keeper;

    before(function() {
        keeper = new Keeper({
            client: client,
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

    it('keeper.models should have three models', function(callback) {
        var post = keeper.model('post').get('1234');
        post.hset('c', 1, function(err, result) {
            result.should.equal(0);
            callback(err);
        });
    });

    it('postModel.definitions should equal to modelDefinitions.post', function() {
        var post = keeper.model('post');
        post.definitions.should.equal(modelDefinitions.post);
    });

    it('set redis client after new Keeper()', function(callback) {
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
