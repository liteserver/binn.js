"use strict";

// modified BufferBuilder

function BufferBuilder(initialCapacity) {
  var buffer = Buffer.isBuffer(initialCapacity) ? initialCapacity : new Buffer(initialCapacity || 512);
  this.buffers = [buffer];

  this.writeIndex = 0;
  this.length = 0;
}

/* Append a Buffer */
BufferBuilder.prototype.appendBuffer = function(source) {
  if (source.length === 0) return this;

  /* slice the tail buffer */
  var tail = this.buffers[this.buffers.length-1];
  this.buffers[this.buffers.length-1] = tail.slice(0, this.writeIndex);

  /* add the new buffer */
  this.buffers.push(source);
  this.writeIndex = source.length;
  this.length += source.length;

  return this;
};

/* Prepend a Buffer */
BufferBuilder.prototype.prependBuffer = function(source) {
  if (source.length === 0) return this;
  this.buffers.unshift(source);
  this.length += source.length;
  return this;
}

BufferBuilder.prototype.getBufferWithSpace = function(size) {
  var buf = this.buffers[this.buffers.length-1];
  if (this.writeIndex + size > buf.length) {
    /* slice the current buffer */
    this.buffers[this.buffers.length-1] = buf.slice(0, this.writeIndex);
    /* add a new buffer */
    var newbuf = new Buffer(Math.max(buf.length*2, size));
    this.buffers.push(newbuf);
    this.writeIndex = 0;
    buf = newbuf
  }
  return buf;
}

function makeAppender(encoder, size) {
  return function(x) {
    var buf = this.getBufferWithSpace(size);
    encoder.call(buf, x, this.writeIndex, true);
    this.writeIndex += size;
    this.length += size;
    
    return this;
  };
}

BufferBuilder.prototype.appendUInt8 = makeAppender(Buffer.prototype.writeUInt8, 1);
BufferBuilder.prototype.appendUInt16LE = makeAppender(Buffer.prototype.writeUInt16LE, 2);
BufferBuilder.prototype.appendUInt16BE = makeAppender(Buffer.prototype.writeUInt16BE, 2);
BufferBuilder.prototype.appendUInt32LE = makeAppender(Buffer.prototype.writeUInt32LE, 4);
BufferBuilder.prototype.appendUInt32BE = makeAppender(Buffer.prototype.writeUInt32BE, 4);
BufferBuilder.prototype.appendInt8 = makeAppender(Buffer.prototype.writeInt8, 1);
BufferBuilder.prototype.appendInt16LE = makeAppender(Buffer.prototype.writeInt16LE, 2);
BufferBuilder.prototype.appendInt16BE = makeAppender(Buffer.prototype.writeInt16BE, 2);
BufferBuilder.prototype.appendInt32LE = makeAppender(Buffer.prototype.writeInt32LE, 4);
BufferBuilder.prototype.appendInt32BE = makeAppender(Buffer.prototype.writeInt32BE, 4);
BufferBuilder.prototype.appendFloatLE = makeAppender(Buffer.prototype.writeFloatLE, 4);
BufferBuilder.prototype.appendFloatBE = makeAppender(Buffer.prototype.writeFloatBE, 4);
BufferBuilder.prototype.appendDoubleLE = makeAppender(Buffer.prototype.writeDoubleLE, 8);
BufferBuilder.prototype.appendDoubleBE = makeAppender(Buffer.prototype.writeDoubleBE, 8);

BufferBuilder.prototype.appendStringEx = function(str, size, encoding) {
  if (!size) return;
  var buf = this.getBufferWithSpace(size);
  buf.write(str, this.writeIndex, size, encoding);
  this.writeIndex += size;
  this.length += size;

  return this;
};

BufferBuilder.prototype.appendString = function(str, encoding) {
  return this.appendStringEx(str, Buffer.byteLength(str, encoding), encoding);
}

BufferBuilder.prototype.appendStringZero = function(str, encoding) {
  return this.appendString(str + '\0', encoding);
}

BufferBuilder.prototype.appendFill = function(value, count) {
  if (!count) return;
  var buf = this.getBufferWithSpace(count);
  buf.fill(value, this.writeIndex, this.writeIndex + count);
  this.writeIndex += count;
  this.length += count;
  
  return this;
};

/* Convert to a plain Buffer */
BufferBuilder.prototype.get = function() {
  /* slice the tail buffer */
  var tail = this.buffers[this.buffers.length-1];
  this.buffers[this.buffers.length-1] = tail.slice(0, this.writeIndex);
  /* concatenate them */
  return Buffer.concat(this.buffers);
};


// Binn

