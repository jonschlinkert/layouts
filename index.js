/*!
 * layouts <https://github.com/jonschlinkert/layouts>
 *
 * Copyright (c) 2014 Jon Schlinkert, contributors
 * Licensed under the MIT License (MIT)
 */

'use strict';

var debug = require('debug')('layouts');
var isFalsey = require('falsey');
var loader = require('load-templates');
var isObject = require('is-plain-object');
var reduce = require('reduce-object');
var omit = require('omit-keys');
var pick = require('object-pick');
var merge = require('mixin-deep');
var Delims = require('delims');
var delims = new Delims();

var _ = require('lodash');


/**
 * Create a new instance of `Layouts`, optionally passing the default
 * `cache` and `options` to use.
 *
 * **Example:**
 *
 * ```js
 * var Layouts = require('layouts');
 * var layouts = new Layouts();
 * ```
 *
 * @param {Object} `cache` A template cache. See [Layouts#set](#set) for object details.
 * @param {Object} `options` Options to use.
 * @param {Array} `options.delims` Template delimiters to use formatted as an array (`['<%=, '%>']`)
 * @param {String} `options.tag` The tag name to use. Default is `body` (e.g. `<%= body %>`)
 */

function Layouts(options) {
  this.options = options || {};
  this.cache = this.options.cache || {};
  this.defaultOptions(this.options);
}


/**
 * Initialize default options.
 *
 * @api private
 */

Layouts.prototype.defaultOptions = function () {
  this.option('locals', {});
  this.option('omitKeys', ['mergeFn', 'content', 'delims', 'layout']);
  this.option('mergeFn', merge);

  // Define default layout delimiters
  this.option('layoutDelims', ['{%=','%}']);

  // Define the default `{%= body %}` tag
  this.option('defaultTag', {delims: ['{%=', '%}'], tag: 'body'});
};


/**
 * Set or get an option.
 *
 * ```js
 * layout.option('a', true)
 * layout.option('a')
 * // => true
 * ```
 *
 * @param {String} `key` The option name.
 * @param {*} `value` The value to set.
 * @return {*|Object} Returns `value` if `key` is supplied, or `Options` for chaining when an option is set.
 * @api public
 */

Layouts.prototype.option = function(key, value) {
  var args = [].slice.call(arguments);

  if (args.length === 1 && typeof key === 'string') {
    debug('getting option: %s', key);
    return this.options[key];
  }

  if (isObject(key)) {
    merge.apply(merge, [this.options].concat(args));
    return this;
  }

  debug('setting option: %s, %j', key, value);
  this.options[key] = value;
  return this;
};


/**
 * Generate the default body tag to use as a fallback, based on the
 * `tag` and `delims` defined in the options.
 *
 * @param  {Object} options
 * @return {String} The actual body tag, e.g. `<%= body %>`
 * @api private
 */

Layouts.prototype.makeTag = function (options) {
  debug('making tag: %j', arguments);

  var defaultTag = this.option('defaultTag');
  var opts = merge({}, defaultTag, options);

  opts.delims = opts.delims || ['{%=', '%}'];
  opts.tag = opts.tag || 'body';

  return [
    opts.delims[0],
    opts.tag,
    opts.delims[1]
  ].join(opts.sep || ' ');
};


/**
 * Return a regular expression for the "body" tag based on the
 * `tag` and `delims` defined in the options.
 *
 * @param  {Object} `options`
 * @return {RegExp}
 * @api private
 */

Layouts.prototype.makeRegex = function (options) {
  debug('making regex: %j', arguments);
  var opts = merge({sep: '\\s*'}, this.options, options);
  var tag = this.makeTag(opts).replace(/[\]()[{|}]/g, '\\$&');
  return new RegExp(tag, opts.flags || 'g');
};


/**
 * Initilize [load-templates] with the given options.
 *
 * @param  {Object} `options`
 * @return {RegExp}
 * @api private
 */

Layouts.prototype.load = function (options) {
  debug('loading: %j', arguments);
  var opts = merge({}, this.options, options);
  return loader(opts);
};


/**
 * Store a template on the cache by its `name`, the `layout` to use,
 * and the template's `content.
 *
 * **Example:**
 *
 * ```js
 * layouts.setLayout('a', 'b', '<h1>Foo</h1>\n<%= body %>\n');
 * ```
 *
 * @param {String|Object} `name` If `name` is a string, `layout` and `content` are required.
 * @param {String|Object} `data` Pass a string defining the name of layout to use for the given
 *                               template, or pass an object with a `layout` property.
 * @param {String} `content` The template "content", this will not be compiled or rendered.
 * @api public
 */

