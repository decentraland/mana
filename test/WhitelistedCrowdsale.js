// @flow
import { ether, EVMRevert } from './utils'

const BigNumber = web3.BigNumber

const WhitelistedCrowdsale = artifacts.require(
  './helpers/WhitelistedCrowdsaleImpl.sol'
)
const MintableToken = artifacts.require(
  'zeppelin-solidity/contracts/tokens/MintableToken'
)

contract('WhitelistCrowdsale', function([
  _,
  owner,
  wallet,
  beneficiary,
  sender
]) {
  const rate = new BigNumber(1000)

  beforeEach(async function() {
    this.startBlock = web3.eth.blockNumber + 10
    this.endBlock = this.startBlock + 10

    this.crowdsale = await WhitelistedCrowdsale.new(
      this.startBlock,
      this.endBlock,
      rate,
      wallet,
      { from: owner }
    )

    this.token = MintableToken.at(await this.crowdsale.token())
  })

  describe('whitelisting', function() {
    const amount = ether(1)

    it('should add address to whitelist', async function() {
      let whitelisted = await this.crowdsale.isWhitelisted(sender)
      whitelisted.should.equal(false)
      await this.crowdsale.addToWhitelist(sender, { from: owner })
      whitelisted = await this.crowdsale.isWhitelisted(sender)
      whitelisted.should.equal(true)
    })

    it('should reject non-whitelisted sender', async function() {
      await this.crowdsale
        .buyTokens(beneficiary, { value: amount, from: sender })
        .should.be.rejectedWith(EVMRevert)
    })

    it('should sell to whitelisted address', async function() {
      await this.crowdsale.addToWhitelist(sender, { from: owner })
      await this.crowdsale.buyTokens(beneficiary, {
        value: amount,
        from: sender
      }).should.be.fulfilled
    })
  })
})
