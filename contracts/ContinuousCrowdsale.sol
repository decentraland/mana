pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/crowdsale/Crowdsale.sol";

/**
 * @title ContinuousCrowdsale
 * @dev ContinuousCrowdsale implements a contract for managing a continuous token sale
 */
contract ContinuousCrowdsale is Crowdsale {
  // true if continous sale is enabled
  bool public continuousSale = false;

  // time bucket size
  uint256 public constant bucketSize = 12 hours;

  // last time bucket from which tokens have been purchased
  uint256 public lastBucket = 0;

  // amount issued in the last bucket
  uint256 public bucketAmount = 0;

  // max amount of tokens to mint per time bucket
  uint256 public issuance;

  function prepareContinuousPurchase() internal {
    uint256 timestamp = block.timestamp;
    uint256 bucket = timestamp - (timestamp % bucketSize);

    if (bucket > lastBucket) {
      lastBucket = bucket;
      bucketAmount = 0;
    }
  }

  function checkContinuousPurchase(uint256 tokens) internal {
    bucketAmount += tokens;
    require(bucketAmount <= issuance);
  }
}
