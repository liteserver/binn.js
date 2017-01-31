binn.js
=======
[![Build Status](https://travis-ci.org/liteserver/binn.js.svg?branch=master)](https://travis-ci.org/liteserver/binn.js)
[![Deps](https://img.shields.io/badge/dependencies-none-brightgreen.svg)]()

Binary serialization using the Binn format.

This module implements a Binn encoder and decoder in pure javascript.

You can check the specs [here](https://github.com/liteserver/binn/blob/master/spec.md).


Usage
-----

Header

```javascript
var binn = require('binn.js');
```

Encoding

```javascript
var obj = {hello: 'world', number: 123};
var data = binn.encode(obj);
```

Decoding

```javascript
var obj = binn.decode(data);
```
