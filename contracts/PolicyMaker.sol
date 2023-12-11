// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PolicyMaker is Ownable {
    struct Policy {
        uint256 coverageAmount;
        uint256 premiumRate;
        uint32 duration;
        bool isActive;
    }

    mapping(uint256 => Policy) public policies;
    mapping(uint256 => mapping(address => bool)) public policyClaimants;
    uint256 public nextPolicyId = 1;

    function createPolicy(uint256 _coverageAmount, uint256 _premiumRate, uint256 _duration) public onlyOwner {
        policies[nextPolicyId] = Policy(_coverageAmount, _premiumRate, _duration, true, claimants);
        nextPolicyId++;
    }
    
    function updatePolicy(uint256 _policyId, uint256 _coverageAmount, uint256 _premiumRate, uint256 _duration) public onlyOwner {
        policies[_policyId].coverageAmount = _coverageAmount;
        policies[_policyId].premiumRate = _premiumRate;
        policies[_policyId].duration = _duration;
    }

    function getPolicyDetails(uint256 _policyId)
    public
    view
    returns (
        uint256 coverageAmount,
        uint256 premiumRate,
        uint256 duration,
        bool isActive
    )
    {
        Policy memory policy = policies[_policyId];
        return (policy.coverageAmount, policy.premiumRate, policy.duration, policy.isActive);
    }
    
    function deactivatePolicy(uint256 _policyId) public onlyOwner {
        policies[_policyId].isActive = false;
    }

    function isClaimant(uint256 _policyId, address _claimant) public view returns (bool) {
        return policyClaimants[_policyId][_claimant];
    }
    
}
