const BlockStore = require("../index.js"),
	storage = new BlockStore("./test/data",{clear:false}),
	expect = require("chai").expect;

describe("tests",function() {
	it("should set, get, delete, set, compress",done => {
		storage.set("testid1","test data").then(() => {
			storage.get("testid1").then(data => {
				expect(data.toString()).to.equal("test data");
				storage.delete("testid1").then(result => {
					expect(result).to.equal(true);
					storage.get("testid1").then(data => {
						expect(data).to.equal(undefined);
						storage.set("testid1","longer test data").then( async () => {
							const stats = await storage.compress();
							expect(stats.after.blocks).to.be.lessThan(stats.before.blocks);
							expect(stats.after.store).to.be.lessThan(stats.before.store);
							expect(stats.after.store).to.equal(16);
							done();
						});
					});
				});
			});
		});
	});
});