/* eslint-disable no-console */
import { assert } from 'chai';

import { encode, decode } from '.';

const tests = [
  true, false, null, undefined,
  0, 1, -1, 2, -2, 4, -4, 6, -6,
  0x10, -0x10, 0x20, -0x20, 0x40, -0x40,
  0x80, -0x80, 0x100, -0x100, 0x200, -0x100,
  0x1000, -0x1000, 0x10000, -0x10000,
  0x20000, -0x20000, 0x40000, -0x40000,
  10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000,
  10000000000, 100000000000, 1000000000000,
  -10, -100, -1000, -10000, -100000, -1000000, -10000000, -100000000,
  -1000000000, -10000000000, -100000000000, -1000000000000,
  1.1, 0.1, -0.02,
  'hello', 'world', Buffer.from('Hello'), Buffer.from('World'),
  [1, 2, 3], [], { name: 'Tim', age: 29 }, {},
  { a: 1, b: 2, c: [1, 2, 3] },
];

class Foo {
  constructor() {
    this.instance = true;
    this.blah = 324;
  }

  doThing() {
    return this.blah + 1;
  }
}


function jsonableFunction() {
  console.log("can be json'ed");
}

// eslint-disable-next-line func-names
jsonableFunction.toJSON = function () { return this.toString(); };

const noop = () => {};

const jsonLikes = [
  { fun() {}, string: 'hello' },
  {
    toJSON() {
      return { object: true };
    },
  },
  new Date(0),
  /regexp/,
  new Foo(),
  { fun: jsonableFunction },
  jsonableFunction,
];

console.log('Start test 1 ...');
const packed = encode(tests);
console.log(packed);
assert.deepEqual(tests, decode(packed));
console.log('test 1 done.');

console.log('Start test 2, treats functions same as json ...');
assert.deepEqual(JSON.parse(JSON.stringify(jsonLikes)), decode(encode(jsonLikes)));
console.log('test 2 done.');

console.log('Start test 3, returns undefined for a function ...');
assert.isUndefined(encode(noop));
console.log('test 3done.');
