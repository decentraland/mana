pragma solidity ^0.4.11;

import '../../contracts/ContinuousCrowdsale.sol';

contract ContinuousCrowdsaleMock is ContinuousCrowdsale {

    function ContinuousCrowdsaleMock(
        uint256 _startBlock,
        uint256 _endBlock,
        uint256 _rate,
        address _wallet
    )
        Crowdsale(_startBlock, _endBlock, _rate, _wallet)
    {
    }

    function startContinuousSale() {
        continuousSale = true;
    }

    function setIssuance(uint256 _issuance) {
        issuance = _issuance;
    }
}
