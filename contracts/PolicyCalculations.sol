// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library PolicyCalculations {

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
        address creator;
    }

    function calculateInitialCoverage(
        Policy memory policy
    ) internal pure returns (uint256) {
        return (policy.coverageAmount * policy.initialCoveragePercentage) / 100;
    }

    function calculateAdditionalCoverage(
        Policy memory _policy,
        address _policyHolder,
        uint256 _amount,
        uint256 _lastPremiumPaidTime
    ) internal view returns (uint256) {
        // Ensure the amount is greater than the initial premium fee
        if (_amount <= _policy.initialPremiumFee) {
            return 0;
        }

        // Apply the dynamic coverage factor to the additional premium
        uint256 additionalCoverage = _amount * calculateDynamicCoverageFactor(_policy, _policyHolder, _amount, _lastPremiumPaidTime);

        return additionalCoverage;
    }


    function calculateDynamicCoverageFactor(
        Policy memory _policy,
        address _policyHolder,
        uint256 _inputPremium,
        uint256 _lastPremiumPaidTime
    ) internal view returns (uint256) {
        uint256 timeSinceLastPayment = block.timestamp - _lastPremiumPaidTime;

        // Calculate the premiumSizeFactor
        uint256 premiumSizeFactor = calculatePremiumSizeFactor(
            _policy,
            _inputPremium
        );

        // Ensure a minimum factor of 1 if there's a positive input premium
        premiumSizeFactor = (premiumSizeFactor == 0 && _inputPremium > 0) ? 1 : premiumSizeFactor;

        // Calculate the decay factor based on the time since the last payment
        uint256 decayFactor = calculateDecayFactor(_policy, timeSinceLastPayment);

        // Scaled by 1e18 for precision
        uint256 dynamicCoverageFactor = (premiumSizeFactor * (1 + decayFactor)) / 1e18;

        return dynamicCoverageFactor;
    }


    function calculateDecayFactor(Policy memory policy, uint256 timeSinceLastPayment) internal view returns (uint256) {
        uint256 gracePeriodInSeconds = policy.monthsGracePeriod * 30 days;

        // Calculate the fraction of the grace period that has elapsed
        uint256 fractionElapsed = (timeSinceLastPayment * 5) / gracePeriodInSeconds;

        // Determine the decay factor based on the fraction of grace period elapsed
        if (fractionElapsed < 1) {
            return 1e18; // 100% - first 1/5th of the grace period
        } else if (fractionElapsed < 2) {
            return 0.8e18; // 80% - second 1/5th
        } else if (fractionElapsed < 3) {
            return 0.6e18; // 60% - third 1/5th
        } else if (fractionElapsed < 4) {
            return 0.4e18; // 40% - fourth 1/5th
        } else {
            return 0; // 0% - beyond 4/5th of the grace period
        }
    }


    function calculatePremiumSizeFactor(Policy memory _policy, uint256 _inputPremium) internal view returns (uint256) {
        uint256 coverageAmount = _policy.coverageAmount;

        if (_inputPremium > coverageAmount || _inputPremium == 0) {
            return 0;
        }
        uint256 ratio = (_inputPremium * 100) / coverageAmount;

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
}
