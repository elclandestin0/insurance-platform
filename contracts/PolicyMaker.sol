// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract PolicyMaker {
    struct Policy {
        uint256 coverageAmount;
        uint256 premiumRate;
        uint256 duration;
        bool isActive;
    }

    mapping(uint256 => Policy) public policies;
    uint256 public nextPolicyId;

    function createPolicy(uint256 _coverageAmount, uint256 _premiumRate, uint256 _duration) public {
        policies[nextPolicyId] = Policy(_coverageAmount, _premiumRate, _duration, true);
        nextPolicyId++;
    }

    // Additional functions like updatePolicy, deactivatePolicy, etc.
}
