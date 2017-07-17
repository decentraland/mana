'use strict'

const { advanceToBlock, ether, EVMThrow } = require('./utils')
const MANACrowdsale = artifacts.require('./MANACrowdsale.sol')
const MANAToken = artifacts.require('./MANAToken.sol')

const BigNumber = web3.BigNumber

contract('MANACrowdsale', function ([_, wallet, wallet2, investor, purchaser, investor2, purchaser2]) {
  const rate = new BigNumber(1000)
  const newRate = new BigNumber(500)
  const rateChange = new BigNumber(100)
  const preferentialRate = new BigNumber(2000)
  const value = ether(1)

  let startBlock, endBlock
  let crowdsale, token

  beforeEach(async function () {
    startBlock = web3.eth.blockNumber + 10
    endBlock = web3.eth.blockNumber + 20

    crowdsale = await MANACrowdsale.new(
      startBlock, endBlock, rate, rateChange, preferentialRate, wallet
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
    await crowdsale.finalize()
    await crowdsale.startContinuousSale().should.be.fulfilled
    const enabled = await crowdsale.continuousSale()
    enabled.should.equal(true)
  })

  it('non-owners should not be able to start continuous sale', async function () {
    await crowdsale.startContinuousSale({from: purchaser}).should.be.rejectedWith(EVMThrow)
  })

  it('rate during auction should at a fixed step every block', async function () {
    let balance

    await advanceToBlock(startBlock - 1)

    await crowdsale.buyTokens(investor, {value, from: purchaser})
    balance = await token.balanceOf(investor)
    balance.should.be.bignumber.equal(value.mul(rate))

    await advanceToBlock(startBlock + 4)

    await crowdsale.buyTokens(investor2, {value, from: purchaser2})
    balance = await token.balanceOf(investor2)
    const rateAtBlock5 = rate.minus(rateChange.mul(5))
    balance.should.be.bignumber.equal(value.mul(rateAtBlock5))
  })

  it('whitelisted buyers should access tokens at reduced price until end of auction', async function () {
    await crowdsale.addToWhitelist(investor)

    await crowdsale.send(value, {from: investor})
    const balance = await token.balanceOf(investor)
    balance.should.be.bignumber.equal(value.mul(preferentialRate))
  })

  it('tokens should be assigned correctly to foundation when finalized', async function () {
    await advanceToBlock(startBlock - 1)

    // since price at first block is 1000, total tokens emitted will be 4000
    await crowdsale.buyTokens(investor, {value: 4, from: purchaser})
    await crowdsale.finalize()
    const balance = await token.balanceOf(wallet)
    balance.should.be.bignumber.equal(new BigNumber(6000))
  })

  it('auction can be finalized early by owner', async function () {
    await advanceToBlock(startBlock + 5)
    await crowdsale.finalize().should.be.fulfilled
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

    await crowdsale.setRate(newRate).should.be.fulfilled
    const updatedRate = await crowdsale.rate()
    updatedRate.should.be.bignumber.equal(newRate)
  })
})
