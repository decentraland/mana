pragma solidity ^0.4.12;

import "zeppelin-solidity/contracts/crowdsale/Crowdsale.sol";

contract ReverseDutchAuction is Crowdsale {

  event BidSubmission(address indexed sender, uint256 amount);

  uint256 startPrice;
  uint256 priceStep;

  function ReverseDutchAuction(uint256 _startPrice, uint256 _priceStep) {
    startPrice = _startPrice;
    priceStep = _priceStep;
  }

	function bid(address beneficiary) public payable {
    require(beneficiary != 0x0);
    require(validPurchase());

    uint256 weiAmount = msg.value;
    uint256 updatedWeiRaised = weiRaised.add(weiAmount);

    // calculate token amount to be created
    uint256 tokens = weiAmount.mul(getPrice());

    // update state
    weiRaised = updatedWeiRaised;

    BidSubmission(msg.sender, weiAmount);

    forwardFunds();
	}

  function claimTokens(address beneficiary) {
    require(canClaimTokens());
  }

  function canClaimTokens() returns(bool) {
    return false;
  }

  function getPrice() returns(uint256) {
    return 0;
  }
}
