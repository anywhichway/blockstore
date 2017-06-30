const BlockStore = require("../index.js"),
	bstore = new BlockStore("./test/data",true,"utf8");

async function test() {
	await bstore.open();
	const testsize = 1000;
	console.log("Test Size:",testsize);
	let start = Date.now();
	for(let i=0;i<testsize;i++) {
		await bstore.set(i+"","test string " + i);
	}
	let end = Date.now();
	console.log("Write Records Sec:", testsize / ((end-start)/1000));
	start = Date.now();
	for(let i=0;i<testsize;i++) {
		await bstore.get(i+"");
	}
	end = Date.now();
	console.log("Read Records Sec:", testsize / ((end-start)/1000));
	console.log((await bstore.get(testsize-1)).toString());
}
test();