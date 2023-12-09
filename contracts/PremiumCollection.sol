pragma solidity ^0.8.0;

import {PolicyMaker} from "./PolicyMaker.sol";

contract PremiumCollection {
    PolicyMaker policyMakerContract;
    mapping(uint256 => mapping(address => uint256)) public premiumsPaid; // PolicyID -> Claimant -> Amount

    constructor(address _policyMakerContractAddress) {
        policyMakerContract = PolicyMaker(_policyMakerContractAddress);
    }

    function payPremium(uint256 _policyId) public payable  {
        require(policyMakerContract.isClaimant(_policyId, msg.sender), "Not a claimant of this policy!");
        premiumsPaid[_policyId][msg.sender] += msg.value;
    }
    

    // Additional functions like checking premium status, refunding premiums, etc.
}
