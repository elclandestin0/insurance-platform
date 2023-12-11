pragma solidity ^0.8.0;

import { PolicyMaker } from "./PolicyMaker.sol";

contract PremiumCollection {
    PolicyMaker policyMaker;
    mapping(uint256 => mapping(address => uint256)) public premiumsPaid; // PolicyID -> Claimant -> Amount

    constructor(address _policyMakerContractAddress) {
        policyMaker = PolicyMaker(_policyMakerContractAddress);
    }
    
    function payInitialPremium(uint256) public payable  {
        require(msg.value >= policyMaker.policies[_policyId].premiumRate, "Can't afford the rate!");
        policyMaker.policies[_policyId].claimants[msg.sender] = true;
    }

    function payPremium(uint256 _policyId) public payable  {
        require(policyMaker.isClaimant(_policyId, msg.sender), "Not a claimant of this policy!");
        require(msg.value >= policyMaker.policies[_policyId].premiumRate, "Can't afford the rate!");
        premiumsPaid[_policyId][msg.sender] += msg.value;
    }
    

    // Additional functions like checking premium status, refunding premiums, etc.
}
