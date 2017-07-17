'use strict'

const { advanceTime, advanceToBlock, ether, EVMThrow } = require('./utils')
const ContinuousCrowdsaleMock = artifacts.require('./helpers/ContinuousCrowdsaleMock.sol')

const BigNumber = web3.BigNumber

contract('ContinuousCrowdsale', function ([_, investor, wallet, purchaser]) {
  const rate = new BigNumber(1)
  const value = ether(1)

  let startBlock, endBlock
  let crowdsale

  beforeEach(async function () {
    startBlock = web3.eth.blockNumber + 10
    endBlock = web3.eth.blockNumber + 20

    crowdsale = await ContinuousCrowdsaleMock.new(startBlock, endBlock, rate, wallet)
  })

  it('should start with continuous sale disabled', async function () {
    const enabled = await crowdsale.continuousSale()
    enabled.should.equal(false)
  })

  describe('initial crowdsale rules', function () {
    it('should reject payments before start', async function () {
      await crowdsale.send(value).should.be.rejectedWith(EVMThrow)
      await crowdsale.buyTokens(investor, value, {from: purchaser}).should.be.rejectedWith(EVMThrow)
    })

    it('should accept payments after start', async function () {
      await advanceToBlock(startBlock - 1)
      await crowdsale.send(value).should.be.fulfilled
      await crowdsale.buyTokens(investor, {value: value, from: purchaser}).should.be.fulfilled
    })

    it('should reject payments after end', async function () {
      await advanceToBlock(endBlock)
      await crowdsale.send(value).should.be.rejectedWith(EVMThrow)
      await crowdsale.buyTokens(investor, {value: value, from: purchaser}).should.be.rejectedWith(EVMThrow)
    })
  })

  describe('continuous sale rules', function () {
    it('should accept payments if continuous sale is enabled', async function () {
      await advanceToBlock(endBlock)

      await crowdsale.setIssuance(value)
      await crowdsale.startContinuousSale()

      await crowdsale.send(value).should.be.fulfilled
    })

    it('should reject payments if amount of tokens is bigger than block bucket', async function () {
      await advanceToBlock(endBlock)

      await crowdsale.setIssuance(value.minus(100))
      await crowdsale.startContinuousSale()

      await crowdsale.send(value).should.be.rejectedWith(EVMThrow)
    })

    // TODO: this test is not very resilient
    it('should handle time buckets for token issuance', async function () {
      await advanceToBlock(endBlock)

      const bucketSize = await crowdsale.BUCKET_SIZE()

      await crowdsale.setIssuance(value)
      await crowdsale.startContinuousSale()

      await crowdsale.send(value).should.be.fulfilled
      await crowdsale.send(value).should.be.rejectedWith(EVMThrow)

      await advanceTime(bucketSize)
      await crowdsale.send(value).should.be.fulfilled
    })
  })
})
