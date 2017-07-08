pragma solidity ^0.4.12;

import "zeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "./ContinuousSale.sol";
import "./MANAToken.sol";

contract MANACrowdsale is ContinuousSale, RefundableCrowdsale, CappedCrowdsale {

  enum State {
    Deployed, GeneralSale, ContinuousSale, Failure, Finalized, Refunding
  }

  State public state;

  uint256 step;

  function MANACrowdsale(uint256 _startBlock, uint256 _endBlock, uint256 _startPrice, uint256 _step, address _wallet)
    RefundableCrowdsale(150000 ether)
    CappedCrowdsale(150000 ether)
    Crowdsale(_startBlock, _endBlock, 0, _wallet)
  {
    state = State.Deployed;
    step = _step;
  }

  function createTokenContract() internal returns (MintableToken) {
    return new MANAToken();
  }

  function getRate() returns(uint256) {
    require(block.number >= startBlock && block.number <= endBlock);

    return (block.number - startBlock) * step;
  }

  function bid(address beneficiary) payable {

  }

  function() payable {
    if (state == State.GeneralSale) {
      bid(msg.sender);
    } else if (state == State.ContinuousSale) {
      buyTokens(msg.sender);
    }
  }

  function setWallet(address _wallet) onlyOwner {
    require(_wallet != 0x0);
    wallet = _wallet;
  }

  function continuousSaleEnabled() returns(bool) {
    return state == State.ContinuousSale;
  }

  function getState() returns(State) {
    return State.Deployed;
  }
}
