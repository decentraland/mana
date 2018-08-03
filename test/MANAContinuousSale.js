// @flow
'use strict'

const expect = require('chai').expect
const { advanceTime, EVMRevert } = require('./utils')
const MANAContinuousSale = artifacts.require('./MANAContinuousSale.sol')
const MANAToken = artifacts.require('./MANAToken.sol')

const BigNumber = web3.BigNumber

contract('MANAContinuousSale', function([owner, wallet, buyer, wallet2]) {
  const rate = new BigNumber(1)
  const newRate = new BigNumber(2)
  const value = new BigNumber(100)

  let token, sale

  beforeEach(async function() {
    token = await MANAToken.new()
    await token.pause()
    await token.mint(owner, new BigNumber(1000000))

    sale = await MANAContinuousSale.new(rate, wallet, token.address)
    await token.transferOwnership(sale.address)
  })

  it('should start with continuous sale disabled', async function() {
    let started = await sale.started()
    started.should.equal(false)

    await sale.start()
    started = await sale.started()
    started.should.equal(true)
  })

  it('owner should be able to pause/unpause token', async function() {
    await sale.unpauseToken().should.be.fulfilled
    let paused = await token.paused()
    paused.should.equal(false)

    await sale.pauseToken().should.be.fulfilled
    paused = await token.paused()
    paused.should.equal(true)
  })

  it('non-owners should not be able to pause/unpause token', async function() {
    await sale.unpauseToken({ from: buyer }).should.be.rejectedWith(EVMRevert)

    await sale.unpauseToken({ from: owner })
    await sale.pauseToken({ from: buyer }).should.be.rejectedWith(EVMRevert)
  })

  it('should accept payments only if sale has started', async function() {
    await sale.send(value, { from: buyer }).should.be.rejectedWith(EVMRevert)
    await sale.start().should.be.fulfilled
    await sale.buyTokens(buyer, {
      value: new BigNumber(100),
      from: buyer
    }).should.be.fulfilled
  })

  it('only owner can change rate', async function() {
    await sale
      .setRate(newRate, { from: buyer })
      .should.be.rejectedWith(EVMRevert)

    const { logs } = await sale.setRate(newRate)

    const event = logs.find(e => e.event === 'RateChange')
    expect(event).to.exist

    const updatedRate = await sale.rate()
    updatedRate.should.be.bignumber.equal(newRate)
  })

  it('only owner can change wallet', async function() {
    await sale
      .setRate(newRate, { from: buyer })
      .should.be.rejectedWith(EVMRevert)

    const { logs } = await sale.setRate(newRate)

    const event = logs.find(e => e.event === 'RateChange')
    expect(event).to.exist

    const updatedRate = await sale.rate()
    updatedRate.should.be.bignumber.equal(newRate)
  })

  it('should reject payments if amount of tokens is bigger than block bucket', async function() {
    await sale.start()
    await sale
      .send(new BigNumber(1000), { from: buyer })
      .should.be.rejectedWith(EVMRevert)
  })

  it('should start with a fixed issuance rate', async function() {
    // total tokens emitted are 1000000 so issuance must be:
    //
    // seconds in 12 hours: 43200
    // seconds in a year: 31536000
    // 1000000 * 0.08 * 43200 / 31536000 = 109
    let issuance = await sale.issuance()
    issuance.should.be.bignumber.equal(new BigNumber(0))

    await sale.start()
    issuance = await sale.issuance()
    issuance.should.be.bignumber.equal(new BigNumber(109))
  })

  it('should handle time buckets for token issuance', async function() {
    await sale.start()

    await sale.buyTokens(buyer, { value, from: buyer }).should.be.fulfilled
    await sale
      .buyTokens(buyer, { value, from: buyer })
      .should.be.rejectedWith(EVMRevert)

    const bucketSize = await sale.BUCKET_SIZE()
    await advanceTime(bucketSize)

    await sale.buyTokens(buyer, { value, from: buyer }).should.be.fulfilled
  })
})
