// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PolicyMaker is Ownable {
    struct Policy {
        uint256 coverageAmount;
        uint256 premiumRate;
        uint256 duration;
        bool isActive;
    }

    mapping(uint256 => Policy) public policies;
    uint256 public nextPolicyId;

    function createPolicy(uint256 _coverageAmount, uint256 _premiumRate, uint256 _duration) public onlyOwner {
        policies[nextPolicyId] = Policy(_coverageAmount, _premiumRate, _duration, true);
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
    
    function deactivatePolicy(uint256 _policyId) public onlyOwner {
        policies[_policyId].isActive = false;
    }
}
