"use strict";
var test = require('tape');
var binn = require('./binn');
var util = require('util');

var tests = [
  true, false, null, undefined,
  0, 1, -1, 2, -2, 4, -4, 6, -6,
  0x10, -0x10, 0x20, -0x20, 0x40, -0x40,
  0x80, -0x80, 0x100, -0x100, 0x200, -0x100,
  0x1000, -0x1000, 0x10000, -0x10000,
  0x20000, -0x20000, 0x40000,-0x40000,
  10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000,
  10000000000, 100000000000, 1000000000000,
  -10, -100, -1000, -10000, -100000, -1000000, -10000000, -100000000,
  -1000000000, -10000000000, -100000000000, -1000000000000,
  1.1, 0.1, -0.02,
  'hello', 'world', Buffer.from("Hello"), Buffer.from("World"),
  [1,2,3], [], {name: "Tim", age: 29}, {},
  {a: 1, b: 2, c: [1, 2, 3]},
  {12: 'first', 1234: 'second', 123456789: 'third'}
];

test('codec works as expected', function(assert) {

  var packed = binn.encode(tests);
  console.log(packed);
  var output = binn.decode(packed);

  assert.deepEqual(tests, output);
  assert.end();

});

function Foo () {
  this.instance = true
}

Foo.prototype.blah = 324

Foo.prototype.doThing = function () {}

function jsonableFunction () {
  console.log("can be json'ed")
}

jsonableFunction.toJSON = function () { return this.toString() }

var jsonLikes = [
  {fun: function () {}, string: 'hello'},
  {toJSON: function () {
    return {object: true}
  }},
  new Date(0),
  /regexp/,
  new Foo(),
  {fun: jsonableFunction},
  jsonableFunction,
]

test('treats functions same as json', function (assert) {
  assert.deepEqual(
    binn.decode(binn.encode(jsonLikes)),
    JSON.parse(JSON.stringify(jsonLikes)),
    util.inspect(jsonLikes)
  )
  assert.end()
})

test('returns undefined for a function', function (assert) {
  function noop () {}
  assert.equal(binn.encode(noop), JSON.stringify(noop))
  assert.end()
})
