'use strict';

var should = require('should');

describe('#Airdromes', function() {
    var util = require('../lib/util');
    var Airdromes = require('../lib/Airdromes');
    var Fakers = require('./fixtures/fakers');
    var client = Fakers.redisClient;
    var modelDefinitions = Fakers.modelDefinitions;
    var airdromes;

    before(function() {
        airdromes = new Airdromes({
            client: client,
        });
    });

    it('createModels(modelDefinitions) should return three models', function() {
        var models = airdromes.createModels(modelDefinitions);
        models.should.have.length(3);
    });

    it('airdromes.models should have three models', function() {
        util.size(airdromes.models).should.equal(3);
    });

    it('airdromes.Models should have these keys', function() {
        util.each([
            'STRING', 'HASH', 'LIST', 'SET', 'SORTED_SET'
        ], function(name) {
            should.exist(airdromes.Models[name]);
        });
    });

    it('airdromes.models should have three models', function(callback) {
        var post = airdromes.model('post').get('1234');
        post.hset('c', 1, function(err, result) {
            result.should.equal(0);
            callback(err);
        });
    });

    it('postModel.definitions should equal to modelDefinitions.post', function() {
        var post = airdromes.model('post');
        post.definitions.should.equal(modelDefinitions.post);
    });
});
