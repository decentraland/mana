pragma solidity ^0.4.12;

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

	// max amount of tokens to mint per block
  uint256 public issuance;

	// price of wei in terms of tokens
  uint256 public price;

	// last time the buyTokens function was called
  uint256 public lastPurchase = 0;
  
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

  function buyTokens(address beneficiary) payable {
    require(block.number > lastPurchase);

		uint256 weiAmount = msg.value;

    // calculate token amount to be created
    uint256 tokens = weiAmount.mul(price);
		require(tokens <= issuance);

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

  function forwardFunds() internal;

  function getToken() internal;
}
