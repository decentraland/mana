pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/FinalizableCrowdsale.sol";
import "./WhitelistedCrowdsale.sol";
import "./MANAContinuousSale.sol";
import "./MANAToken.sol";

contract MANACrowdsale is WhitelistedCrowdsale, CappedCrowdsale, FinalizableCrowdsale {

    uint256 public constant TOTAL_SHARE = 100;
    uint256 public constant CROWDSALE_SHARE = 40;
    uint256 public constant FOUNDATION_SHARE = 60;

    // price at which whitelisted buyers will be able to buy tokens
    uint256 public preferentialRate;

    // customize the rate for each whitelisted buyer
    mapping (address => uint256) public buyerRate;

    // change of price in every block during the initial coin offering
    uint256 public rateStepDecrease;

    // continuous crowdsale contract
    MANAContinuousSale public continuousSale;

    event WalletChange(address wallet);

    function MANACrowdsale(
        uint256 _startBlock,
        uint256 _endBlock,
        uint256 _rate,
        uint256 _rateStepDecrease,
        uint256 _preferentialRate,
        address _wallet
    )
        CappedCrowdsale(150000 ether)
        WhitelistedCrowdsale()
        FinalizableCrowdsale()
        Crowdsale(_startBlock, _endBlock, _rate, _wallet)
    {
        require(_rateStepDecrease > 0);
        require(_preferentialRate > 0);
        require(_rate > _rateStepDecrease * (1 + _endBlock - _startBlock));

        rateStepDecrease = _rateStepDecrease;
        preferentialRate = _preferentialRate;

        continuousSale = createContinuousSaleContract();
    }

    function createTokenContract() internal returns(MintableToken) {
        return new MANAToken();
    }

    function createContinuousSaleContract() internal returns(MANAContinuousSale) {
        return new MANAContinuousSale(rate, wallet, token);
    }

    function setBuyerRate(address buyer, uint256 rate) onlyOwner public {
        require(buyer != 0);
        require(rate != 0);

        buyerRate[buyer] = rate;
    }

    function getRate() internal returns(uint256) {
        // some early buyers are offered a discount on the crowdsale price
        if (buyerRate[msg.sender] != 0) {
            return buyerRate[msg.sender];
        }

        // whitelisted buyers can purchase at preferential price before crowdsale ends
        if (isWhitelisted(msg.sender)) {
            return preferentialRate;
        }

        // otherwise compute the price for the auction
        return rate.sub(rateStepDecrease.mul(block.number - startBlock));
    }

    // low level token purchase function
    function buyTokens(address beneficiary) payable {
        require(beneficiary != 0x0);
        require(validPurchase());

        uint256 weiAmount = msg.value;
        uint256 updatedWeiRaised = weiRaised.add(weiAmount);

        uint256 rate = getRate();
        // calculate token amount to be created
        uint256 tokens = weiAmount.mul(rate);

        // update state
        weiRaised = updatedWeiRaised;

        token.mint(beneficiary, tokens);
        TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

        forwardFunds();
    }

    function setWallet(address _wallet) onlyOwner public {
        require(_wallet != 0x0);
        wallet = _wallet;
        WalletChange(_wallet);
    }

    function beginContinuousSale() onlyOwner public {
        require(isFinalized);

        token.transferOwnership(continuousSale);

        continuousSale.start();
        continuousSale.transferOwnership(owner);
    }

    function finalization() internal {
        uint256 totalSupply = token.totalSupply();
        uint256 finalSupply = TOTAL_SHARE.mul(totalSupply).div(CROWDSALE_SHARE);

        // emit tokens for the foundation
        token.mint(wallet, FOUNDATION_SHARE.mul(finalSupply).div(TOTAL_SHARE));

        // NOTE: cannot call super here because it would finish minting and
        // the continuous sale would not be able to proceed
    }

}
