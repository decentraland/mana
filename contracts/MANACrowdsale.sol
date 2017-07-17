pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/FinalizableCrowdsale.sol";
import "./ContinuousCrowdsale.sol";
import "./WhitelistedCrowdsale.sol";
import "./MANAToken.sol";

contract MANACrowdsale is ContinuousCrowdsale, CappedCrowdsale, WhitelistedCrowdsale, FinalizableCrowdsale {

    uint256 public constant INFLATION = 8; // percent

    uint256 public constant TOTAL_SHARE = 100;
    uint256 public constant CROWDSALE_SHARE = 40;
    uint256 public constant FOUNDATION_SHARE = 60;

    // price at which whitelisted investors will be able to buy tokens
    uint256 public preferentialRate;

    // change of price in every block during the initial coin offering
    uint256 public rateChange;

    event RateChange(uint256 amount);

    function MANACrowdsale(
        uint256 _startBlock, uint256 _endBlock,
        uint256 _rate, uint256 _rateChange,
        uint256 _preferentialRate,
        address _wallet
    )
        CappedCrowdsale(150000 ether)
        WhitelistedCrowdsale()
        FinalizableCrowdsale()
        Crowdsale(_startBlock, _endBlock, _rate, _wallet)
    {
        rateChange = _rateChange;
        preferentialRate = _preferentialRate;
    }

    function createTokenContract() internal returns (MintableToken) {
        return new MANAToken();
    }

    function getRate() internal returns(uint256) {
        // whitelisted investors can purchase at preferential price before crowdsale ends
        if (isWhitelisted(msg.sender) && !hasEnded()) {
            return preferentialRate;
        }

        // return the current price if we are in continuous sale
        if (continuousSale) {
            return rate;
        }

        // otherwise compute the price for the auction
        return rate.sub(rateChange.mul(block.number - startBlock));
    }

    // low level token purchase function
    function processPurchase(address beneficiary) internal returns(uint256) {
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

        return tokens;
    }

    function setWallet(address _wallet) onlyOwner {
        require(_wallet != 0x0);
        wallet = _wallet;
    }

    function setRate(uint256 _rate) onlyOwner {
        require(isFinalized);
        rate = _rate;
        RateChange(_rate);
    }

    function startContinuousSale() onlyOwner {
        require(isFinalized);
        continuousSale = true;
    }

    function hasEnded() constant returns(bool) {
        return isFinalized || super.hasEnded();
    }

    function finalize() onlyOwner {
        require(!isFinalized);

        finalization();
        Finalized();

        isFinalized = true;
    }

    function finalization() internal {
        uint256 totalSupply = token.totalSupply();
        uint256 finalSupply = TOTAL_SHARE.mul(totalSupply).div(CROWDSALE_SHARE);

        // emit tokens for the foundation
        token.mint(wallet, FOUNDATION_SHARE.mul(finalSupply).div(TOTAL_SHARE));

        // initialize issuance 
        uint256 annualIssuance = finalSupply.div(100).mul(INFLATION);
        issuance = annualIssuance.div(1 years).mul(BUCKET_SIZE);

        // NOTE: cannot call super here because it would finish minting and
        // the continuous sale would not be able to proceed
    }
}
