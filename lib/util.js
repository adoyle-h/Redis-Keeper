'use strict';

var util = require('lodash');

util.mixin(util.pick(require('util'), [
    'format', 'inspect', 'inherits', 'isError',
]));

module.exports = util;
