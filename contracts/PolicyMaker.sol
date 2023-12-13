// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PolicyMaker is Ownable, ReentrancyGuard {
    struct Policy {
        uint32 coverageAmount;
        uint32 initialPremiumFee;
        uint32 premiumRate;
        uint32 duration; // to-do change this variable to just calculate the unix timestamp.
        bool isActive;
        uint32 penaltyRate;
        uint32 monthsGracePeriod;
    }

    mapping(uint32 => Policy) public policies;
    mapping(uint32 => mapping(address => bool)) public policyOwners;
    mapping(uint32 => mapping(address => uint256)) public premiumsPaid; // PolicyID -> Claimant -> Amount
    uint32 public nextPolicyId = 1;

    constructor(address initialOwner) Ownable (initialOwner) {}

    event PolicyCreated(uint32 policyId, uint32 coverageAmount, uint32 initialPremiumFee, uint32 duration);
    event PolicyUpdated(uint32 policyId, uint32 coverageAmount, uint32 initialPremiumFee, uint32 duration);
    event PolicyDeactivated(uint32 policyId);
    event PremiumPaid(uint32 indexed policyId, address indexed claimant, uint256 amount, bool isPremium);

    function createPolicy(uint32 _coverageAmount, uint32 _initialPremiumFee, uint32 _duration, uint32 _monthsGracePeriod, uint32 _penaltyRate) public onlyOwner {
        policies[nextPolicyId] = Policy(_coverageAmount, _initialPremiumFee, _duration, true, _penaltyRate, _monthsGracePeriod);
        emit PolicyCreated(nextPolicyId, _coverageAmount, _initialPremiumFee, _duration);
        nextPolicyId++;
    }

    function updatePolicy(uint32 _policyId, uint32 _coverageAmount, uint32 _premiumRate, uint32 _duration, uint32 _monthsGracePeriod, uint32 _penaltyRate) public onlyOwner {
        policies[_policyId].coverageAmount = _coverageAmount;
        policies[_policyId].initialPremiumFee = _initialPremiumFee;
        policies[_policyId].duration = _duration;
        policies[_policyId].penaltyRate = _penaltyRate;
        policies[_policyId].monthsGracePeriod = _monthsGracePeriod;
        emit PolicyUpdated(_policyId, _coverageAmount, _initialPremiumFee, _duration);
    }

    function deactivatePolicy(uint32 _policyId) public onlyOwner {
        policies[_policyId].isActive = false;
        emit PolicyDeactivated(_policyId);
    }

    function isClaimant(uint32 _policyId, address _claimant) public view returns (bool) {
        return policyOwners[_policyId][_claimant];
    }

    // Payments section
    function payInitialPremium(uint32 _policyId) public payable
    {
        require(policies[_policyId].isActive, "Policy is not active");
        require(msg.value >= policies[_policyId].initialPremiumFee, "Can't afford the rate!");
        premiumsPaid[_policyId][msg.sender] += msg.value;
        policyOwners[_policyId][msg.sender] = true;
        emit PremiumPaid(_policyId, msg.sender, msg.value, true);
    }

    function payPremium(uint32 _policyId) public payable nonReentrant {
        require(policies[_policyId].isActive, "Policy does not exist or is not active");
        require(msg.value >= policies[_policyId].premiumRate, "Insufficient premium amount");
        require(isClaimant(_policyId, msg.sender), "Not a claimant of this policy");

        premiumsPaid[_policyId][msg.sender] += msg.value;
        // Transfer the premium to the policy fund or handle accordingly
        emit PremiumPaid(_policyId, msg.sender, msg.value, false);
    }

    function calculatePremium(uint32 _policyId, address _policyHolder) public view returns (uint256) {
        uint256 lastPaymentTime = lastPremiumPaidTime[_policyId][_policyHolder];
        require(lastPaymentTime > 0, "No previous payment found");

        uint256 timeElapsed = block.timestamp - lastPaymentTime;
        uint256 daysElapsed = timeElapsed / 60 / 60 / 24;

        uint256 dailyRate = policies[_policyId].premiumRate / 30; // Assuming premiumRate is monthly
        uint256 duePremium = daysElapsed * dailyRate;
        uint256 premium = policy.premiumRate;
        premium += duePremium;
        // To-do: make a better calculation using timestamp in the future
        uint256 monthsElapsed = daysElapsed / 30 days;

        if (monthsElapsed > policy.monthsGracePeriod) {
            uint256 penaltyRate = 5; // 5% increase per month
            uint256 penaltyMonths = monthsElapsed - 6;
            premium += premium * penaltyRate * penaltyMonths / 100;
        }
        return premium;
    }

    function calculatePremium(uint32 _policyId, address _policyOwner) public view returns (uint256) {
        require(policies[_policyId].isActive, "Policy is not active");

        // Assuming the premium increases over time based on a formula
        // Example: Premium increases by 5% every month after 6 months
        uint256 timeElapsed = block.timestamp - policy.startTime; // startTime needs to be recorded when the policy is created
        uint256 monthsElapsed = timeElapsed / 30 days;

        uint256 premium = policy.premiumRate;
        if (monthsElapsed > 6) {
            uint256 penaltyRate = 5; // 5% increase per month
            uint256 penaltyMonths = monthsElapsed - 6;
            premium += premium * penaltyRate * penaltyMonths / 100;
        }
        return premium;
    }
}
