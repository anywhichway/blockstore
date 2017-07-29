# blockstore

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/5b086f3a8c4a4bc2b419dd61578dc810)](https://www.codacy.com/app/syblackwell/blockstore?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=anywhichway/blockstore&amp;utm_campaign=Badge_Grade)

`blockstore` provides block allocated, single file, key value storage for JavaScript and is written in JavaScript. 

Its API is multi-named so that it is also similar to `memcached` and `Redis`, i.e. `set` is the same as `setItem`.

It can be used as a server side API compatible replacement for `localStorage` or `LevelUP`.

Less than 275 lines of code with zero dependencies, 10K uncompressed, 5K compressed, and 2K gzipped.

Reads, writes, and deletes are all asynchronous.

The standard API is similar to `localStorage`. The `localStorage` API can also be used; however, currently no events are emmited.

Tested at up to 10,000,000 records of 1024 bytes (i.e. 1K) and keys of up to 16 characters on an i5 8GB Win 10 machine with a non-SSD hard drive.

Performance is impacted at large multiples of records, e.g. as record counts goes up by millions. (A testament more to the Chrome v8 engine hash lookup than anything else).
Key size has an impact up to a length of 6. Small keys are up to twice as fast as the performance numbers below for 8 character keys. Other variances are probably due to garbage collection.

With caching:

```
Test Size: 1,000,000 Key Size: 8
Write Records Sec: 17,513
Cached Read Records Sec: 665,336
Uncached Read Records Sec: 31,460
```

```
Test Size: 2,000,000 Key Size: 8
Write Records Sec: 17,078
Cached Read Records Sec: 581,395
Uncached Read Records Sec: 31,068
```

```
Test Size: 5,000,000 Key Size: 8
Write Records Sec: 18,701
Cached Read Records Sec: 495,835
Uncached Read Records Sec: 28,731
```

Without caching:

```
Test Size: 10,000,000 Key Size: 8
Write Records Sec: 19,500
Uncached Read Records Sec: 23,624
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


`new BlockStore(path,options:{clear:false,encoding:"utf8",cache:true,compress:{keys:true,data:false}})` If `clear=true` the existing data will be deleted. If `compress` is missing or `compress.keys` is true, keys will be compressed at start-up. If both `compress.keys` and `compress.data` are true then keys and data will be compressed at start-up. It is not possible to compress data
without also compressing keys.

`const cnt = await <instance>.count()` Returns the number of keys in the store.

`await <instance>.delete(key)` Deletes the data associated with the `key`. Returns `true` is keys existed and `false` if it did not.

`const k = await <instance>.key(number)` Returns the key at index `number`.

`<instance>.flush(id)` Flushes the cache for the `id`. If no `id` is provided, the entire cache is flushed. If caching is turned on, returns the hit count for `id` or the average hit count, otherwise `undefined`.

`Buffer buff = await <instance>.get(key)` Returns a `Buffer` with the contents stored at the `key`.

`await <instance>.set(key,bufferOrString)` Adds the `bufferOrString` to storage with the `key`.

`<instance>.compress()` Reclaims disk storage by eliminating blank space from deleted or updated records. Returns an object with before and after sizes.

For compatibility with `localStorage` the property `length` and the methods `getItem`, `removeItem`, and `setItem` are also supported.

# Caching

BlockStore holds all keys in memory and any caching wrapper would also need to hold keys in memory. Basic cache management requires only 10 lines of code, so it was added to BlockStore v0.0.9
to help reduce ultimate code size and also memory load due to the duplication of keys in RAM in a high read environment. Currently, BlockStore does not automatically flush cache entries
in low memory situations.

Caching is on by default. It can be turned off by setting `<instance>.cache = false`. To free memory, flush the cache, `<instance>.flush()`, immediately before or after turning caching
off.


# Internals

A BlockStore consists of two files:

1) `store.json` which stores the actual data. If encoded as `utf8`, this can actually be viewed in a text editor.
2) `blocks.json` which stores the keys and offsets and sizes of data blocks in `store.json` as well as offsets and sizes of keys in itself.

The contents of `blocks.json` is kept in memory at all times, although it is written incrementally as updated.

# Collaboration

We are seeking collaborators to enhance this module. A recovery program is needed to "intelligently" analyze and restore files in case of corruption.

We also have some thoughts about how multi-record transactions might be added.

And, of course, perhaps someone can make this smaller and faster.


# Release History (reverse chronological order)

v0.1.3 2017-07-28 Simplified architecture and API to increase speed and decrease both library and runtime memory usage by removing free space tracking and encoding arguments to functions other than constructor. Store keys will autocompress on start or command. `Blockstore` constructor now takes a location and an options object for arguments. Storage path is automatically
created if it does not exist. This is also in preparation for sharding mode operation.

v0.1.2 2017-07-23 Documentation updates.

v0.1.1 2017-07-23 Possible breaking change! Converted `clear` to async, although underlying implementaion is still synchronous. Makes `blockstore` more compatible/replaceable wih other storage.

v0.0.10 2017-07-19 Fixed issue related to not adding cache property to blocks when first loaded.

v0.0.9 2017-07-19 Added caching. After considerable thought we decided to add just a few lines of code to support caching in order to save the duplication of in memory record keys with a separate cache.

v0.0.8 2017-07-03 Codacy driven style improvements. Fixed a typo related to file encoding flag. Any users employing other than default `utf8` encoding should upgrade.

v0.0.7 2017-07-03 Added unit tests. `delete` now returns `true` if the key existed and `false` if it did not. `compress` now returns before and after file sizes in an object.

v0.0.5 2017-07-01 Added `length` for `localStorage`

v0.0.4 2017-07-01 Made API optionally compatible with `localStorage`

v0.0.3 2017-06-30 Minor documentation update.

v0.0.2 2017-06-30 Added load tests and made the specification of encoding more regular. Documented.

v0.0.1 2017-06-29 Generalized from JSONBlockStore v0.0.1 which was extracted from ReasonDB v3.2