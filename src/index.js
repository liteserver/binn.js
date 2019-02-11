/* eslint-disable no-bitwise */
// Updated version of https://github.com/liteserver/binn.js/blob/master/binn.js
import BufferBuilder from './BufferBuilder';
import Decoder from './Decoder';

const encodeableKeys = value => Object.keys(value).filter(e => typeof value[e] !== 'function' || value[e].toJSON);

export const decode = (buffer) => {
  const decoder = new Decoder(buffer);
  const value = decoder.parse();
  if (decoder.offset !== buffer.length) throw new Error(`${buffer.length - decoder.offset} trailing bytes`);
  return value;
};

export const encode = (value, builder) => {
  let type = typeof value;
  let count;
  let size;

  // String
  if (type === 'string') {
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
    builder.appendStringEx(`${value}\0`, size + 1);
  } else if (Buffer.isBuffer(value)) { // Blob
    size = value.length;
    // store the type
    builder.appendUInt8(0xC0);
    // store the size
    builder.appendInt32BE(size);
    // store the string
    builder.appendBuffer(value);
  } else if (type === 'number') {
    // Floating Point
    if ((value << 0) !== value) {
      // store the type
      builder.appendUInt8(0x82);
      // store the value
      builder.appendDoubleBE(value);
    } else if (value >= 0) { // Integers
      // uint 8
      if (value < 0x100) {
        // store the type
        builder.appendUInt8(0x20);
        // store the value
        builder.appendUInt8(value);
      } else if (value < 0x10000) { // uint 16
        // store the type
        builder.appendUInt8(0x40);
        // store the value
        builder.appendUInt16BE(value);
      } else if (value < 0x100000000) { // uint 32
        // store the type
        builder.appendUInt8(0x60);
        // store the value
        builder.appendUInt32BE(value);
      } else if (value < 0x10000000000000000) { // uint 64
        // store the type
        builder.appendUInt8(0x80);
        // store the value
        builder.appendUInt64BE(value);
      } else {
        throw new Error(`Number too big 0x${value.toString(16)}`);
      }
    } else if (value >= -0x80) { // int 8
      // store the type
      builder.appendUInt8(0x21);
      // store the value
      builder.appendInt8(value);
    } else if (value >= -0x8000) { // int 16
      // store the type
      builder.appendUInt8(0x41);
      // store the value
      builder.appendInt16BE(value);
    } else if (value >= -0x80000000) { // int 32
      // store the type
      builder.appendUInt8(0x61);
      // store the value
      builder.appendInt32BE(value);
    } else if (value >= -0x8000000000000000) { // int 64
      // store the type
      builder.appendUInt8(0x81);
      // store the value
      builder.appendInt64BE(value);
    } else {
      throw new Error(`Number too small -0x${value.toString(16).substr(1)}`);
    }
  } else if (type === 'undefined') {
    // store the type
    builder.appendUInt8(0x03); // special type
  } else if (value === null) { // null
    // store the type
    builder.appendUInt8(0x00);
  } else if (type === 'boolean') { // Boolean
    // store the type
    builder.appendUInt8(value ? 0x01 : 0x02);
  } else if (typeof value.toJSON === 'function') { // Custom toJSON function.
    encode(value.toJSON(), builder);
  } else if (type === 'object') { // Container Types
    // create a new buffer builder
    const builder2 = new BufferBuilder();
    const isArray = Array.isArray(value);

    if (isArray) {
      count = value.length;

      type = 0xE0;
      // add the values to it
      for (let i = 0; i < count; i += 1) {
        encode(value[i], builder2);
      }
    } else {
      const keys = encodeableKeys(value);
      count = keys.length;

      type = 0xE2;
      // add the key value pairs to it
      for (let i = 0; i < count; i += 1) {
        const key = keys[i];
        // store the key
        size = Buffer.byteLength(key);
        if (size > 255) {
          throw new Error(`Key is longer than 255: ${key}`);
        }
        builder2.appendUInt8(size);
        builder2.appendStringEx(key, size);
        // store the value
        encode(value[key], builder2);
      }
    }

    // save the header
    let header = Buffer.allocUnsafe(9);
    header.writeUInt8(type, 0);
    // calculate the total size including the header
    size = builder2.length + 3;
    if (count > 127) size += 3;
    if (size > 127) size += 3;
    let offset;
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
    } else {
      return builder2.get();
    }
  } else if (type === 'function') return undefined;
  else {
    throw new Error(`Unknown type: ${type}`);
  }
  return true;
};

export default { encode, decode };
