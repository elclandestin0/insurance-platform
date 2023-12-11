// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PolicyMaker is Ownable {
    struct Policy {
        uint256 coverageAmount;
        uint256 premiumRate;
        uint256 duration;
        bool isActive;
        mapping(address => bool) claimants;
    }

    mapping(uint256 => Policy) public policies;
    uint256 public nextPolicyId;

    function createPolicy(uint256 _coverageAmount, uint256 _premiumRate, uint256 _duration) public onlyOwner {
        address[] memory claimants;
        policies[nextPolicyId] = Policy(_coverageAmount, _premiumRate, _duration, true, claimants);
        nextPolicyId++;
    }
    
    function updatePolicy(uint256 _policyId, uint256 _coverageAmount, uint256 _premiumRate, uint256 _duration) public onlyOwner {
        policies[_policyId].coverageAmount = _coverageAmount;
        policies[_policyId].premiumRate = _premiumRate;
        policies[_policyId].duration = _duration;
    }
    
    function updatePolicy(uint256 _policyId, uint256 _coverageAmount, uint256 _premiumRate, uint256 _duration) public onlyOwner {
        policies[_policyId].coverageAmount = _coverageAmount;
        policies[_policyId].premiumRate = _premiumRate;
        policies[_policyId].duration = _duration;
    }

    function addClaimantToPolicy(uint256 _policyId, address _claimant) public {
        // Ensure policy exists and the function caller has the authority to add a claimant
        policies[_policyId].claimants.push(_claimant);
    }
    
    function deactivatePolicy(uint256 _policyId) public onlyOwner {
        policies[_policyId].isActive = false;
    }

    function isClaimant(uint256 _policyId, address _claimant) public view returns (bool) {
        return policies[_policyId].claimants(_claimant);
    }
    
}
