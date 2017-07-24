// @flow
'use strict'

const { advanceToBlock, ether, should, EVMThrow } = require('./utils')
const MANACrowdsale = artifacts.require('./MANACrowdsale.sol')
const MANAToken = artifacts.require('./MANAToken.sol')

const BigNumber = web3.BigNumber

contract('MANACrowdsale', function ([_, wallet, wallet2, investor, purchaser, investor2, purchaser2]) {
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
    await crowdsale.startContinuousSale().should.be.rejectedWith(EVMThrow)

    await advanceToBlock(endBlock)
    await crowdsale.finalize()

    await crowdsale.startContinuousSale().should.be.fulfilled
    const enabled = await crowdsale.continuousSale()
    enabled.should.equal(true)
  })

  it('non-owners should not be able to start continuous sale', async function () {
    await crowdsale.startContinuousSale({from: purchaser}).should.be.rejectedWith(EVMThrow)
  })

  it('rate during auction should decrease at a fixed step every block', async function () {
    let balance

    await advanceToBlock(startBlock - 1)

    await crowdsale.buyTokens(investor, {value, from: purchaser})
    balance = await token.balanceOf(investor)
    balance.should.be.bignumber.equal(value.mul(rate))

    await advanceToBlock(startBlock + 4)

    await crowdsale.buyTokens(investor2, {value, from: purchaser2})
    balance = await token.balanceOf(investor2)
    const rateAtBlock5 = rate.minus(rateStepDecrease.mul(5))
    balance.should.be.bignumber.equal(value.mul(rateAtBlock5))
  })

  it('whitelisted buyers should access tokens at reduced price until end of auction', async function () {
    await crowdsale.addToWhitelist(investor)

    await crowdsale.buyTokens(investor, {value, from: investor})
    const balance = await token.balanceOf(investor)
    balance.should.be.bignumber.equal(value.mul(preferentialRate))
  })

  it('whitelisted big whale investor should not exceed the cap', async function () {
    const cap = (await crowdsale.cap());
    const overCap = cap.mul(2);
    await crowdsale.addToWhitelist(investor);
    await crowdsale.buyTokens(investor, {value: overCap, from: investor}).should.be.rejectedWith(EVMThrow);
    const balance = await token.balanceOf(investor);
    const raised = await crowdsale.weiRaised();
    balance.should.be.bignumber.equal(0);
    raised.should.be.bignumber.most(cap);
  })

  it('owner can set the price for a particular buyer', async function() {
    await crowdsale.addToWhitelist(investor)

    const preferentialRateForBuyer = new BigNumber(200)
    await crowdsale.setBuyerRate(investor, preferentialRateForBuyer)

    await crowdsale.buyTokens(investor, {value, from: investor})
    const balance = await token.balanceOf(investor)
    balance.should.be.bignumber.equal(value.mul(preferentialRateForBuyer))
    balance.should.not.be.bignumber.equal(value.mul(preferentialRate))
  })

  it('beneficiary is not the same as buyer', async function() {
    const preferentialRateForBuyer = new BigNumber(200)
    const invalidRate = new BigNumber(100)
    const beneficiary = investor2
    await crowdsale.setBuyerRate(investor, preferentialRateForBuyer)
    await crowdsale.setBuyerRate(beneficiary, invalidRate)

    await crowdsale.addToWhitelist(investor)

    await crowdsale.buyTokens(beneficiary, {value, from: investor})
    const balance = await token.balanceOf(beneficiary)
    balance.should.be.bignumber.equal(value.mul(preferentialRateForBuyer))
  })

  it('tokens should be assigned correctly to foundation when finalized', async function () {
    await advanceToBlock(startBlock - 1)

    // since price at first block is 1000, total tokens emitted will be 4000
    await crowdsale.buyTokens(investor, {value: 4, from: purchaser})

    await advanceToBlock(endBlock)
    await crowdsale.finalize()

    const balance = await token.balanceOf(wallet)
    balance.should.be.bignumber.equal(expectedFoundationTokens)

    const totalSupply = await token.totalSupply()
    totalSupply.should.be.bignumber.equal(expectedTokenSupply)
  })

  it('should initialize a continuous issuance rate during finalization', async function () {
    await advanceToBlock(startBlock - 1)

    // since price at first block is 1000, total tokens emitted will be 4000
    await crowdsale.buyTokens(investor, {value: 400, from: purchaser})

    await advanceToBlock(endBlock)
    await crowdsale.finalize()

    // total tokens emitted will be 1000000 (400000 to investor and 600000 to
    // foundation) so issuance must be:
    //
    // seconds in 12 hours: 43200
    // seconds in a year: 31536000
    // 1000000 * 0.08 * 43200 / 31536000 = 109
    const issuance = await crowdsale.issuance()
    issuance.should.be.bignumber.equal(new BigNumber(109))
  })

  it('tokens during continuous sale should be priced at fixed rate', async function () {
    await advanceToBlock(endBlock)
    await crowdsale.finalize()
    await crowdsale.startContinuousSale()

    const issuance = await crowdsale.issuance()
    const amountToBuy = issuance.div(rate)

    await crowdsale.send(amountToBuy, {from: investor})
    const balance = await token.balanceOf(investor)
    balance.should.be.bignumber.equal(issuance)
  })

  it('owner can change rate for continuous sale', async function () {
    await advanceToBlock(endBlock)

    await crowdsale.setRate(newRate).should.be.rejectedWith(EVMThrow)

    await crowdsale.finalize()

    const { logs } = await crowdsale.setRate(newRate)

    const event = logs.find(e => e.event === 'RateChange')
    should.exist(event)

    const updatedRate = await crowdsale.rate()
    updatedRate.should.be.bignumber.equal(newRate)
  })
})
