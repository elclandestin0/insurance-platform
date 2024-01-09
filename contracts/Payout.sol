// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "./PolicyMaker.sol";

contract Payout {
    PolicyMaker policyMaker;

    event ClaimProcessed(uint32 indexed policyId, address indexed policyHolder, uint256 amount, bool approved);

    constructor(address _policyMakerAddress) {
        policyMaker = PolicyMaker(_policyMakerAddress);
    }

    function processClaim(uint32 _policyId, address payable _policyHolder, uint256 _claimAmount) public {
        require(policyMaker.isPolicyOwner(_policyId, _policyHolder), "Not a policy owner");
        require(policyMaker.isActive(_policyId), "Policy is not active");
        // Implement claim verification logic
        bool isClaimValid = verifyClaim(_policyId, _policyHolder, _claimAmount);

        if (isClaimValid) {
            uint256 totalCoverage = policyMaker.calculateTotalCoverage(_policyId, _policyHolder);
            uint256 payoutAmount = _claimAmount > totalCoverage ? totalCoverage : _claimAmount;
            // Perform the payout
            policyMaker.handlePayout(_policyId, _policyHolder, payoutAmount);
            emit ClaimProcessed(_policyId, _policyHolder, payoutAmount, true);
        } else {
            emit ClaimProcessed(_policyId, _policyHolder, 0, false);
        }
    }


    // For now, I made this return just true for simplicity's sake.
    function verifyClaim(uint32 policyId, address policyHolder, uint256 claimAmount) private view returns (bool) {
        return true;
    }
    
}
