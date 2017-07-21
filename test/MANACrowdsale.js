// @flow
'use strict'

const { advanceToBlock, ether, should, EVMThrow } = require('./utils')
const MANACrowdsale = artifacts.require('./MANACrowdsale.sol')
const MANAContinuousSale = artifacts.require('./MANAContinuousSale.sol')
const MANAToken = artifacts.require('./MANAToken.sol')

const BigNumber = web3.BigNumber

contract('MANACrowdsale', function ([_, wallet, wallet2, buyer, purchaser, buyer2, purchaser2]) {
  const rate = new BigNumber(1000)
  const newRate = new BigNumber(500)
  const rateStepDecrease = new BigNumber(10)
  const preferentialRate = new BigNumber(2000)
  const value = ether(1)

  const expectedFoundationTokens = new BigNumber(6000)
  const expectedTokenSupply = new BigNumber(10000)

  let startBlock, endBlock
  let crowdsale, token

  beforeEach(async function () {
    startBlock = web3.eth.blockNumber + 10
    endBlock = web3.eth.blockNumber + 20

    crowdsale = await MANACrowdsale.new(
      startBlock,
      endBlock,
      rate,
      rateStepDecrease,
      preferentialRate,
      wallet
    )
    token = MANAToken.at(await crowdsale.token())
  })

  it('owner should be able to change wallet', async function () {
    await crowdsale.setWallet(wallet2)
    const wallet = await crowdsale.wallet()
    wallet.should.equal(wallet2)
  })

  it('non-owner should not be able to change wallet', async function () {
    await crowdsale.setWallet(wallet2, {from: purchaser}).should.be.rejectedWith(EVMThrow)
  })

  it('owner should be able to start continuous sale', async function () {
    await crowdsale.beginContinuousSale().should.be.rejectedWith(EVMThrow)

    await advanceToBlock(endBlock)
    await crowdsale.finalize()

    const sale = MANAContinuousSale.at(await crowdsale.continuousSale())

    let started = await sale.started()
    started.should.equal(false)

    await crowdsale.beginContinuousSale().should.be.fulfilled

    started = await sale.started()
    started.should.equal(true)
  })

  it('non-owners should not be able to start continuous sale', async function () {
    await crowdsale.beginContinuousSale({from: purchaser}).should.be.rejectedWith(EVMThrow)
  })

  it('rate during auction should decrease at a fixed step every block', async function () {
    let balance

    await advanceToBlock(startBlock - 1)

    await crowdsale.buyTokens(buyer, {value, from: purchaser})
    balance = await token.balanceOf(buyer)
    balance.should.be.bignumber.equal(value.mul(rate))

    await advanceToBlock(startBlock + 4)

    await crowdsale.buyTokens(buyer2, {value, from: purchaser2})
    balance = await token.balanceOf(buyer2)
    const rateAtBlock5 = rate.minus(rateStepDecrease.mul(5))
    balance.should.be.bignumber.equal(value.mul(rateAtBlock5))
  })

  it('whitelisted buyers should access tokens at reduced price until end of auction', async function () {
    await crowdsale.addToWhitelist(buyer)

    await crowdsale.buyTokens(buyer, {value, from: buyer})
    const balance = await token.balanceOf(buyer)
    balance.should.be.bignumber.equal(value.mul(preferentialRate))
  })

  it('whitelisted big whale investor should not exceed the cap', async function () {
    const cap = (await crowdsale.cap());
    const overCap = cap.mul(2);
    await crowdsale.addToWhitelist(buyer);
    await crowdsale.buyTokens(buyer, {value: overCap, from: buyer}).should.be.rejectedWith(EVMThrow);
    const balance = await token.balanceOf(buyer);
    const raised = await crowdsale.weiRaised();
    balance.should.be.bignumber.equal(0);
    raised.should.be.bignumber.most(cap);
  })

  it('owner can set the price for a particular buyer', async function() {
    await crowdsale.addToWhitelist(buyer)

    const preferentialRateForBuyer = new BigNumber(200)
    await crowdsale.setBuyerRate(buyer, preferentialRateForBuyer)

    await crowdsale.buyTokens(buyer, {value, from: buyer})
    const balance = await token.balanceOf(buyer)
    balance.should.be.bignumber.equal(value.mul(preferentialRateForBuyer))
    balance.should.not.be.bignumber.equal(value.mul(preferentialRate))
  })

  it('beneficiary is not the same as buyer', async function() {
    const preferentialRateForBuyer = new BigNumber(200)
    const invalidRate = new BigNumber(100)
    const beneficiary = buyer2
    await crowdsale.setBuyerRate(buyer, preferentialRateForBuyer)
    await crowdsale.setBuyerRate(beneficiary, invalidRate)

    await crowdsale.addToWhitelist(buyer)

    await crowdsale.buyTokens(beneficiary, {value, from: buyer})
    const balance = await token.balanceOf(beneficiary)
    balance.should.be.bignumber.equal(value.mul(preferentialRateForBuyer))
  })

  it('tokens should be assigned correctly to foundation when finalized', async function () {
    await advanceToBlock(startBlock - 1)

    // since price at first block is 1000, total tokens emitted will be 4000
    await crowdsale.buyTokens(buyer, {value: 4, from: purchaser})

    await advanceToBlock(endBlock)
    await crowdsale.finalize()

    const balance = await token.balanceOf(wallet)
    balance.should.be.bignumber.equal(expectedFoundationTokens)

    const totalSupply = await token.totalSupply()
    totalSupply.should.be.bignumber.equal(expectedTokenSupply)
  })
})
