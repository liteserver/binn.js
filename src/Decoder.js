/* eslint-disable no-bitwise */
export default class Decoder {
  constructor(buffer, offset = 0) {
    this.offset = offset;
    this.buffer = buffer;
  }

  list(length) {
    const value = new Array(length);
    for (let i = 0; i < length; i += 1) {
      value[i] = this.parse();
    }
    return value;
  }

  map(length) {
    const value = {};
    for (let i = 0; i < length; i += 1) {
      const key = this.buffer.readInt32BE(this.offset);
      this.offset += 4;
      value[key] = this.parse();
    }
    return value;
  }

  obj(count) {
    const value = {};
    for (let i = 0; i < count; i += 1) {
      const keylen = this.buffer[this.offset];
      this.offset += 1;
      const key = this.buffer.toString('utf8', this.offset, this.offset + keylen);
      this.offset += keylen;
      value[key] = this.parse();
    }
    return value;
  }

  blob(length) {
    const value = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  string(length) {
    const value = this.buffer.toString('utf8', this.offset, this.offset + length);
    this.offset += length + 1; // null terminator
    return value;
  }

  getVarint() {
    let value = this.buffer[this.offset];
    if (value & 0x80) {
      value = this.buffer.readInt32BE(this.offset);
      value &= 0x7FFFFFFF;
      this.offset += 4;
    } else {
      this.offset += 1;
    }
    return value;
  }

  parse() {
    const type = this.buffer[this.offset];
    let size;
    let count;
    let value;

    this.offset += 1;
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
        this.offset += 1;
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
        this.offset += 1;
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
      default:
        throw new Error(`Unknown type 0x${type.toString(16)}`);
    }
  }
}
