// @flow
'use strict'

const expect = require('chai').expect

const { advanceToBlock, ether, should, EVMRevert } = require('./utils')
const MANACrowdsale = artifacts.require('./MANACrowdsale.sol')
const MANAContinuousSale = artifacts.require('./MANAContinuousSale.sol')
const MANAToken = artifacts.require('./MANAToken.sol')

const BigNumber = web3.BigNumber

contract('MANACrowdsale', function([
  _,
  wallet,
  wallet2,
  buyer,
  purchaser,
  buyer2,
  purchaser2
]) {
  const initialRate = new BigNumber(1000)
  const endRate = new BigNumber(900)

  const newRate = new BigNumber(500)
  const preferentialRate = new BigNumber(2000)
  const value = ether(1)

  const expectedFoundationTokens = new BigNumber(6000)
  const expectedTokenSupply = new BigNumber(10000)

  let startBlock, endBlock
  let crowdsale, token

  beforeEach(async function() {
    startBlock = web3.eth.blockNumber + 10
    endBlock = web3.eth.blockNumber + 20

    crowdsale = await MANACrowdsale.new(
      startBlock,
      endBlock,
      initialRate,
      endRate,
      preferentialRate,
      wallet
    )
    token = MANAToken.at(await crowdsale.token())
  })

  it('starts with token paused', async function() {
    const paused = await token.paused()
    paused.should.equal(true)
  })

  it('owner should be able to change wallet', async function() {
    await crowdsale.setWallet(wallet2)
    let wallet = await crowdsale.wallet()
    wallet.should.equal(wallet2)

    const continuousSale = MANAContinuousSale.at(
      await crowdsale.continuousSale()
    )
    wallet = await continuousSale.wallet()
    wallet.should.equal(wallet2)
  })

  it('non-owner should not be able to change wallet', async function() {
    await crowdsale
      .setWallet(wallet2, { from: purchaser })
      .should.be.rejectedWith(EVMRevert)
  })

  it('owner should be able to start continuous sale', async function() {
    await crowdsale.beginContinuousSale().should.be.rejectedWith(EVMRevert)

    await advanceToBlock(endBlock)
    await crowdsale.finalize()

    const sale = MANAContinuousSale.at(await crowdsale.continuousSale())

    let started = await sale.started()
    started.should.equal(false)

    await crowdsale.beginContinuousSale().should.be.fulfilled

    started = await sale.started()
    started.should.equal(true)
  })

  it('owner should be able to unpause token after crowdsale ends', async function() {
    await advanceToBlock(endBlock)

    await crowdsale.unpauseToken().should.be.rejectedWith(EVMRevert)

    await crowdsale.finalize()

    let paused = await token.paused()
    paused.should.equal(true)

    await crowdsale.unpauseToken()

    paused = await token.paused()
    paused.should.equal(false)
  })

  it('non-owners should not be able to start continuous sale', async function() {
    await crowdsale
      .beginContinuousSale({ from: purchaser })
      .should.be.rejectedWith(EVMRevert)
  })

  describe('rate during auction should decrease at a fixed step every block', async function() {
    let balance, startBlock, endBlock

    let initialRate = 9166
    let endRate = 5500
    let preferentialRate = initialRate
    const rateAtBlock10 = new BigNumber(9165)
    const rateAtBlock20 = new BigNumber(9164)
    const rateAtBlock100 = new BigNumber(9155)
    const rateAtBlock2 = new BigNumber(9166)
    const rateAtBlock10000 = new BigNumber(7973)
    const rateAtBlock30000 = new BigNumber(5586)

    beforeEach(async function() {
      startBlock = web3.eth.blockNumber + 10
      endBlock = web3.eth.blockNumber + 10 + 30720

      crowdsale = await MANACrowdsale.new(
        startBlock,
        endBlock,
        initialRate,
        endRate,
        preferentialRate,
        wallet
      )
      token = MANAToken.at(await crowdsale.token())
    })
    it('at start', async function() {
      await advanceToBlock(startBlock - 1)

      await crowdsale.buyTokens(buyer, { value, from: purchaser })
      balance = await token.balanceOf(buyer)
      balance.should.be.bignumber.equal(value.mul(initialRate))
    })

    it('at block 10', async function() {
      await advanceToBlock(startBlock + 9)

      await crowdsale.buyTokens(buyer2, { value, from: purchaser2 })
      balance = await token.balanceOf(buyer2)

      balance.should.be.bignumber.equal(value.mul(rateAtBlock10))
    })

    it('at block 20', async function() {
      await advanceToBlock(startBlock + 19)

      await crowdsale.buyTokens(buyer2, { value, from: purchaser2 })
      balance = await token.balanceOf(buyer2)

      balance.should.be.bignumber.equal(value.mul(rateAtBlock20))
    })

    it('at block 100', async function() {
      await advanceToBlock(startBlock + 99)

      await crowdsale.buyTokens(buyer2, { value, from: purchaser2 })
      balance = await token.balanceOf(buyer2)

      balance.should.be.bignumber.equal(value.mul(rateAtBlock100))
    })

    it('at block 2', async function() {
      await advanceToBlock(startBlock + 1)

      await crowdsale.buyTokens(buyer2, { value, from: purchaser2 })
      balance = await token.balanceOf(buyer2)

      balance.should.be.bignumber.equal(value.mul(rateAtBlock2))
    })

    it.skip('at block 10000', async function() {
      await advanceToBlock(startBlock + 9999)

      await crowdsale.buyTokens(buyer2, { value, from: purchaser2 })
      balance = await token.balanceOf(buyer2)

      balance.should.be.bignumber.equal(value.mul(rateAtBlock10000))
    })

    it.skip('at block 30000', async function() {
      await advanceToBlock(startBlock + 29999)

      await crowdsale.buyTokens(buyer2, { value, from: purchaser2 })
      balance = await token.balanceOf(buyer2)

      balance.should.be.bignumber.equal(value.mul(rateAtBlock30000))
    })
  })

  it('whitelisted buyers should access tokens at reduced price until end of auction', async function() {
    await crowdsale.addToWhitelist(buyer)

    await crowdsale.buyTokens(buyer, { value, from: buyer })
    const balance = await token.balanceOf(buyer)
    balance.should.be.bignumber.equal(value.mul(preferentialRate))
  })

  it('whitelisted big whale investor should not exceed the cap', async function() {
    const cap = await crowdsale.cap()
    const overCap = cap.mul(2)
    await crowdsale.addToWhitelist(buyer)
    await crowdsale
      .buyTokens(buyer, { value: overCap, from: buyer })
      .should.be.rejectedWith(EVMRevert)
    const balance = await token.balanceOf(buyer)
    const raised = await crowdsale.weiRaised()
    balance.should.be.bignumber.equal(0)
    raised.should.be.bignumber.most(cap)
  })

  it('owner can set the price for a particular buyer', async function() {
    await crowdsale.addToWhitelist(buyer)

    const preferentialRateForBuyer = new BigNumber(200)
    const { logs } = await crowdsale.setBuyerRate(
      buyer,
      preferentialRateForBuyer
    )

    const event = logs.find(e => e.event === 'PreferentialRateChange')
    expect(event).to.exist

    await crowdsale.buyTokens(buyer, { value, from: buyer })
    const balance = await token.balanceOf(buyer)
    balance.should.be.bignumber.equal(value.mul(preferentialRateForBuyer))
    balance.should.not.be.bignumber.equal(value.mul(preferentialRate))

    // cannot change rate after crowdsale starts
    await advanceToBlock(startBlock - 1)
    await crowdsale
      .setBuyerRate(buyer, preferentialRateForBuyer)
      .should.be.rejectedWith(EVMRevert)
  })

  it('owner cannot set a custom rate before whitelisting a buyer', async function() {
    await crowdsale
      .setBuyerRate(buyer, new BigNumber(200))
      .should.be.rejectedWith(EVMRevert)
  })

  it('beneficiary is not the same as buyer', async function() {
    const beneficiary = buyer2

    await crowdsale.addToWhitelist(buyer)
    await crowdsale.addToWhitelist(beneficiary)

    const preferentialRateForBuyer = new BigNumber(200)
    const invalidRate = new BigNumber(100)
    await crowdsale.setBuyerRate(buyer, preferentialRateForBuyer)
    await crowdsale.setBuyerRate(beneficiary, invalidRate)

    await crowdsale.buyTokens(beneficiary, { value, from: buyer })
    const balance = await token.balanceOf(beneficiary)
    balance.should.be.bignumber.equal(value.mul(preferentialRateForBuyer))
  })

  it('tokens should be assigned correctly to foundation when finalized', async function() {
    await advanceToBlock(startBlock - 1)

    // since price at first block is 1000, total tokens emitted will be 4000
    await crowdsale.buyTokens(buyer, { value: 4, from: purchaser })

    await advanceToBlock(endBlock)
    await crowdsale.finalize()

    const balance = await token.balanceOf(wallet)
    balance.should.be.bignumber.equal(expectedFoundationTokens)

    const totalSupply = await token.totalSupply()
    totalSupply.should.be.bignumber.equal(expectedTokenSupply)
  })
})
