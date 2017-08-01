// @flow
'use strict'

const { EVMThrow } = require('./utils')
const MANAToken = artifacts.require('./MANAToken.sol')

const BigNumber = web3.BigNumber

contract('MANACrowdsale', function ([owner, holder]) {

  let token

  beforeEach(async function () {
    token = await MANAToken.new()
  })

  it('cannot burn tokens while paused', async function () {
    await token.mint(holder, 1000)
    await token.pause()
    await token.burn(500, { from: holder }).should.be.rejectedWith(EVMThrow)

    await token.unpause()
    await token.burn(500, { from: holder }).should.be.fulfilled
  })
})
