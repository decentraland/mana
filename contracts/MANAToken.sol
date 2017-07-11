pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "./BurnableToken.sol";

contract MANAToken is BurnableToken, MintableToken {

    string public constant symbol = "MANA";

    string public constant name = "MANA Token";

    uint8 public constant decimals = 8;
}
