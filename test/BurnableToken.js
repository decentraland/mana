'use strict';

const { assertRevert } = require('./utils.js')
const BurnableTokenMock = artifacts.require("./helpers/BurnableTokenMock.sol")

contract('BurnableToken', function(accounts) {
  let token

  beforeEach(async function() {
    token = await BurnableTokenMock.new(accounts[1], 1000)
  });

  it("owner should be able to burn tokens", async function() {
    await token.burn(100, { from: accounts[1] })

		const balance = await token.balanceOf(accounts[1])
    assert.equal(balance, 900);

		const totalSupply = await token.totalSupply()
		assert.equal(totalSupply, 900)
  });

  it("cannot burn more tokens that you have", async function() {
		await assertRevert(async function() {
    	await token.burn(2000, { from: accounts[1] })
		})
  });
});
