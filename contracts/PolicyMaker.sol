// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "hardhat/console.sol";
import "./IWETH.sol";

contract PolicyMaker is Ownable, ReentrancyGuard {
    using Math for uint256;
    IWETH public weth;

    struct Policy {
        uint256 coverageAmount;
        uint256 initialPremiumFee;
        uint256 initialCoveragePercentage;
        uint256 premiumRate;
        uint32 duration;
        bool isActive;
        uint32 penaltyRate;
        uint32 monthsGracePeriod;
        uint32 coverageFundPercentage;
        uint32 investmentFundPercentage;
        uint256 startTime;
    }

    // Dead code .. for now. 
    address private payoutContract;

    // Policy queries
    mapping(uint32 => Policy) public policies;
    mapping(uint32 => uint256) public coverageFundBalance;
    mapping(uint32 => uint256) public investmentFundBalance;
    mapping(uint32 => mapping(address => uint256)) public coverageFundTokenBalance;
    mapping(uint32 => mapping(address => uint256)) public investmentFundTokenBalance;

    // User queries
    mapping(uint32 => mapping(address => bool)) public policyOwners;
    mapping(uint32 => mapping(address => uint256)) public premiumsPaid;
    mapping(uint32 => mapping(address => uint256)) public coverageFunded;
    mapping(uint32 => mapping(address => uint256)) public investmentFunded;
    mapping(uint32 => mapping(address => uint32)) public timesPaid;
    mapping(uint32 => mapping(address => uint256)) public lastPremiumPaidTime;
    mapping(uint32 => mapping(address => uint256)) public amountClaimed;

    // Policy ID
    uint32 public nextPolicyId = 1;

    // Aave set-up
    IPoolAddressesProvider private addressesProvider;
    IPool private lendingPool;
    address public constant WETH_ADDRESS = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    constructor(address initialOwner, address _addressesProvider) Ownable(initialOwner) {
        addressesProvider = IPoolAddressesProvider(_addressesProvider);
        lendingPool = IPool(addressesProvider.getPool());
        weth = IWETH(WETH_ADDRESS);
    }

    event PolicyCreated(
        uint32 policyId,
        uint256 coverageAmount,
        uint256 initialPremiumFee,
        uint32 duration
    );
    event PolicyUpdated(
        uint32 policyId,
        uint256 coverageAmount,
        uint256 initialPremiumFee,
        uint32 duration
    );
    event PolicyDeactivated(uint32 policyId);
    event PremiumPaid(
        uint32 indexed policyId,
        address indexed claimant,
        uint256 amount,
        bool isPremium
    );

    function createPolicy(
        uint256 _coverageAmount,
        uint256 _initialPremiumFee,
        uint256 _initialCoveragePercentage,
        uint256 _premiumRate,
        uint32 _duration,
        uint32 _penaltyRate,
        uint32 _monthsGracePeriod,
        uint32 _coverageFundPercentage,
        uint32 _investmentFundPercentage
    ) public onlyOwner {
        policies[nextPolicyId] = Policy(
            _coverageAmount,
            _initialPremiumFee,
            _initialCoveragePercentage,
            _premiumRate,
            _duration,
            true,
            _penaltyRate,
            _monthsGracePeriod,
            _coverageFundPercentage,
            _investmentFundPercentage,
            block.timestamp
        );
        emit PolicyCreated(
            nextPolicyId,
            _coverageAmount,
            _initialPremiumFee,
            _duration
        );
        nextPolicyId++;
    }

    function updatePolicy(
        uint32 _policyId,
        uint256 _coverageAmount,
        uint256 _initialPremiumFee,
        uint32 _duration,
        uint32 _monthsGracePeriod,
        uint32 _penaltyRate
    ) public onlyOwner {
        policies[_policyId].coverageAmount = _coverageAmount;
        policies[_policyId].initialPremiumFee = _initialPremiumFee;
        policies[_policyId].duration = _duration;
        policies[_policyId].penaltyRate = _penaltyRate;
        policies[_policyId].monthsGracePeriod = _monthsGracePeriod;
        emit PolicyUpdated(
            _policyId,
            _coverageAmount,
            _initialPremiumFee,
            _duration
        );
    }

    function deactivatePolicy(uint32 _policyId) public onlyOwner {
        policies[_policyId].isActive = false;
        emit PolicyDeactivated(_policyId);
    }

    function isActive(uint32 _policyId) public view returns (bool) {
        return policies[_policyId].isActive;
    }

    function isPolicyOwner(
        uint32 _policyId,
        address _claimant
    ) public view returns (bool) {
        return policyOwners[_policyId][_claimant];
    }

    // Payments section
    function payInitialPremium(uint32 _policyId, uint256 amount) public {
        require(
            !isPolicyOwner(_policyId, msg.sender),
            "Already a claimant of this policy"
        );
        require(policies[_policyId].isActive, "Policy is not active");
        require(
            amount >= policies[_policyId].initialPremiumFee,
            "Can't afford the rate!"
        );
        // Transfer WETH from the user to the contract
        require(weth.transferFrom(msg.sender, address(this), amount), "WETH transfer failed");

        // Store premiums paid for the account
        premiumsPaid[_policyId][msg.sender] += amount;
        policyOwners[_policyId][msg.sender] = true;
        lastPremiumPaidTime[_policyId][msg.sender] = block.timestamp;

        // Calculate coverage and investment amount to add them to the fund
        coverageFundBalance[_policyId] +=
            (amount * policies[_policyId].coverageFundPercentage) /
            100;
        investmentFundBalance[_policyId] +=
            (amount * policies[_policyId].investmentFundPercentage) /
            100;
        coverageFunded[_policyId][msg.sender] += (amount * policies[_policyId].coverageFundPercentage) / 100;
        investmentFunded[_policyId][msg.sender] += (amount * policies[_policyId].investmentFundPercentage) / 100;
        emit PremiumPaid(_policyId, msg.sender, amount, true);
    }

    function payPremium(uint32 _policyId, uint256 amount) public payable {
        require(isPolicyOwner(_policyId, msg.sender), "Not a policy owner");
        require(policies[_policyId].isActive, "Policy is not active");
        require(calculateTotalCoverage(_policyId, msg.sender) < policies[_policyId].coverageAmount, "Full coverage achieved, use payCustomPremium");

        // Transfer WETH from the user to the contract
        require(weth.transferFrom(msg.sender, address(this), amount), "WETH transfer failed");
        uint256 currentTotalCoverage = calculateTotalCoverage(_policyId, msg.sender);
        uint256 maxCoverage = policies[_policyId].coverageAmount;
        uint256 remainingCoverageNeeded = (maxCoverage > currentTotalCoverage) ? (maxCoverage - currentTotalCoverage) : 0;
        uint256 premiumForCoverageFund;
        uint256 premiumForInvestmentFund;

        // Regular premium split based on policy's fund percentages
        premiumForCoverageFund = (amount * policies[_policyId].coverageFundPercentage) / 100;
        premiumForInvestmentFund = amount - premiumForCoverageFund;

        // Safely update fund balances
        coverageFundBalance[_policyId] += premiumForCoverageFund; // Safe add
        investmentFundBalance[_policyId] += premiumForInvestmentFund; // Safe add

        // Record the premiums paid and fund contributions
        premiumsPaid[_policyId][msg.sender] += amount; // Safe add
        coverageFunded[_policyId][msg.sender] += premiumForCoverageFund; // Safe add
        investmentFunded[_policyId][msg.sender] += premiumForInvestmentFund; // Safe add

        emit PremiumPaid(_policyId, msg.sender, amount, false);
    }


    function payCustomPremium(uint32 _policyId, uint256 investmentFundPercentage, uint256 amount) public payable {
        require(isPolicyOwner(_policyId, msg.sender), "Not a policy owner");
        require(policies[_policyId].isActive, "Policy is not active");
        require(investmentFundPercentage <= 100, "Invalid percentage value");
        require(calculateTotalCoverage(_policyId, msg.sender) < policies[_policyId].coverageAmount * 2, "Maximum bonus coverage reached.");
        require(weth.transferFrom(msg.sender, address(this), amount), "WETH transfer failed");

        // Calculate the allocation of the premium based on the specified percentages
        uint256 premiumForInvestmentFund = calculateTotalCoverage(_policyId, msg.sender) < policies[_policyId].coverageAmount * 2 ? (amount * investmentFundPercentage) / 100 : amount;
        uint256 premiumForCoverageFund = calculateTotalCoverage(_policyId, msg.sender) < policies[_policyId].coverageAmount * 2 ? amount - premiumForInvestmentFund : 0;

        // Ensure premium allocation does not exceed the paid amount
        premiumForInvestmentFund = (premiumForInvestmentFund > amount) ? amount : premiumForInvestmentFund;
        premiumForCoverageFund = (premiumForCoverageFund > amount) ? 0 : premiumForCoverageFund;

        // Update fund balances
        coverageFundBalance[_policyId] += premiumForCoverageFund;
        coverageFunded[_policyId][msg.sender] += premiumForCoverageFund;
        investmentFundBalance[_policyId] += premiumForInvestmentFund;
        investmentFunded[_policyId][msg.sender] += premiumForInvestmentFund;

        // Record the premiums paid
        premiumsPaid[_policyId][msg.sender] += amount;
        emit PremiumPaid(_policyId, msg.sender, amount, false);
    }

    // Helper function to calculate how much of the premium should go to the coverage fund
    function calculatePremiumForCoverageFund(uint32 _policyId, uint256 premium, uint256 remainingCoverageNeeded) internal view returns (uint256) {
        uint256 coverageAmount = policies[_policyId].coverageAmount;

        if (premium > coverageAmount || premium == 0) {
            return 0;
        }

        uint256 ratio = (premium * 100) / coverageAmount;
        uint256 multiplier;

        if (ratio < 10) {
            multiplier = 1;
        } else if (ratio < 25) {
            multiplier = 2;
        } else if (ratio < 50) {
            multiplier = 3;
        } else if (ratio < 75) {
            multiplier = 4;
        } else {
            multiplier = 5;
        }

        uint256 effectivePremium = premium * multiplier;
        return effectivePremium > remainingCoverageNeeded ? remainingCoverageNeeded : effectivePremium;
    }

    function calculatePremiumAllocation(uint32 _policyId, uint256 _premiumAmount) public view returns (uint256, uint256) {
        Policy storage policy = policies[_policyId];
        uint256 premiumForCoverageFund = (_premiumAmount * policies[_policyId].coverageFundPercentage) / 100;
        uint256 premiumForInvestmentFund = (_premiumAmount * policies[_policyId].investmentFundPercentage) / 100;
        return (premiumForCoverageFund, premiumForInvestmentFund);
    }


    function calculatePremium(
        uint32 _policyId,
        address _policyHolder
    ) public view returns (uint256) {
        require(isPolicyOwner(_policyId, msg.sender), "Not a policy owner!");
        require(policies[_policyId].isActive, "Policy isn't active!");
        require(
            lastPremiumPaidTime[_policyId][_policyHolder] > 0,
            "No previous payment found"
        );

        uint256 timeElapsed = block.timestamp -
                            lastPremiumPaidTime[_policyId][_policyHolder];
        uint256 daysElapsed = timeElapsed / 60 / 60 / 24;

        uint256 dailyRate = policies[_policyId].premiumRate / 30;
        // Assuming premiumRate is monthly
        uint256 duePremium = daysElapsed * dailyRate;
        uint256 premium = policies[_policyId].premiumRate;
        premium += duePremium;

        // To-do: make a better calculation using just timestamp in the future
        uint256 monthsElapsed = daysElapsed / 30;
        if (monthsElapsed > policies[_policyId].monthsGracePeriod) {
            uint256 penaltyRate = policies[_policyId].penaltyRate; // 5% increase per month
            uint256 penaltyMonths = monthsElapsed -
                                policies[_policyId].monthsGracePeriod;
            premium += (premium * penaltyRate * penaltyMonths) / 100;
        }
        return premium;
    }

    function calculatePotentialCoverage(
        uint32 _policyId,
        address _policyHolder,
        uint256 _inputPremium
    ) public view returns (uint256) {
        require(policies[_policyId].isActive, "Policy is not active");
        require(calculateTotalCoverage(_policyId, _policyHolder) < policies[_policyId].coverageAmount, "You are already fully covered!");

        uint256 currentTotalCoverage = calculateTotalCoverage(
            _policyId,
            _policyHolder
        );

        uint256 maxAllowedCoverage = policies[_policyId].coverageAmount * 2;
        if (currentTotalCoverage >= maxAllowedCoverage) {
            return maxAllowedCoverage;
        }

        uint256 additionalCoverage = calculateAdditionalCoverage(
            _policyId,
            _policyHolder,
            _inputPremium
        );

        uint256 potentialCoverage = currentTotalCoverage + additionalCoverage;

        // Cap the potential coverage at double the policy coverage amount
        if (potentialCoverage > maxAllowedCoverage) {
            potentialCoverage = maxAllowedCoverage;
        }

        return potentialCoverage;
    }

    function calculateTotalCoverage(
        uint32 _policyId,
        address _policyHolder
    ) public view returns (uint256) {
        require(policies[_policyId].isActive, "Policy is not active");
        uint256 initialCoverage = calculateInitialCoverage(_policyId);
        uint256 additionalCoverage = calculateAdditionalCoverage(
            _policyId,
            _policyHolder,
            coverageFunded[_policyId][_policyHolder]
        );

        uint256 totalCoverage = initialCoverage + additionalCoverage;
        if (amountClaimed[_policyId][_policyHolder] > totalCoverage) {
            return 0;
        }
        uint256 netCoverage = totalCoverage - amountClaimed[_policyId][_policyHolder];

        uint256 maxCoverage = policies[_policyId].coverageAmount * 2;
        if (netCoverage > maxCoverage) {
            netCoverage = maxCoverage;
        }

        return netCoverage;
    }

    function calculateInitialCoverage(
        uint32 _policyId
    ) internal view returns (uint256) {
        return
            (policies[_policyId].coverageAmount *
                policies[_policyId].initialCoveragePercentage) / 100;
    }

    function calculateAdditionalCoverage(
        uint32 _policyId,
        address _policyHolder,
        uint256 _inputPremium
    ) internal view returns (uint256) {
        uint256 coverageFactor = calculateDynamicCoverageFactor(
            _policyId,
            _policyHolder,
            _inputPremium
        );
        return
            _inputPremium * coverageFactor;
    }

    function calculateDynamicCoverageFactor(
        uint32 _policyId,
        address _policyHolder,
        uint256 inputPremium
    ) public view returns (uint256) {
        Policy memory policy = policies[_policyId];
        uint256 timeFactor = 1.0 +
                        calculateTimeBasedIncrease(block.timestamp - policy.startTime);

        // Calculate the premiumSizeFactor with a guard against zero
        uint256 premiumSizeFactor = calculatePremiumSizeFactor(
            _policyId,
            inputPremium
        );
        premiumSizeFactor = (premiumSizeFactor == 0 && inputPremium > 0)
            ? 1
            : premiumSizeFactor;

        return timeFactor * premiumSizeFactor;
    }

    function calculateTimeBasedIncrease(
        uint256 timeSinceStart
    ) internal pure returns (uint256) {
        uint256 monthsElapsed = timeSinceStart / 30 days;
        uint256 factorIncrease = monthsElapsed * 10 * 100;
        return factorIncrease / 100;
    }

    function calculatePremiumSizeFactor(uint32 _policyId, uint256 inputPremium) public view returns (uint256) {
        uint256 coverageAmount = policies[_policyId].coverageAmount;

        if (inputPremium > coverageAmount || inputPremium == 0) {
            return 0;
        }

        uint256 ratio = (inputPremium * 100) / coverageAmount;

        if (ratio < 10) {
            return 1;
        } else if (ratio < 50) {
            return 2;
        } else if (ratio < 50) {
            return 2;
        } else if (ratio < 75) {
            return 3;
        } else {
            return 3;
        }
    }

    function log10(uint256 x) internal pure returns (uint256) {
        uint256 result = 0;
        while (x >= 10) {
            x /= 10;
            result++;
        }
        return result;
    }

    function handlePayout(
        uint32 policyId,
        uint256 claimAmount
    ) public nonReentrant {
        require(policies[policyId].isActive, "Policy is not active");
        require(policyOwners[policyId][msg.sender], "Not a policy owner");
        require(
            claimAmount <= coverageFundBalance[policyId],
            "Insufficient coverage fund"
        );
        require(
            claimAmount <= calculateTotalCoverage(policyId, msg.sender),
            "Insufficient coverage fund"
        );

        uint256 payoutAmount = claimAmount >
        calculateTotalCoverage(policyId, msg.sender)
            ? calculateTotalCoverage(policyId, msg.sender)
            : claimAmount;
        // Update the coverage fund balance
        coverageFundBalance[policyId] -= payoutAmount;
        amountClaimed[policyId][msg.sender] += payoutAmount;

        // Transfer the payout amount to the policy holder
        payable(msg.sender).transfer(payoutAmount);
    }

    function setPayoutContract(address _payoutContract) external onlyOwner {
        payoutContract = _payoutContract;
    }

    function convertEthToWeth() external payable {
        // Ensure the contract has enough ETH balance
        require(msg.value > 0, "Insufficient ETH balance");

        // Convert entire contract's ETH balance to WETH
        weth.deposit{value: msg.value}();
    }


    function withdrawWethAsEth(uint256 amount) external {
        weth.withdraw(amount);
    }

    // Aave pool functions
    function investInAavePool(uint32 policyId, uint256 amount) external {
        require(IERC20(WETH_ADDRESS).balanceOf(address(this)) >= amount, "Insufficient WETH balance");
        require(investmentFundBalance[policyId] > amount, "Insufficient investment funds!");
        IERC20(WETH_ADDRESS).approve(address(lendingPool), amount);
        lendingPool.deposit(WETH_ADDRESS, amount, address(this), 0);
        investmentFundBalance[policyId] -= amount;
    }

    function withdrawFromAavePool(address asset, uint256 amount) external {
        // Ensure only authorized access
        lendingPool.withdraw(asset, amount, address(this));
    }

}
