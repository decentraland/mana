pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/FinalizableCrowdsale.sol";
import "./ContinuousCrowdsale.sol";
import "./WhitelistedCrowdsale.sol";
import "./MANAToken.sol";

contract MANACrowdsale is ContinuousCrowdsale, CappedCrowdsale, WhitelistedCrowdsale, FinalizableCrowdsale {

	uint256 public constant TOTAL_SHARE = 100;
	uint256 public constant CROWDSALE_SHARE = 40;
	uint256 public constant FOUNDATION_SHARE = 60;

  // price at which whitelisted investors will be able to buy tokens
  uint256 public preferentialPrice;

  // price of the tokens. This will be fixed only when crowdsale ends
  uint256 public price;

  // change of price in every block during the initial coin offering
  uint256 public priceStep;

  event PriceChange(uint256 amount);

  event TokenClaim(address indexed purchaser, address indexed beneficiary, uint256 amount);

  function MANACrowdsale(
    uint256 _startBlock, uint256 _endBlock,
    uint256 _startPrice, uint256 _priceStep,
    uint256 _preferentialPrice,
    address _wallet
  )
    CappedCrowdsale(150000 ether)
    WhitelistedCrowdsale()
    FinalizableCrowdsale()
    Crowdsale(_startBlock, _endBlock, _startPrice, _wallet)
  {
    priceStep = _priceStep;
    preferentialPrice = _preferentialPrice;
  }

  function createTokenContract() internal returns (MintableToken) {
    return new MANAToken();
  }

  function stopAuction() {
    require(!hasEnded());
    price = getPrice(0x0);
  }

  function getPrice(address beneficiary) internal returns(uint256) {
    // whitelisted investors can purchase at preferential price before crowdsale ends
    if (isWhitelisted(beneficiary) && !hasEnded()) {
      return preferentialPrice;
    }

    // if there is no price set, we are in auction mode
    if (price == 0) {
      return rate.add(priceStep.mul(block.number - startBlock));
    }

    // return the current price if auction ended
    return price;
  }

  function buyTokens(address beneficiary) payable {
    require(beneficiary != 0x0);

    if (continuousSale) {
      prepareContinuousPurchase();
      uint256 tokens = buyTokensInternal(beneficiary);
      checkContinuousPurchase(tokens);
    } else {
      require(validPurchase());
      buyTokensInternal(beneficiary);
    }
  }

  // low level token purchase function
  function buyTokensInternal(address beneficiary) internal returns(uint256) {
    uint256 weiAmount = msg.value;
    uint256 updatedWeiRaised = weiRaised.add(weiAmount);

    // calculate token amount to be created
    uint256 tokens = weiAmount.mul(getPrice(beneficiary));

    // update state
    weiRaised = updatedWeiRaised;

    token.mint(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    forwardFunds();

    return tokens;
  }

  function setWallet(address _wallet) onlyOwner {
    require(_wallet != 0x0);
    wallet = _wallet;
  }

  function setPrice(uint256 _price) onlyOwner {
    require(continuousSale);

    price = _price;
    PriceChange(_price);
  }

  function startContinuousSale() onlyOwner {
    continuousSale = true;
  }

	function assignFoundationTokens() internal {
    uint256 totalSupply = token.totalSupply();
    uint256 finalSupply = TOTAL_SHARE.mul(totalSupply).div(CROWDSALE_SHARE);

		// emit tokens for the foundation
    token.mint(wallet, FOUNDATION_SHARE.mul(finalSupply).div(TOTAL_SHARE));
  }

  function finalization() internal {
		assignFoundationTokens();
		super.finalization();
  }
}
