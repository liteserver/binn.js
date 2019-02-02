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
import { encode, decode } from 'binn.js';
// Or with require
const { encode, decode } = require('binn.js');
```

Encoding

```javascript
const obj = { hello: 'world', number: 123 };
const data = encode(obj);
```

Decoding

```javascript
const obj = decode(data);
```

Undefined
---------

The `undefined` value is enconded using the byte 0x03.

It is an extended type derived from the storage type NOBYTES.
