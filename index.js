(function() {
	"use strict"

	// enhance to auto-create directory
	
	const fs = require("fs"),
		readline = require("readline"),
		blockString = (block,encoding="utf8") => {
			// 20 is the length of the large number in JavaScript
			return "[" + bytePadEnd(block[0]+"",20," ",encoding) + "," + bytePadEnd(block[1]+"",20," ",encoding) + "]";
		},
		bytePadEnd = (str,length,pad,encoding="utf8") => {
			const needed = length - Buffer.byteLength(str,encoding);
			if(needed>0) return str + Buffer.alloc(needed," ",encoding).toString(encoding);
			return str;
		},
		asyncyInline = (thisArg,f,...args) => {
			const cb = (typeof(args[args.length-1])==="function" ? args.pop() : null);
			return new Promise((resolve,reject) => {
				try {
					let outerresult = f.call(thisArg,...args,(err,result) => {
						outerresult = undefined;
						if(err) {
							resolve({err,args,result});
						} else {
							if(cb) {
								try {
									cb(null,result);
								} catch(err) {
									resolve({err,args:result});
								}
							}
							resolve({result});
						}
					});
					if(!["nextTick","setTimeout","setInterval"].includes(f.name)) {
						setTimeout(() => {
							// assume a function that returns a value is not one that invokes a callback
							// there are exceptions, but the programmer will need to handle those
							if(outerresult!==undefined) {
								if(outerresult instanceof Promise) outerresult.then(result => resolve({result}));
								else if(outerresult instanceof Error) resolve({err:outerresult});
								else resolve({result:outerresult});
							}
						});
					}
				} catch(err) {
					resolve({err,args})
				}
			});
		};
	
	function BlockStore(path,clear=false,encoding="utf8") {
		this.path = path;
		this.encoding = encoding;
		this.opened = false;
		if(clear) this.clear();
	}
	BlockStore.prototype.alloc = async function(length,encoding) {
		encoding || (encoding = this.encoding);
		let block;
		encoding || (econding = this.encoding);
		if(!this.alloc.size) {
			this.alloc.size = Buffer.byteLength(blockString([0,0],encoding),encoding);
			this.alloc.empty = bytePadEnd("null",this.alloc.size," ",encoding);
		}
		for(var i=0;i<this.free.length;i++) {
			block = this.free[i];
			if(block && block[1]>=length) {
				let position = ((this.alloc.size+1) * i);
				this.free[i] = null;
				await asyncyInline(fs,fs.write,this.freefd,this.alloc.empty,position,encoding);
				return block;
			}
		}
		let start = (this.storeSize===0 ? 0 : this.storeSize+1);
		return [start, length];
	}
	// clear is synchronous, it is called very little
	BlockStore.prototype.clear = function() {
		this.close();
		try {
			fs.unlinkSync(this.path + "/free.json");
		} catch(e) { }
		try {
			fs.unlinkSync(this.path + "/blocks.json");
		} catch(e) { }
		try {
			fs.unlinkSync(this.path + "/store.json");
		} catch(e) { }
		this.freeSize = 0;
		this.blocksSize = 0;
		this.storeSize = 0;
		this.free = [];
		this.blocks = {};
		this.keys = [];
	}
	// close is synchronous, it is called very little
	BlockStore.prototype.close = function() {
		if(this.opened) {
			this.opened = false;
			fs.closeSync(this.freefd);
			fs.closeSync(this.blocksfd);
			fs.closeSync(this.storefd);
		}
	}
	BlockStore.prototype.count = async function count() {
		if(!this.opened) this.open();
		return this.keys.length;
	}
	// compress should only be used when offline, so synchronous
	BlockStore.prototype.compress = function(encoding) {
		encoding || (encoding = this.encoding);
		if(!this.opened) this.open();
		if(this.keys.length===0) {
			this.clear();
			return;
		}
		this.blocksSize = 0;
		this.storeSize = 0;
		const storefd = fs.openSync(this.path + "/compressing.store.json","w"),
			blocksfd = fs.openSync(this.path + "/compressing.blocks.json","w");
		for(let key in this.blocks) {
			if(key!=="null") {
				const block = this.blocks[key],
					newblock = block.slice();
				newblock[0] = this.storeSize;
				newblock[2] = this.blocksSize;
				let str = '"'+key+'":' + JSON.stringify(newblock)+",";
				fs.writeSync(blocksfd,str,this.blocksSize,encoding); // should make this safer and copys to another file first
				this.blocksSize += Buffer.byteLength(str,encoding);
				const buffer = Buffer.alloc(block[1]);
				fs.readSync(this.storefd,buffer,0,block[1],block[0]);
				str = buffer.toString(this.encoding);
				fs.writeSync(storefd,str,this.storeSize,encoding); 
				this.storeSize += Buffer.byteLength(str,encoding);
			}
		}
		fs.closeSync(storefd);
		fs.closeSync(this.storefd);
		fs.closeSync(blocksfd);
		fs.closeSync(this.blocksfd);
		fs.unlinkSync(this.path + "/store.json");
		fs.renameSync(this.path + "/compressing.store.json",this.path + "/store.json");
		fs.unlinkSync(this.path + "/blocks.json");
		fs.renameSync(this.path + "/compressing.blocks.json",this.path + "/blocks.json");
		this.storefd = fs.openSync(this.path + "/store.json","r+");
		this.blocksfd = fs.openSync(this.path + "/blocks.json","r+");
		fs.ftruncateSync(this.freefd,0);
		this.free = [];
		this.freeSize = 0;
	}
	BlockStore.prototype.delete = async function(id,encoding) {
		encoding || (encoding = this.encoding);
		if(!this.opened) this.open();
		const block = this.blocks[id];
		if(block) {
			const blanks = bytePadEnd("",block[1],encoding);
			delete this.blocks[id];
			this.keys = Object.keys(this.blocks);
			this.keys.splice(this.keys.indexOf(id),1);
			await asyncyInline(fs,fs.write,this.storefd,blanks,block[0],"utf8"); // write blank padding
			this.free.push(block);
			let str = blockString(block,this.encoding)+",";
			await asyncyInline(fs,fs.write,this.freefd,str,this.freeSize,encoding);
			this.freeSize += Buffer.byteLength(str,encoding);
			await asyncyInline(fs,fs.write,this.blocksfd,bytePadEnd("null",block[3],this.encoding),block[2],encoding);
		}
	}
	BlockStore.prototype.get = async function(id,encoding,block=[]) {
		encoding || (encoding = this.encoding);
		if(!this.opened) this.open();
		const currentblock = this.blocks[id];
		if(currentblock) {
			block[0] = currentblock[0];
			block[1] = currentblock[1];
			const buffer = Buffer.alloc(block[1]);
			await asyncyInline(fs,fs.read,this.storefd,buffer,0,block[1],block[0]);
			return buffer;
		}
	}
	BlockStore.prototype.key = async function(number) {
		if(!this.opened) this.open();
		return this.keys[number];
	}
	// open is synchronous, it is called very little and
	BlockStore.prototype.open = function(encoding) { // also add a transactional file class <file>.json, <file>.queue.json, <file>.<line> (line currently processing), <file>.done.json (lines processed)
		encoding || (encoding = this.encoding);
		let result;
		//console.log(result)
		try {
			this.freefd = fs.openSync(this.path + "/free.json","r+");
		} catch(e) {
			this.freefd = fs.openSync(this.path + "/free.json","w+");
		}
		try {
			this.blocksfd = fs.openSync(this.path + "/blocks.json","r+");
		} catch(e) {
			this.blocksfd = fs.openSync(this.path + "/blocks.json","w+");
		}
		try {
			this.storefd = fs.openSync(this.path + "/store.json","r+");
		} catch(e) {
			this.storefd = fs.openSync(this.path + "/store.json","w+");
		}
		const freestat = fs.fstatSync(this.freefd),
			blockstat = fs.fstatSync(this.blocksfd),
			storestat = fs.fstatSync(this.storefd);
		let blocks = fs.readFileSync(this.path + "/blocks.json",encoding);  // {<id>:{start:start,end:end,length:length}[,...]}
		blocks.trim();
		blocks.length===0 || (blocks = blocks.substring(0,blocks.length-1)); // remove trailing comma
		let free = fs.readFileSync(this.path + "/free.json",encoding); // [{start:start,end:end,length:length}[,...]]
		if(free.length===0) {
			this.free = [];
		} else {
			//console.log(free)
			free = free.trim();
			if(free[0]===",") free = free.substring(1);
			if(free[free.length-1]===",") free = free.substring(0,free.length-1);
			try {
				this.free= JSON.parse("["+free+"]");
			} catch(e) {
				console.log(e,"["+free+"]");
			}
		}
		try {
			this.blocks = (blocks.length>0 ? JSON.parse("{" + blocks + "}") : {});
		} catch(e) {
			console.log(e,blocks);
		}
		this.freeSize = freestat.size;
		this.blocksSize = blockstat.size;
		this.storeSize = storestat.size;
		this.keys = Object.keys(this.blocks);
		this.opened = true;
		return true;
	}
	BlockStore.prototype.set = async function(id,data,encoding) {
		encoding || (encoding = this.encoding);
		if(!this.opened) this.open();
		const block = this.blocks[id],
			blen = Buffer.byteLength(data, this.encoding);
		if(block) { // if data already stored
			const pdata = bytePadEnd(data,block[1],this.encoding);
			if(blen <= block[1]) { // and update is same size or smaller
				let result = await asyncyInline(fs,fs.write,this.storefd,pdata,block[0],encoding); // write the data with blank padding
				return; //continue;
			}
		} else {
			this.keys.push(id);
		}
		const freeblock = await this.alloc(blen,encoding), // find a free block large enough
			pdata = bytePadEnd(data,freeblock[1],encoding);
		this.storeSize += freeblock[1];
		this.blocks[id] = freeblock; // update the blocks info
		if(block) { // free old block which was too small, if there was one
			const pdata = bytePadEnd("",(block[1]),encoding);
			this.free.push(block);
			const blankblock = blockString(block,this.encoding)+",";
			let result = await asyncyInline(fs,fs.write,this.storefd,pdata,block[0],encoding); // write blank padding
			result = await asyncyInline(fs,fs.write,this.freefd,blankblock,this.freeSize,encoding);
			this.freeSize += Buffer.byteLength(blankblock,this.encoding);
		}
		await asyncyInline(fs,fs.write,this.storefd,pdata,freeblock[0],encoding); // write the data with blank padding
		freeblock.push(this.blocksSize); // store the offset of the key and its length in with itself
		freeblock.push(Buffer.byteLength(id,this.encoding)+2); // +2 for quotes
		const blockspec = '"'+id+'":'+JSON.stringify(freeblock)+",",
			fposition = this.blockSize;
		this.blocksSize += Buffer.byteLength(blockspec,encoding);
		await asyncyInline(fs,fs.write,this.blocksfd,blockspec,fposition,encoding);
	}
	module.exports = BlockStore;
}).call(this);