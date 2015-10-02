'use strict';

/**
 * Lazily required module dependencies
 */

var lazy = require('lazy-cache')(require);
var fn = require;

require = lazy;
require('falsey', 'isFalsey');
require('is-buffer', 'isBuffer');
require('delimiter-regex', 'delims');
require = fn;

/**
 * Expose `utils`
 */

module.exports = lazy;
