pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/crowdsale/Crowdsale.sol";

/**
 * @title ContinuousCrowdsale
 * @dev ContinuousCrowdsale implements a contract for managing a continuous token sale
 */
contract ContinuousCrowdsale is Crowdsale {
    // time bucket size
    uint256 public constant BUCKET_SIZE = 12 hours;

    // true if continous sale is enabled
    bool public continuousSale = false;

    // last time bucket from which tokens have been purchased
    uint256 public lastBucket = 0;

    // amount issued in the last bucket
    uint256 public bucketAmount = 0;

    // max amount of tokens to mint per time bucket
    uint256 public issuance = 0;

    function buyTokens(address beneficiary) payable {
        require(beneficiary != 0x0);

        if (continuousSale) {
            prepareContinuousPurchase();
            uint256 tokens = processPurchase(beneficiary);
            checkContinuousPurchase(tokens);
        } else {
            require(validPurchase());
            processPurchase(beneficiary);
        }
    }

    function prepareContinuousPurchase() internal {
        uint256 timestamp = block.timestamp;
        uint256 bucket = timestamp - (timestamp % BUCKET_SIZE);

        if (bucket > lastBucket) {
            lastBucket = bucket;
            bucketAmount = 0;
        }
    }

    function checkContinuousPurchase(uint256 tokens) internal {
        bucketAmount += tokens;
        require(bucketAmount <= issuance);
    }

    function processPurchase(address beneficiary) internal returns(uint256) {
		uint256 weiAmount = msg.value;
		uint256 updatedWeiRaised = weiRaised.add(weiAmount);

		// calculate token amount to be created
		uint256 tokens = weiAmount.mul(rate);

		// update state
		weiRaised = updatedWeiRaised;

		token.mint(beneficiary, tokens);
		TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

		forwardFunds();

		return tokens;
    }
}
