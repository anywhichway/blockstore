# blockstore

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/5b086f3a8c4a4bc2b419dd61578dc810)](https://www.codacy.com/app/syblackwell/blockstore?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=anywhichway/blockstore&amp;utm_campaign=Badge_Grade)

`blockstore` provides block allocated, single file, key value storage for JavaScript and is written in JavaScript. It can be used as a server side API compatible
replacement for `localStorage`. Its API is multi-named so that it is also similar to `memcached` and `Redis`, i.e. `set` is the same as `setItem`.

It is just 290 lines of code with zero dependencies, less than 10K uncompressed, 6K compressed, and 2K gzipped.

Reads, writes, and deletes are all asynchronous.

The standard API is similar to `localStorage`. The `localStorage` API can also be used; however, currently no events are emmited.

Tested at up to 5,000,000 small records and keys of up to 15 characters on an i5 8GN Win 10 machine with a non-SSD hard drive.

Performance is immune to record count at the limits of current testing. A testament more to the Chrome v8 engine hash lookup than anything else:

```
Test Size: 5000000
Write Records Sec: 13236
Read Records Sec: 31846
```

```
Test Size: 2000000
Write Records Sec: 13078
Read Records Sec: 29952
```

```
Test Size: 10000
Write Records Sec: 13140
Read Records Sec: 32258
```


# Installation

npm install blockstore

The code is only appropriate for server use and is not transpiled. It makes extensive use of async/await and has been tested on NodeJS v7.8.0.

A thin wrapper `JSONBlockstore` that automatically handles serializing and restoring non-circular JSON is also available.

# Usage

```
const BlockStore = require("blockstore"),
	bstore = new BlockStore("./test/data",true,"utf8"); // note, the directory must already exist

await bstore.setItem("akey","test string"); // bstore will automatically open on the first attempt to read or write

const data = await bstore.get("akey");
	
```

The core API is documented below. Currently you must review the code or unit tests for further functionality:


`new BlockStore(path,clear=false,encoding="utf8")` If `clear=true` the existing data will be deleted.

`const cnt = await <instance>.count()` Returns the number of keys in the store.

`await <instance>.delete(key)` Deletes the data associated with the `key`. Returns `true` is keys existed and `false` if it did not.

`const k = await <instance>.key(number)` Returns the key at index `number`.

`Buffer buff = await <instance>.get(key)` Returns a `Buffer` with the contents stored at the `key`.

`await <instance>.set(key,bufferOrString)` Adds the `bufferOrString` to storage with the `key`.

`<instance>.compress()` Reclaims disk storage by eliminating blank space from deleted or updated records. Returns an object with before and after sizes.

For compatibility with `localStorage` the property `length` and the methods `getItem`, `removeItem`, and `setItem` are also supported.


# Internals

A BlockStore consists of three files:

1) `store.json` which stores the actual data. If encoded as `utf8`, this can actually be viewed in a text editor.
2) `blocks.json` which stores the keys and offsets and sizes of data blocks in `store.json` as well as offsets and sizes of keys in itself.
3) `free.json` which stores arrays pointing to free spaces in `store.json`.

Note, `free.json` may look like it has a bunch of unused space; however, the arrays are of fixed byte size to store the largest integers supported in JavaScript.

The contents of `blocks.json` and `free.json` are kept in memory at all times, although only written incrementally.

# Collaboration

We are seeking collaborators to enhance this module. A recovery program is needed to "intelligently" analyze and restore files in case of corruption.

We also have some thoughts about how multi-record transactions might be added.

Note, we are of the opinion that caching, JSON management, etc. should be done by wrapper classes to keep the core small.

And, of course, perhaps someone can make this smaller and faster.

# Roadmap

Over the next few weeks unit tests will be added.

# Release History (reverse chronological order)

v0.0.7 2017-07-03 Added unit tests. `delete` now returns `true` if the key existed and `false` if it did not. `compress` now returns before and after file sizes in an object.

v0.0.5 2017-07-01 Added `length` for `localStorage`

v0.0.4 2017-07-01 Made API optionally compatible with `localStorage`

v0.0.3 2017-06-30 Minor documentation update.

v0.0.2 2017-06-30 Added load tests and made the specification of encoding more regular. Documented.

v0.0.1 2017-06-29 Generalized from JSONBlockStore v0.0.1 which was extracted from ReasonDB v3.2