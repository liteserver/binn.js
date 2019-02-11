export default class BufferBuilder {
  constructor(initialCapacity = 512) {
    this.buffers = [Buffer.isBuffer(initialCapacity)
      ? initialCapacity : Buffer.alloc(initialCapacity)];

    this.writeIndex = 0;
    this.length = 0;
  }

  appendBuffer(source) {
    if (!source.length) return this;

    /* slice the tail buffer */
    this.buffers[this.buffers.length - 1] = this.buffers[this.buffers.length - 1]
      .slice(0, this.writeIndex);

    /* add the new buffer */
    this.buffers.push(source);
    this.writeIndex = source.length;
    this.length += source.length;

    return this;
  }

  prependBuffer(source) {
    if (!source.length) return this;

    this.buffers.unshift(source);
    this.length += source.length;
    return this;
  }

  getBufferWithSpace(size) {
    const buf = this.buffers[this.buffers.length - 1];
    if (this.writeIndex + size > buf.length) {
      /* slice the current buffer */
      this.buffers[this.buffers.length - 1] = buf.slice(0, this.writeIndex);
      /* add a new buffer */
      const newbuf = Buffer.alloc(Math.max(buf.length * 2, size));
      this.buffers.push(newbuf);
      this.writeIndex = 0;
      return newbuf;
    }
    return buf;
  }

  makeAppender(size, writeFunc) {
    const buf = this.getBufferWithSpace(size);
    writeFunc(buf, this.writeIndex);
    this.writeIndex += size;
    this.length += size;
    return this;
  }

  appendUInt8(value) {
    return this.makeAppender(1, (buf, writeIndex) => buf.writeUInt8(value, writeIndex));
  }

  appendUInt16LE(value) {
    return this.makeAppender(2, (buf, writeIndex) => buf.writeUInt16LE(value, writeIndex));
  }

  appendUInt16BE(value) {
    return this.makeAppender(2, (buf, writeIndex) => buf.writeUInt16BE(value, writeIndex));
  }

  appendUInt32LE(value) {
    return this.makeAppender(4, (buf, writeIndex) => buf.writeUInt32LE(value, writeIndex));
  }

  appendUInt32BE(value) {
    return this.makeAppender(4, (buf, writeIndex) => buf.writeUInt32BE(value, writeIndex));
  }

  appendInt8(value) {
    return this.makeAppender(1, (buf, writeIndex) => buf.writeInt8(value, writeIndex));
  }

  appendInt16LE(value) {
    return this.makeAppender(2, (buf, writeIndex) => buf.writeInt16LE(value, writeIndex));
  }

  appendInt16BE(value) {
    return this.makeAppender(2, (buf, writeIndex) => buf.writeInt16BE(value, writeIndex));
  }

  appendInt32LE(value) {
    return this.makeAppender(4, (buf, writeIndex) => buf.writeInt32LE(value, writeIndex));
  }

  appendInt32BE(value) {
    return this.makeAppender(4, (buf, writeIndex) => buf.writeInt32BE(value, writeIndex));
  }

  appendFloatLE(value) {
    return this.makeAppender(4, (buf, writeIndex) => buf.writeFloatLE(value, writeIndex));
  }

  appendFloatBE(value) {
    return this.makeAppender(4, (buf, writeIndex) => buf.writeFloatBE(value, writeIndex));
  }

  appendDoubleLE(value) {
    return this.makeAppender(8, (buf, writeIndex) => buf.writeDoubleLE(value, writeIndex));
  }

  appendDoubleBE(value) {
    return this.makeAppender(8, (buf, writeIndex) => buf.writeDoubleBE(value, writeIndex));
  }

  appendStringEx(str, size, encoding) {
    if (!size) return this;
    const buf = this.getBufferWithSpace(size);
    buf.write(str, this.writeIndex, size, encoding);
    this.writeIndex += size;
    this.length += size;
    return this;
  }

  appendString(str, encoding) {
    return this.appendStringEx(str, Buffer.byteLength(str, encoding), encoding);
  }

  appendStringZero(str, encoding) {
    return this.appendString(`${str}\0`, encoding);
  }

  appendFill(value, count) {
    if (!count) return this;
    const buf = this.getBufferWithSpace(count);
    buf.fill(value, this.writeIndex, this.writeIndex + count);
    this.writeIndex += count;
    this.length += count;
    return this;
  }

  get() {
    /* slice the tail buffer */
    this.buffers[this.buffers.length - 1] = this.buffers[this.buffers.length - 1]
      .slice(0, this.writeIndex);
    /* concatenate them */
    return Buffer.concat(this.buffers);
  }
}
