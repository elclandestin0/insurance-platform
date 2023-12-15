// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PolicyMaker.sol";
import "hardhat/console.sol";

contract Payout {
    PolicyMaker policyMaker;

    event ClaimProcessed(uint32 indexed policyId, address indexed policyHolder, uint256 amount, bool approved);

    constructor(address policyMakerAddress) {
        policyMaker = PolicyMaker(policyMakerAddress);
    }

    function processClaim(uint32 policyId, address policyHolder, uint256 claimAmount) public {
        require(policyMaker.isPolicyOwner(policyId, policyHolder), "Not a policy owner");
        require(policyMaker.isActive(policyId), "Policy is not active");

        // Implement claim verification logic
        bool isClaimValid = verifyClaim(policyId, policyHolder, claimAmount);
        
        if (isClaimValid) {
            uint256 totalCoverage = policyMaker.calculateTotalCoverage(policyId, policyHolder);
            uint256 payoutAmount = claimAmount > totalCoverage ? totalCoverage : claimAmount;
            // Perform the payout
            policyMaker.handlePayout(policyId, policyHolder, payoutAmount);
            console.log("paid policy holder");
            emit ClaimProcessed(policyId, policyHolder, payoutAmount, true);
        } else {
            emit ClaimProcessed(policyId, policyHolder, 0, false);
        }
    }

    function verifyClaim(uint32 policyId, address policyHolder, uint256 claimAmount) private view returns (bool) {
        // Do middle ware verification in the future.
        // We have to train an AI model to recognize what contract exploits
        // look like. Then we can proceed.
        return true;
    }
}