exports.encode = encode;
exports.decode = decode;

function Decoder(buffer, offset) {
  this.offset = offset || 0;
  this.buffer = buffer;
}
Decoder.prototype.list = function (length) {
  var value = new Array(length);
  for (var i = 0; i < length; i++) {
    value[i] = this.parse();
  }
  return value;
};
Decoder.prototype.map = function (length) {
  var value = {};
  for (var i = 0; i < length; i++) {
    var key = this.buffer.readInt32BE(this.offset);
    this.offset += 4;
    value[key] = this.parse();
  }
  return value;
};
Decoder.prototype.obj = function (count) {
  var value = {};
  for (var i = 0; i < count; i++) {
    var keylen = this.buffer[this.offset];
    this.offset++;
    var key = this.buffer.toString('utf8', this.offset, this.offset + keylen);
    this.offset += keylen;
    value[key] = this.parse();
  }
  return value;
};
Decoder.prototype.blob = function (length) {
  var value = this.buffer.slice(this.offset, this.offset + length);
  this.offset += length;
  return value;
};
Decoder.prototype.string = function (length) {
  var value = this.buffer.toString('utf8', this.offset, this.offset + length);
  this.offset += length + 1;  // null terminator
  return value;
};
Decoder.prototype.getVarint = function () {
  var value = this.buffer[this.offset];
  if (value & 0x80) {
    value = this.buffer.readInt32BE(this.offset);
    value &= 0x7FFFFFFF;
    this.offset += 4;
  } else {
    this.offset++;
  }
  return value;
};
Decoder.prototype.parse = function () {
  var type, size, count, value;

  type = this.buffer[this.offset];
  this.offset++;

  switch (type) {
  // List
  case 0xE0:
    size = this.getVarint();
    count = this.getVarint();
    return this.list(count);
  // Map
  case 0xE1:
    size = this.getVarint();
    count = this.getVarint();
    return this.map(count);
  // Object
  case 0xE2:
    size = this.getVarint();
    count = this.getVarint();
    return this.obj(count);

  // nil
  case 0x00:
    return null;
  // true
  case 0x01:
    return true;
  // false
  case 0x02:
    return false;
  // undefined
  case 0x03:
    return undefined;

  // uint8
  case 0x20:
    value = this.buffer[this.offset];
    this.offset++;
    return value;
  // uint 16
  case 0x40:
    value = this.buffer.readUInt16BE(this.offset);
    this.offset += 2;
    return value;
  // uint 32
  case 0x60:
    value = this.buffer.readUInt32BE(this.offset);
    this.offset += 4;
    return value;
  // uint64
  case 0x80:
    value = this.buffer.readUInt64BE(this.offset);
    this.offset += 8;
    return value;

  // int 8
  case 0x21:
    value = this.buffer.readInt8(this.offset);
    this.offset++;
    return value;
  // int 16
  case 0x41:
    value = this.buffer.readInt16BE(this.offset);
    this.offset += 2;
    return value;
  // int 32
  case 0x61:
    value = this.buffer.readInt32BE(this.offset);
    this.offset += 4;
    return value;
  // int 64
  case 0x81:
    value = this.buffer.readInt64BE(this.offset);
    this.offset += 8;
    return value;

  // float 32
  case 0x62:
    value = this.buffer.readFloatBE(this.offset);
    this.offset += 4;
    return value;
  // float 64 / double
  case 0x82:
    value = this.buffer.readDoubleBE(this.offset);
    this.offset += 8;
    return value;

  // string
  case 0xA0:
    size = this.getVarint();
    return this.string(size);

  // datetime, date, time, decimalstr
  // TODO


  // blob
  case 0xC0:
    size = this.buffer.readInt32BE(this.offset);
    this.offset += 4;
    return this.blob(size);

  }

  throw new Error("Unknown type 0x" + type.toString(16));
};
function decode(buffer) {
  var decoder = new Decoder(buffer);
  var value = decoder.parse();
  if (decoder.offset !== buffer.length) throw new Error((buffer.length - decoder.offset) + " trailing bytes");
  return value;
}


