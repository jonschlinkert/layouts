# layouts [![NPM version](https://badge.fury.io/js/layouts.svg)](http://badge.fury.io/js/layouts)

> Wrap templates with layouts. Layouts can be nested and optionally use other layouts.

## Install
### Install with [npm](npmjs.org)

```bash
npm i layouts --save
```

## Usage

```js
var layouts = require('layouts');
```

## API

**Heads up!** Although most of the examples use `<%= foo %>` syntax for delimiters, you can change these to be whatever you need.

## [.layouts](index.js#L43)

Given an object of `layouts`, and the `name` of a starting layout:

* `str` **{String}**: The content string that should be wrapped with a layout.    
* `name` **{String}**: The name of the layout to use.    
* `layout{s}` **{Object}**: Object of layouts. `name` should be a key on this object.    
* `options` **{Object}**  
    - `delims` **{Object}**: Custom delimiters to use.
    - `defaultLayout` **{Object}**: Default layout to use.
      
* `returns` **{String}**: Returns the original string, wrapped with a layout, or layout stack.  

  1. build a layout stack (array of layouts) for the given `string`, then
  1. iterate over the stack, wrapping each layout in the stack around the string
  1. return the string with layouts applied

**Example**

```js
layouts('<div>This is content</div>', 'base', {base: {content: 'base above\n{% body %}\nbase below'}});
```

Results in:

```html
base above
<div>This is content</div>
base below
```

## Author

**Jon Schlinkert**
 
+ [github/jonschlinkert](https://github.com/jonschlinkert)
+ [twitter/jonschlinkert](http://twitter.com/jonschlinkert) 

## License
Copyright (c) 2014 Jon Schlinkert  
Released under the MIT license

***

_This file was generated by [verb](https://github.com/assemble/verb) on November 17, 2014._