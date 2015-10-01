'use strict';

module.exports = {
    redis: {
        partition: 'h', // each key is named begin with '<partition value>:'
        host: '0.0.0.0', // Don't use 'localhost' or '127.0.0.1' for the host. Those won't work.
        port: 6379,
        password: '',
        db: 0,
        connectTimeout: 10 * 1000, // millisecond
    },
};