function encodeableKeys (value) {
  return Object.keys(value).filter(function (e) {
    return typeof value[e] !== 'function' || value[e].toJSON;
  });
}
function encode(value, builder) {
  var type = typeof value;
  var count, size;

  // String
  if (type === "string") {
    size = Buffer.byteLength(value);
    // store the type
    builder.appendUInt8(0xA0);
    // store the size
    if (size > 127) {
      builder.appendInt32BE(size | 0x80000000);
    } else {
      builder.appendUInt8(size);
    }
    // store the string
    builder.appendStringEx(value + '\0', size + 1);
    return;
  }

  // Blob
  if (Buffer.isBuffer(value)) {
    size = value.length;
    // store the type
    builder.appendUInt8(0xC0);
    // store the size
    builder.appendInt32BE(size);
    // store the string
    builder.appendBuffer(value);
    return;
  }

  if (type === "number") {
    // Floating Point
    if ((value << 0) !== value) {
      // store the type
      builder.appendUInt8(0x82);
      // store the value
      builder.appendDoubleBE(value);
      return;
    }

    // Integers
    if (value >=0) {
      // uint 8
      if (value < 0x100) {
        // store the type
        builder.appendUInt8(0x20);
        // store the value
        builder.appendUInt8(value);
        return;
      }
      // uint 16
      if (value < 0x10000) {
        // store the type
        builder.appendUInt8(0x40);
        // store the value
        builder.appendUInt16BE(value);
        return;
      }
      // uint 32
      if (value < 0x100000000) {
        // store the type
        builder.appendUInt8(0x60);
        // store the value
        builder.appendUInt32BE(value);
        return 5;
      }
      // uint 64
      if (value < 0x10000000000000000) {
        // store the type
        builder.appendUInt8(0x80);
        // store the value
        builder.appendUInt64BE(value);
        return;
      }
      throw new Error("Number too big 0x" + value.toString(16));
    }
    // int 8
    if (value >= -0x80) {
      // store the type
      builder.appendUInt8(0x21);
      // store the value
      builder.appendInt8(value);
      return;
    }
    // int 16
    if (value >= -0x8000) {
      // store the type
      builder.appendUInt8(0x41);
      // store the value
      builder.appendInt16BE(value);
      return;
    }
    // int 32
    if (value >= -0x80000000) {
      // store the type
      builder.appendUInt8(0x61);
      // store the value
      builder.appendInt32BE(value);
      return;
    }
    // int 64
    if (value >= -0x8000000000000000) {
      // store the type
      builder.appendUInt8(0x81);
      // store the value
      builder.appendInt64BE(value);
      return;
    }
    throw new Error("Number too small -0x" + value.toString(16).substr(1));
  }

  if (type === "undefined") {
    // store the type
    builder.appendUInt8(0x03); // special type
    return;
  }

  // null
  if (value === null) {
    // store the type
    builder.appendUInt8(0x00);
    return;
  }

  // Boolean
  if (type === "boolean") {
    // store the type
    builder.appendUInt8(value ? 0x01 : 0x02);
    return;
  }

  // Custom toJSON function.
  if (typeof value.toJSON === 'function') {
    return encode(value.toJSON(), builder);
  }

  // Container Types
  if (type === "object") {

    // create a new buffer builder
    var builder2 = new BufferBuilder();
    var isArray = Array.isArray(value);

    if (isArray) {
      count = value.length;
    }
    else {
      var keys = encodeableKeys(value);
      count = keys.length;
    }

    if (isArray) {
      type = 0xE0;
      // add the values to it
      for (var i = 0; i < count; i++) {
        encode(value[i], builder2);
      }
    }
    else {
      type = 0xE2;
      // add the key value pairs to it
      for (var i = 0; i < count; i++) {
        var key = keys[i];
        // store the key
        size = Buffer.byteLength(key);
        if (size > 255) {
          throw new Error("Key is longer than 255: " + key);
        }
        builder2.appendUInt8(size);
        builder2.appendStringEx(key, size);
        // store the value
        encode(value[key], builder2);
      }
    }

    // save the header
    var header = Buffer.allocUnsafe(9);
    header.writeUInt8(type, 0);
    // calculate the total size including the header
    size = builder2.length + 3;
    if (count > 127) size += 3;
    if (size  > 127) size += 3;
    var offset;
    // write the size
    if (size > 127) {
      header.writeInt32BE(size | 0x80000000, 1);
      offset = 5;
    } else {
      header.writeUInt8(size, 1);
      offset = 2;
    }
    // write the count
    if (count > 127) {
      header.writeInt32BE(count | 0x80000000, offset);
      offset += 4;
    } else {
      header.writeUInt8(count, offset);
      offset += 1;
    }
    // if the header is smaller than the max, resize it
    if (offset < 9) {
      header = header.slice(0, offset);
    }
    // prepend the header in the builder and return the resulting buffer
    builder2.prependBuffer(header);
    if (builder) {
      builder.appendBuffer(builder2.get());
      return;
    } else {
      return builder2.get();
    }
  }

  if (type === "function") return undefined;
  throw new Error("Unknown type: " + type);
}
