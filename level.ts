import level from 'level-ts'

export const db = new level('./db')

// var blake2 = require('blake2');
// var h = blake2.createHash('blake2s');
// h.update(Buffer.from("test"));
// console.log(h.digest("hex"));