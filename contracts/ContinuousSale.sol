pragma solidity ^0.4.12;

import "zeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract ContinuousSale is Crowdsale, Ownable {

  uint256 public lastPurchase;

  uint256 public issuance;

  uint256 public price;

  function ContinuousSale(address _owner, uint256 _issuance, uint256 _price)
  {
    issuance = _issuance;
    price = _price;
  }

  function continuousSaleEnabled() returns(bool) {
    return true;
  }

  function purchaseContinuous(address beneficiary) payable {
    require(block.number > lastPurchase);

    uint256 weiAmount = msg.value;
    uint256 updatedWeiRaised = weiRaised.add(weiAmount);

    // calculate token amount to be created
    uint256 tokens = weiAmount.mul(price);

    token.mint(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    forwardFunds();

    lastPurchase = block.number;
  }

  function setIssuance(uint256 _issuance) onlyOwner {
    issuance = _issuance;
  }

  function setPrice(uint256 _price) onlyOwner {
    price = _price;
  }
}
