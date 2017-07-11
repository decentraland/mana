pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/token/BasicToken.sol';

/**
 * @title Burnable Token
 * @dev A token that can be irreversibly burned.
 */
contract BurnableToken is BasicToken {

	event Burn(address indexed burner, uint256 value);

 /**
  * @dev Burns a specified amount of tokens.
  * @param _value The amount of tokens to burn. 
  */
  function burn(uint256 _value) {
    address burner = msg.sender;
    balances[burner] = balances[burner].sub(_value);
    totalSupply = totalSupply.sub(_value);
		Burn(msg.sender, _value);
  }

}
