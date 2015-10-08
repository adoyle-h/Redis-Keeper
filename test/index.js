'use strict';

var should = require('should');

describe('#Keeper', function() {
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

    it('createModels(modelDefinitions) should return three models', function() {
        var models = keeper.createModels(modelDefinitions);
        models.should.have.length(3);
    });

    it('keeper.models should have three models', function() {
        util.size(keeper.models).should.equal(3);
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
});
