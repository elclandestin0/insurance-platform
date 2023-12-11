// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PolicyMaker is Ownable {
    struct Policy {
        uint32 coverageAmount;
        uint32 premiumRate;
        uint32 duration;
        bool isActive;
    }

    mapping(uint32 => Policy) public policies;
    mapping(uint32 => mapping(address => bool)) public policyClaimants;
    mapping(uint32 => mapping(address => uint32)) public premiumsPaid; // PolicyID -> Claimant -> Amount
    uint32 public nextPolicyId = 1;

    event PolicyCreated(uint32 policyId, uint32 coverageAmount, uint32 premiumRate, uint32 duration);
    event PolicyUpdated(uint32 policyId, uint32 coverageAmount, uint32 premiumRate, uint32 duration);
    event PolicyDeactivated(uint32 policyId);
    event PremiumPaid(uint256 indexed policyId, address indexed claimant, uint256 amount);
    
    function createPolicy(uint32 _coverageAmount, uint32 _premiumRate, uint32 _duration) public onlyOwner {
    policies[nextPolicyId] = Policy(_coverageAmount, _premiumRate, _duration, true, claimants);
        emit PolicyCreated(nextPolicyId, _coverageAmount, _premiumRate, _duration);
        nextPolicyId++;
    }
    
    function updatePolicy(uint32 _policyId, uint32 _coverageAmount, uint32 _premiumRate, uint32 _duration) public onlyOwner {
        policies[_policyId].coverageAmount = _coverageAmount;
        policies[_policyId].premiumRate = _premiumRate;
        policies[_policyId].duration = _duration;
        emit PolicyUpdated(_policyId, _coverageAmount, _premiumRate, _duration);
    }

    function getPolicyDetails(uint32 _policyId)
    public
    view
    returns (
        uint32 coverageAmount,
        uint32 premiumRate,
        uint32 duration,
        bool isActive
    )
    {
        Policy memory policy = policies[_policyId];
        return (policy.coverageAmount, policy.premiumRate, policy.duration, policy.isActive);
    }
    
    function deactivatePolicy(uint32 _policyId) public onlyOwner {
        policies[_policyId].isActive = false;
        emit PolicyDeactivated(_policyId);
    }

    function isClaimant(uint32 _policyId, address _claimant) public view returns (bool) {
        return policyClaimants[_policyId][_claimant];
    }
    
    // Payments section
    function payInitialPremium(uint32 _policyId) public payable nonReentrant  {
        (, uint256 premiumRate,, bool isActive) = getPolicyDetails(_policyId);
        require(isActive, "Policy is not active");
        require(msg.value >= premiumRate, "Can't afford the rate!");
        premiumsPaid[_policyId][msg.sender] += msg.value;
        policyClaimants[_policyId][msg.sender] = true;
    }

    function payPremium(uint32 _policyId) public payable nonReentrant {
        require(policies[_policyId].isActive, "Policy does not exist or is not active");
        require(msg.value >= premiumRate, "Insufficient premium amount");
        require(policyMaker.isClaimant(_policyId, msg.sender), "Not a claimant of this policy");

        premiumsPaid[_policyId][msg.sender] += msg.value;
        // Transfer the premium to the policy fund or handle accordingly
        emit PremiumPaid(_policyId, msg.sender, msg.value);
    }
    
}
