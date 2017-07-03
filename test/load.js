const BlockStore = require("../index.js"),
	storage = new BlockStore("./test/data",true,"utf8"),
	keygen = (length) => {
		const base = Math.random()+"";
		return "k"+base.substring(2,length+1);
	};

async function test() {
	const testsize = 100000,
		maxkeysize = 16;
	for(let i=2;i<maxkeysize;i++) {
		console.log("Test Size:",testsize,"Key Size:",i);
		const keys = [];
		let start = Date.now();
		for(let k=0;k<testsize;k++) {
			const key = keys[k] = keygen(i);
			await storage.set(key,"test string " + k);
		}
		let end = Date.now();
		console.log("Write Records Sec:", testsize / ((end-start)/1000));
		start = Date.now();
		for(let key of keys) {
			await storage.get(key);
		}
		end = Date.now();
		console.log("Read Records Sec:", testsize / ((end-start)/1000));
		console.log("Last Key:",keys[keys.length-1],"Data:",(await storage.get(keys[keys.length-1])).toString());
		await storage.clear();
	}
}
test();