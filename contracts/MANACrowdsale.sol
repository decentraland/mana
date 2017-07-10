pragma solidity ^0.4.12;

import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./ContinuousSale.sol";
import "./MANAToken.sol";

contract MANACrowdsale is Ownable, ContinuousSale, CappedCrowdsale {

  // bids in reverse dutch auction
  mapping(address => uint256) bids;

  // final price of the reverse dutch auction
  uint256 public finalPrice;

  // change of price in every block during the reverse dutch auction
  uint256 public step;

  // indicates the start of a continuous supply
  bool public continuousSupply = false;

  event BidSubmission(address indexed bidder, uint256 amount);

  event TokenClaim(address indexed purchaser, address indexed beneficiary, uint256 amount);

  function MANACrowdsale(uint256 _startBlock, uint256 _endBlock, uint256 _startPrice, uint256 _step, address _wallet)
    CappedCrowdsale(150000 ether)
    Crowdsale(_startBlock, _endBlock, _startPrice, _wallet)
  {
    step = _step;
  }

  function createTokenContract() internal returns (MintableToken) {
    return new MANAToken();
  }

	function bid() payable {
    require(validPurchase());

    uint256 weiAmount = msg.value;
    uint256 updatedWeiRaised = weiRaised.add(weiAmount);

    // update state
    weiRaised = updatedWeiRaised;

    bids[msg.sender] = weiAmount;
    BidSubmission(msg.sender, weiAmount);

    forwardFunds();
	}

  function claimTokens(address beneficiary) auctionEnded {
    require(beneficiary != 0x0);
    require(bids[msg.sender] > 0);

    uint256 bidAmount = bids[msg.sender];
    bids[msg.sender] = 0;
    
    uint256 tokens = bidAmount.mul(finalPrice);

    token.mint(beneficiary, tokens);
    TokenClaim(msg.sender, beneficiary, tokens);
  }

  modifier auctionEnded() {
    require(finalPrice != 0);
    _;
  }

  function stopAuction() {
    require(finalPrice == 0);
    finalPrice = getAuctionPrice();
    // TODO: mint additional tokens
  }

  function startContinuousSale() onlyOwner {
    continuousSupply = true;
  }

  function getAuctionPrice() returns(uint256) {
    if (block.number <= startBlock) {
      return rate;
    }
    if (finalPrice != 0) {
      return finalPrice;
    }
    // TODO: finish
    return 0;
  }

  function buyTokens(address beneficiary) payable {
    require(continuousSupply);
    super.buyTokens(beneficiary);
  }

  function forwardFunds() internal {
    wallet.transfer(msg.value);
  }

  function setWallet(address _wallet) onlyOwner {
    require(_wallet != 0x0);
    wallet = _wallet;
  }
}
