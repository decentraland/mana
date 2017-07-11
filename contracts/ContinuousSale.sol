pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/token/MintableToken.sol";

/**
 * @title ContinuousSale
 * @dev ContinuousSale implements a contract for managing a continuous token sale
 */
contract ContinuousSale is Ownable {
  using SafeMath for uint256;

  MintableToken public token;

  // time bucket size
  uint256 public constant bucketSize = 12 hours;

  // last time bucket from which tokens have been purchased
  uint256 public bucketAmount = 0;

  // amount issued in the last bucket
  uint256 public bucketAmount = 0;

  // max amount of tokens to mint per time bucket
  uint256 public issuance;

  // price of wei in terms of tokens
  uint256 public price;

  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

  function buyContinuousTokens(address beneficiary) payable {
    uint256 timestamp = block.timestamp;
    uint256 bucket = timestamp - (timestamp % bucketSize);

    if (bucket > lastBucket) {
      bucketAmount = 0;
    }

    uint256 weiAmount = msg.value;

    // calculate token amount to be created
    uint256 tokens = weiAmount.mul(price);
    bucketAmount += tokens;

    require(bucketAmount <= issuance);

    token.mint(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    forwardFunds();
  }

  function setIssuance(uint256 _issuance) onlyOwner {
    issuance = _issuance;
  }

  function setPrice(uint256 _price) onlyOwner {
    price = _price;
  }

  function forwardFunds() internal;
}
