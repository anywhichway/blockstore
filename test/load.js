const BlockStore = require("../index.js"),
	storage = new BlockStore("./test/data",true,"utf8",true),
	keygen = (length) => {
		const base = Math.random()+"";
		return "k"+base.substring(2,length+1);
	};

// may need to run this file with "node --max-old-space-size=8192 test/load.js"
async function test() {
	const testsize = 100000,
		record = "1".padEnd(1024,"1"),
		maxkeysize = 8;
	for(let i=8;i<maxkeysize+1;i++) {
		console.log("Test Size:",testsize,"Key Size:",i);
		const keys = [];
		let start = Date.now();
		for(let k=0;k<testsize;k++) {
			const key = keys[k] = keygen(i);
			await storage.set(key,record);
		}
		let end = Date.now();
		console.log("Write Records Sec:", Math.round(testsize / ((end-start)/1000)));
		start = Date.now();
		for(let key of keys) {
			await storage.get(key);
		}
		end = Date.now();
		console.log("Cached Read Records Sec:", Math.round(testsize / ((end-start)/1000)));
		storage.cache = false;
		start = Date.now();
		for(let key of keys) {
			await storage.get(key);
		}
		end = Date.now();
		console.log("Uncached Read Records Sec:", Math.round(testsize / ((end-start)/1000)));
		storage.cache = true;
		await storage.clear();
	}
}
test();