Layouts.prototype.setLayout = function (name, data, content) {
  debug('setting layout: %j', arguments);

  var template = this.load().apply(this, arguments);
  reduce(template, function(acc, value, key) {
    var layout = this.pickLayout(value, key);
    debug('picking layout: %s', layout);

    if (layout) value.layout = layout;
    acc[key] = value;
    return acc;
  }.bind(this), {});

  merge(this.cache, template);
  return this;
};


/**
 * Get a cached template by `name`.
 *
 * **Example:**
 *
 * ```js
 * layouts.getLayout('a');
 * //=> { layout: 'b', content: '<h1>Foo</h1>\n<%= body %>\n' }
 * ```
 *
 * @param  {String} `name`
 * @return {Object} The template object to return.
 * @api public
 */

Layouts.prototype.pickLayout = function (value, key) {
  if (key === 'layout') return value;

  if (isObject(value)) {
    if (hasOwn(value, 'options')
      && hasOwn(value.options, 'layout')) {
      return value.options.layout;
    }
    if (hasOwn(value, 'locals')
      && hasOwn(value.locals, 'layout')) {
      return value.locals.layout;
    }
  }
  return null;
};


/**
 * Get a cached template by `name`.
 *
 * **Example:**
 *
 * ```js
 * layouts.getLayout('a');
 * //=> { layout: 'b', content: '<h1>Foo</h1>\n<%= body %>\n' }
 * ```
 *
 * @param  {String} `name`
 * @return {Object} The template object to return.
 * @api public
 */

Layouts.prototype.getLayout = function (key) {
  debug('getting layout: %j', key);
  if (!key) return this.cache;
  return this.cache[key];
};


/**
 * Define the default layout variable and delimiters to be used.
 *
 * @api private
 */

Layouts.prototype._defaultLayout = function (context, options) {
  debug('default layout settings: %j', arguments);

  var tagopts = this.option('defaultTag');
  options = merge({}, options);

  if (hasOwn(options, 'delims') && hasOwn(options, 'tag')) {
    tagopts = pick(options, ['delims', 'tag']);
  }

  var settings = delims.templates(tagopts.delims);
  var tag = this.makeTag(tagopts);

  merge(settings, options, {interpolate: settings.evaluate});
  return {variable: tag, context: options, settings: settings};
};


/**
 * Assert whether or not a layout should be used based on
 * the given `value`. If a layout should be used, the name of the
 * layout is returned, if not `null` is returned.
 *
 * @param  {*} `value`
 * @return {String|Null} Returns `true` or `null`.
 * @api private
 */

Layouts.prototype.assertLayout = function (value, defaultLayout) {
  debug('asserting layout: %j', arguments);
  if (value === false || (value && isFalsey(value))) {
    return null;
  } else if (!value || value === true) {
    return defaultLayout || null;
  } else {
    return value;
  }
};


/**
 * Build a layout stack.
 *
 * @param  {String} `name` The name of the layout to add to the stack.
 * @param  {Object} `options` Options to pass to `assertLayout`.
 * @return {Array}
 * @api private
 */

Layouts.prototype.createStack = function (name, options) {
  debug('creating stack for: %s', name);

  var opts = merge({}, this.options, options);
  name = this.assertLayout(name, this.option('defaultLayout'));

  var template = {};
  var stack = [];
  var prev = null;

  while (name && (prev !== name) && (template = this.cache[name])) {
    stack.unshift(name);
    prev = name;
    var layout = template.layout || (template.data && template.data.layout);
    name = this.assertLayout(layout, opts.defaultLayout);
  }

  return stack;
};


/**
 * Reduce a layout stack for a template into a single flattened
 * layout. Pass the `name` of the layout defined for the template
 * (e.g. the first layout in the stack).
 *
 * **Example:**
 *
 * ```js
 * layouts.stack('base');
 * ```
 *
 * @param  {String} `name` The layout to start with.
 * @param  {Object} `options`
 * @return {Array} The template's layout stack is returned as an array.
 * @api public
 */

