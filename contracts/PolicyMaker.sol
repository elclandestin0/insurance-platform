// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PolicyMaker is Ownable, ReentrancyGuard {
    struct Policy {
        uint256 coverageAmount;
        uint256 initialPremiumFee;
        uint256 initialCoveragePercentage;
        uint256 premiumRate;
        uint32 duration; // to-do change this variable to just calculate the unix timestamp.
        bool isActive;
        uint32 penaltyRate;
        uint32 monthsGracePeriod;
    }

    mapping(uint32 => Policy) public policies;
    mapping(uint32 => mapping(address => bool)) public policyOwners;
    mapping(uint32 => mapping(address => uint256)) public premiumsPaid; // PolicyID -> Claimant -> Amount
    mapping(uint32 => mapping(address => uint256)) public lastPremiumPaidTime;
    uint32 public nextPolicyId = 1;

    constructor(address initialOwner) Ownable (initialOwner) {}

    event PolicyCreated(uint32 policyId, uint256 coverageAmount, uint256 initialPremiumFee, uint32 duration);
    event PolicyUpdated(uint32 policyId, uint256 coverageAmount, uint256 initialPremiumFee, uint32 duration);
    event PolicyDeactivated(uint32 policyId);
    event PremiumPaid(uint32 indexed policyId, address indexed claimant, uint256 amount, bool isPremium);

    function createPolicy(uint256 _coverageAmount, uint256 _initialPremiumFee, uint256 _initialCoveragePercentage, uint256 _premiumRate, uint32 _duration, uint32 _penaltyRate, uint32 _monthsGracePeriod) public onlyOwner {
        policies[nextPolicyId] = Policy(_coverageAmount, _initialPremiumFee, _initialCoveragePercentage, _premiumRate, _duration, true, _penaltyRate, _monthsGracePeriod);
        emit PolicyCreated(nextPolicyId, _coverageAmount, _initialPremiumFee, _duration);
        nextPolicyId++;
    }

    function updatePolicy(uint32 _policyId, uint256 _coverageAmount, uint256 _initialPremiumFee, uint32 _duration, uint32 _monthsGracePeriod, uint32 _penaltyRate) public onlyOwner {
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

    function isPolicyOwner(uint32 _policyId, address _claimant) public view returns (bool) {
        return policyOwners[_policyId][_claimant];
    }

    // Payments section
    function payInitialPremium(uint32 _policyId) public payable
    {
        require(policies[_policyId].isActive, "Policy is not active");
        require(msg.value >= policies[_policyId].initialPremiumFee, "Can't afford the rate!");
        premiumsPaid[_policyId][msg.sender] += msg.value;
        policyOwners[_policyId][msg.sender] = true;
        lastPremiumPaidTime[_policyId][msg.sender] = block.timestamp;
        emit PremiumPaid(_policyId, msg.sender, msg.value, true);
    }

    function payPremium(uint32 _policyId) public payable nonReentrant {
        require(policies[_policyId].isActive, "Policy does not exist or is not active");
        require(msg.value >= calculatePremium(_policyId, msg.sender), "Insufficient premium amount");
        require(isPolicyOwner(_policyId, msg.sender), "Not a claimant of this policy");

        premiumsPaid[_policyId][msg.sender] += msg.value;
        // Transfer the premium to the policy fund or handle accordingly
        emit PremiumPaid(_policyId, msg.sender, msg.value, false);
    }

    function calculatePremium(uint32 _policyId, address _policyHolder) public view returns (uint256) {
        require(isPolicyOwner(_policyId, msg.sender), "Not a policy owner!");
        require(policies[_policyId].isActive, "Policy isn't active!");
        require(lastPremiumPaidTime[_policyId][_policyHolder] > 0, "No previous payment found");

        uint256 timeElapsed = block.timestamp - lastPremiumPaidTime[_policyId][_policyHolder];
        uint256 daysElapsed = timeElapsed / 60 / 60 / 24;

        uint256 dailyRate = policies[_policyId].premiumRate / 30; // Assuming premiumRate is monthly
        uint256 duePremium = daysElapsed * dailyRate;
        uint256 premium = policies[_policyId].premiumRate;
        premium += duePremium;
        // To-do: make a better calculation using just timestamp in the future
        uint256 monthsElapsed = daysElapsed / 30;
        if (monthsElapsed > policies[_policyId].monthsGracePeriod) {
            uint256 penaltyRate = policies[_policyId].penaltyRate; // 5% increase per month
            uint256 penaltyMonths = monthsElapsed - policies[_policyId].monthsGracePeriod;
            premium += premium * penaltyRate * penaltyMonths / 100;
        }
        return premium;
    }

    function calculateTotalCoverage(uint32 _policyId, address _policyHolder) public view returns (uint256) {
        Policy memory policy = policies[_policyId];
        require(policy.isActive, "Policy is not active");
        uint256 initialCoverage = policy.coverageAmount * policy.initialPremiumFee / policy.initialCoveragePercentage;
        
        // Assuming each unit of premium adds a certain amount of coverage
        uint256 totalPremiumsPaid = premiumsPaid[_policyId][_policyHolder];
        uint256 coverageFactor = calculateCoverageFactor(); // For example, each 1 ETH of premium adds 2 ETH of coverage
        uint256 additionalCoverage = (totalPremiumsPaid - policy.initialPremiumFee) * coverageFactor;
        uint256 totalCoverage = initialCoverage + additionalCoverage;
        return totalCoverage;
    }

    function calculateCoverageFactor() public pure returns (uint256) {
        uint256 baseFactor = 2; // Base level of coverage per unit of premium
        // to-do calculate duration adjustment
        uint256 coverageFactor = baseFactor;
        return coverageFactor;
    }
}
