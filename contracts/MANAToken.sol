pragma solidity ^0.4.12;

import "zeppelin-solidity/contracts/token/MintableToken.sol";

contract MANAToken is MintableToken {

  string public constant symbol = "MANA";
  string public constant name = "MANA Token";
  uint8 public constant decimals = 8;

  function burn(uint256 _value) {
    address burner = msg.sender;
    balances[burner] = balances[burner].sub(_value);
    totalSupply = totalSupply.sub(_value);
  }

}