Layouts.prototype.stack = function (name, options) {
  debug('stack: %s:', name);

  var stack = this.createStack(name, options);
  var opts = merge(this.options, options);

  var tag = this.makeTag(opts) || this.defaultTag;
  this.regex = this.makeRegex(opts);

  return reduce(stack, function (acc, value) {
    debug('reducing stack: %j:', acc);

    var content = acc.content || tag;
    var tmpl = this.cache[value];

    var data = this._mergeData(tmpl);
    content = content.replace(this.regex, tmpl.content);
    content = this.renderLayout(content, data, opts);

    acc.data = data;
    acc.content = content;
    acc.regex = this.regex;
    acc.tag = tag;
    return acc;
  }.bind(this), {});
};


/**
 * Replace a `<%= body %>` tag with the given `str`. Custom delimiters
 * and/or variable may be passed on the `options`. Unlike `renderLayout`,
 * this method does not render templates, it only peforms a basic regex
 * replacement.
 *
 * **Example:**
 *
 * ```js
 * layouts.replaceTag('ABC', 'Before <%= body %> After');
 * //=> 'Before ABC After'
 * ```
 *
 * @param  {String} `str` The string to use as a replacement value.
 * @param  {String} `content` A string with a `<%= body %>` tag where the `str` should be injected.
 * @return {String} Resulting flattened content.
 * @api public
 */

Layouts.prototype.replaceTag = function (str, content, options) {
  return content.replace(this.makeRegex(options), str);
};


/**
 * Render a layout using Lo-Dash, by passing content (`str`), `context`
 * and `options`.
 *
 * **Example:**
 *
 * ```js
 * layouts.renderLayout(str, context, options);
 * ```
 *
 * Since this method uses Lo-Dash to process templates custom delimiters
 * may be passed on the `options.delims` property. This allows layouts to
 * be rendered prior to injecting "pages" or other str with templates that
 * _should not_ be rendered when the layout stack is processed.
 *
 * **Example:**
 *
 * ```js
 * layouts.renderLayout(str, context, {
 *   delims: ['<%','%>']
 * });
 * ```
 *
 * @param  {String} `str` Content for the layout to render.
 * @param  {Object} `options` Additional options used for building the render settings.
 * @return {String} Rendered string.
 * @api public
 */

Layouts.prototype.renderLayout = function (str, context, options) {
  debug('rendering layout: %j:', arguments);

  var layout = this._defaultLayout(context, options);
  var ctx = merge({}, context, this.option('locals'), {
    body: layout.variable
  });

  return _.template(str, ctx, layout.settings);
};


/**
 * Return an object with the string (`str`) and `data` required
 * to build a final layout. This is useful if you need to use
 * your own template engine to handle this final step.
 *
 * **Example:**
 *
 * ```js
 * var page = layouts.render(str, 'base');
 * var tmpl = _.template(page, context);
 * ```
 *
 * @param  {String} `str` The string to be injected into the layout. Usually a page, or inner layout, etc.
 * @param  {String} `name` The name of the first layout to use to build the stack.
 * @return {Object} Resulting flattened layout.
 * @api public
 */

Layouts.prototype.render = function (content, name, options) {
  debug('rendering: %j:', arguments);

  var layout = this.stack(name, options);
  if (layout.content) {
    content = layout.content.replace(this.regex, content);
  }

  return {data: layout.data, content: content};
};


/**
 * Extend `data` with the given `obj. A custom `mergeFn` can be
 * passed on `options.merge` to change how data is merged.
 *
 * @param  {Object} `opts` Pass an options object with `data` or `locals`
 * @return {Object} `template` A `template` to with `data` to be merged.
 * @api private
 */

Layouts.prototype._mergeData = function (template) {
  debug('merging data: %j:', arguments);

  var omitKeys = this.option('omitKeys');
  var mergeFn = this.option('mergeFn');
  var locals = this.option('locals');
  var data = {};

  // build up the `data` object
  merge(data, template.locals);
  merge(data, template.data);

  // Extend the context
  mergeFn(locals, omit(data, omitKeys));
  return this;
};


/**
 * Get the native `typeof` a value.
 *
 * @api private
 */

function typeOf(val) {
  return {}.toString.call(val).toLowerCase()
    .replace(/\[object ([\S]+)\]/, '$1');
}

function hasOwn(o, prop) {
  return {}.hasOwnProperty.call(o, prop);
}

/**
 * Expose `Layouts`
 */

module.exports = Layouts;
