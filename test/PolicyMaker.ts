import {ethers} from "hardhat";
import {expect} from "chai";
import {PolicyMaker, Payout} from "../typechain";
import {BigNumberish, Signer} from "ethers";

describe("PolicyMaker", function () {
    let policyMaker: PolicyMaker;
    let payout: Payout;
    let owner: Signer, addr1: Signer;
    let policyId: any;

    // Deploying the PolicyMaker contract before each test
    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();
        const PolicyMaker = await ethers.getContractFactory("PolicyMaker");
        const Payout = await ethers.getContractFactory("Payout");
        policyMaker = await PolicyMaker.deploy(owner.address)
        payout = await Payout.deploy(await policyMaker.getAddress());
        await policyMaker.waitForDeployment();
        await payout.waitForDeployment();
        await policyMaker.setPayoutContract(await payout.getAddress());
        policyId = 1;
        await policyMaker.createPolicy(
            ethers.parseEther("100"),
            ethers.parseEther("10"),
            50,
            ethers.parseEther("5"),
            365,
            20,
            6,
            75,
            25
        );
    });

    describe("Policy Creation", function () {
        it("Should allow the owner to create a new policy", async function () {
            const coverageAmount: any = ethers.parseEther('100'); // Assuming no decimals needed
            const premiumRate = ethers.parseEther('10'); // Monthly rate
            const duration: any = ethers.parseUnits('365', 0)
            const policyId: any = ethers.parseUnits('1', 0);
            const monthsGracePeriod = ethers.parseUnits('6', 0);
            const initialPremiumFee: any = ethers.parseEther('20');
            const penaltyRate = ethers.parseUnits('20', 0);
            const initialCoveragePercentage = ethers.parseUnits('50', 0);
            const coverageFundPercentage = ethers.toBigInt(75);
            const investmentFundPercentage = ethers.toBigInt(25);

            console.log(await policyMaker.nextPolicyId());

            const tx = await policyMaker.createPolicy(coverageAmount, initialPremiumFee, initialCoveragePercentage, premiumRate, duration, penaltyRate, monthsGracePeriod, coverageFundPercentage, investmentFundPercentage);

            const policy = await policyMaker.policies(policyId);
            expect(policy.coverageAmount).to.equal(ethers.parseEther('100'));
            expect(policy.premiumRate).to.equal(ethers.parseEther('10'));
            expect(policy.duration).to.equal(365);
            expect(policy.isActive).to.be.true;
            console.log(await policyMaker.nextPolicyId());
        });

        // Add more tests for policy updates, deactivation, etc.
    });

    describe("Premium Payments", function () {
        it("Should allow payment of initial premium and set claimant status", async function () {
            const coverageAmount: any = ethers.parseEther('100'); // Assuming no decimals needed
            const premiumRate = ethers.parseEther('10'); // Monthly rate
            const duration: any = ethers.parseUnits('365', 0);
            const amount: any = ethers.parseEther('20');
            const policyId: any = ethers.parseUnits('1', 0);
            const monthsGracePeriod = ethers.parseUnits('6', 0);
            const initialPremiumFee: any = ethers.parseEther('20');
            const penaltyRate = ethers.parseUnits('20', 0);
            const address: any = addr1.address;
            const initialCoveragePercentage = ethers.parseUnits('50', 0);
            const coverageFundPercentage = ethers.toBigInt(75);
            const investmentFundPercentage = ethers.toBigInt(25);

            // Create a policy
            await policyMaker.createPolicy(coverageAmount, initialPremiumFee, initialCoveragePercentage, premiumRate, duration, penaltyRate, monthsGracePeriod, coverageFundPercentage, investmentFundPercentage);
            await policyMaker.connect(addr1).payInitialPremium(policyId, {value: amount});

            const isClaimant: boolean = await policyMaker.isPolicyOwner(policyId, address);
            expect(isClaimant).to.be.true;

            const paidAmount = await policyMaker.premiumsPaid(policyId, address);
            expect(paidAmount).to.equal((initialPremiumFee));
        });
    });
    describe("Premium Calculation", function () {
        it("Should calculate the correct premium over time", async function () {
            const coverageAmount: any = ethers.parseEther('100'); // Assuming no decimals needed
            const premiumRate = ethers.parseEther('1'); // Monthly rate
            const duration: any = ethers.parseUnits('365', 0);
            const policyId: any = ethers.parseUnits('1', 0);
            const monthsGracePeriod = ethers.parseUnits('6', 0);
            const initialPremiumFee: any = ethers.parseEther('20');
            const penaltyRate = ethers.parseUnits('20', 0);
            const initialCoveragePercentage = ethers.parseUnits('50', 0);
            const coverageFundPercentage = ethers.toBigInt(75);
            const investmentFundPercentage = ethers.toBigInt(25);

            // Create a policy
            await policyMaker.createPolicy(coverageAmount, initialPremiumFee, initialCoveragePercentage, premiumRate, duration, penaltyRate, monthsGracePeriod, coverageFundPercentage, investmentFundPercentage);
            await policyMaker.connect(addr1).payInitialPremium(policyId, {value: initialPremiumFee});

            // Fast forward time by x months
            const months = 7;
            const timeToFastForward = 3600 * 24 * 30 * months;
            await ethers.provider.send("evm_increaseTime", [timeToFastForward]);
            await ethers.provider.send("evm_mine", []);

            // Calculate premium after 7 months
            const premium = await policyMaker.connect(addr1).calculatePremium(policyId, addr1.address);
            expect(initialPremiumFee).to.be.below(initialPremiumFee + premium);
        });
    });
    describe("Coverage Calculation", function () {
        it("should calculate initial coverage correctly", async function () {
            // Create a policy first
            const policyId = ethers.parseUnits('1', 0);
            const coverageAmount = ethers.parseEther('100'); // Assuming coverage amount is 100 Ether
            const initialPremiumFee = ethers.parseEther('20');
            const premiumRate = ethers.parseEther('1'); // Monthly rate
            const duration = ethers.parseUnits('365', 0); // Duration in days
            const penaltyRate = ethers.parseUnits('20', 0); // Penalty rate
            const monthsGracePeriod = ethers.parseUnits('6', 0); // Grace period in months
            const initialCoveragePercentage = ethers.parseUnits('50', 0); // 50%
            const coverageFundPercentage = ethers.toBigInt(75); // 75%
            const investmentFundPercentage = ethers.toBigInt(25); // 25%

            // Create the policy
            await policyMaker.createPolicy(coverageAmount, initialPremiumFee, initialCoveragePercentage, premiumRate, duration, penaltyRate, monthsGracePeriod, coverageFundPercentage, investmentFundPercentage);

            // Pay initial premium and four additional premiums
            await policyMaker.connect(addr1).payInitialPremium(policyId, {value: initialPremiumFee});
            for (let i = 0; i < 4; i++) {
                await policyMaker.connect(addr1).payPremium(policyId, {value: premiumRate});
            }

            // Calculate the total coverage
            const totalCoverage = await policyMaker.connect(addr1).calculateTotalCoverage(policyId, await addr1.getAddress());

            // Calculate the expected total coverage
            const initialCoverage = coverageAmount * initialCoveragePercentage / ethers.toBigInt(100);
            const additionalCoverage = premiumRate * ethers.toBigInt(4) * await policyMaker.calculateDynamicCoverageFactor(policyId, await addr1.getAddress());
            const expectedTotalCoverage = initialCoverage + additionalCoverage;

            // Check if the total coverage is as expected
            expect(totalCoverage).to.equal(expectedTotalCoverage);
        });
    });
    describe("Claim Processing", function () {
        it("Should process a claim correctly", async function () {
            const policyId = ethers.parseUnits('1', 0);
            const coverageAmount = ethers.parseEther('100');
            const initialPremiumFee = ethers.parseEther('20');
            const premiumRate = ethers.parseEther('1');
            const duration = ethers.parseUnits('365', 0);
            const penaltyRate = ethers.parseUnits('20', 0);
            const monthsGracePeriod = ethers.parseUnits('6', 0);
            const initialCoveragePercentage = ethers.parseUnits('50', 0);
            const coverageFundPercentage = ethers.toBigInt(75);
            const investmentFundPercentage = ethers.toBigInt(25);

            // Create a policy
            await policyMaker.createPolicy(coverageAmount, initialPremiumFee, initialCoveragePercentage, premiumRate, duration, penaltyRate, monthsGracePeriod, coverageFundPercentage, investmentFundPercentage);
            await policyMaker.connect(addr1).payInitialPremium(policyId, {value: ethers.parseEther("20")});

            // Calculate total coverage
            let totalCoverage = await policyMaker.connect(addr1).calculateTotalCoverage(policyId, addr1.address);
            expect(totalCoverage).to.equal(initialPremiumFee * await policyMaker.calculateCoverageFactor());

            // fast forward 7 months
            const timeToFastForward = 3600 * 24 * 30 * 7;
            await ethers.provider.send("evm_increaseTime", [timeToFastForward]);
            await ethers.provider.send("evm_mine", []);

            // Calculate premium after 7 months
            const premium = await policyMaker.connect(addr1).calculatePremium(policyId, addr1.address);
            const coverageFactor = await policyMaker.calculateCoverageFactor();
            await policyMaker.connect(addr1).payPremium(policyId, {value: premium});

            totalCoverage = await policyMaker.connect(addr1).calculateTotalCoverage(policyId, addr1.address);
            ;
            const premiumsPaid = await policyMaker.premiumsPaid(policyId, addr1.address);

            // Process cliam after paying
            const claimAmount = ethers.parseEther("10");
            const balanceBefore = await ethers.provider.getBalance(addr1.address);
            await payout.connect(addr1).processClaim(policyId, addr1.address, claimAmount);
            const balanceAfter = await ethers.provider.getBalance(addr1.address);
            expect(balanceAfter).to.be.greaterThan(balanceBefore);
        });
    });
    describe("Coverage fund and investment fund correct allocation", function () {
        it("Should return the correct investment and coverage fund balance depending on the percentage", async function () {
            const policyId = ethers.parseUnits('1', 0);
            const coverageAmount = ethers.parseEther('100');
            const initialPremiumFee = ethers.parseEther('20');
            const premiumRate = ethers.parseEther('1');
            const duration = ethers.parseUnits('365', 0);
            const penaltyRate = ethers.parseUnits('20', 0);
            const monthsGracePeriod = ethers.parseUnits('6', 0);
            const initialCoveragePercentage = ethers.parseUnits('50', 0);
            const coverageFundPercentage = ethers.toBigInt(75);
            const investmentFundPercentage = ethers.toBigInt(25);

            // Create a policy
            await policyMaker.createPolicy(coverageAmount, initialPremiumFee, initialCoveragePercentage, premiumRate, duration, penaltyRate, monthsGracePeriod, coverageFundPercentage, investmentFundPercentage);
            await policyMaker.connect(addr1).payInitialPremium(policyId, {value: ethers.parseEther("20")});

            // Calculate expected fund allocations
            const expectedCoverageFund = (initialPremiumFee * coverageFundPercentage) / ethers.toBigInt(100);
            const expectedInvestmentFund = (initialPremiumFee * investmentFundPercentage) / ethers.toBigInt(100);

            // Fetch the updated fund balances from the contract
            const actualCoverageFundBalance: bigint = await policyMaker.coverageFundBalance();
            const actualInvestmentFundBalance: bigint = await policyMaker.investmentFundBalance();

            // Compare the actual fund balances with the expected allocations
            expect(actualCoverageFundBalance).to.equal(expectedCoverageFund);
            expect(actualInvestmentFundBalance).to.equal(expectedInvestmentFund);

            // You may also want to check if the total of both funds equals the initial premium
            const totalFunds = actualCoverageFundBalance + actualInvestmentFundBalance;
            expect(totalFunds).to.equal(initialPremiumFee);
        });
    });
    describe.only("Claim processing", function () {
        it("Should process a valid claim and transfer the correct payout amount", async function () {
            const policyId = ethers.parseUnits('1', 0);
            const coverageAmount = ethers.parseEther('100');
            const initialPremiumFee = ethers.parseEther('20');
            const premiumRate = ethers.parseEther('5');
            const duration = ethers.parseUnits('365', 0);
            const penaltyRate = ethers.parseUnits('20', 0);
            const monthsGracePeriod = ethers.parseUnits('6', 0);
            const initialCoveragePercentage = ethers.parseUnits('50', 0);
            const coverageFundPercentage = ethers.toBigInt(75);
            const investmentFundPercentage = ethers.toBigInt(25);

            // Create a policy
            await policyMaker.createPolicy(coverageAmount, initialPremiumFee, initialCoveragePercentage, premiumRate, duration, penaltyRate, monthsGracePeriod, coverageFundPercentage, investmentFundPercentage);
            await policyMaker.connect(addr1).payInitialPremium(policyId, {value: ethers.parseEther("20")});
            const claimAmount = await policyMaker.connect(addr1).calculateTotalCoverage(policyId, await addr1.getAddress());
            // To do logarithmic


            // Ensure the policy is active and addr1Signer is the policy owner before proceeding with the claim
            expect(await policyMaker.isActive(policyId)).to.be.true;
            expect(await policyMaker.isPolicyOwner(policyId, addr1.address)).to.be.true;

            // Process the claim
            await policyMaker.connect(addr1).handlePayout(policyId, claimAmount);

            // The payout amount should be equal to the claim amount since it's less than the total coverage
            const coverageFundBalanceBefore = await policyMaker.coverageFundBalance(policyId);
            expect(coverageFundBalanceBefore).to.be.above(claimAmount);

            const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
            const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
            expect(addr1BalanceAfter).to.equal(addr1BalanceBefore + claimAmount);
        });
        it("Should calculate the correct premium size factor based on the input premium", async function () {
            const policyId = ethers.parseUnits('1', 0);
            const coverageAmount = ethers.parseEther('100');
            const initialPremiumFee = ethers.parseEther('20');
            const premiumRate = ethers.parseEther('5');
            const duration = ethers.parseUnits('365', 0);
            const penaltyRate = ethers.parseUnits('20', 0);
            const monthsGracePeriod = ethers.parseUnits('6', 0);
            const initialCoveragePercentage = ethers.parseUnits('50', 0);
            const coverageFundPercentage = ethers.toBigInt(75);
            const investmentFundPercentage = ethers.toBigInt(25);

            // Create a policy
            await policyMaker.createPolicy(coverageAmount, initialPremiumFee, initialCoveragePercentage, premiumRate, duration, penaltyRate, monthsGracePeriod, coverageFundPercentage, investmentFundPercentage);

            // Test various premium amounts to check the premium size factor
            const testPremiums = [
                ethers.parseEther('1'), // 1% of coverageAmount
                ethers.parseEther('5'), // 10% of coverageAmount
                ethers.parseEther('10'), // 10% of coverageAmount
                ethers.parseEther('25'), // 25% of coverageAmount
                ethers.parseEther('50'), // 50% of coverageAmount
                ethers.parseEther('75'), // 75% of coverageAmount
                ethers.parseEther('100') // 100% of coverageAmount
            ];

            for (let i = 0; i < testPremiums.length; i++) {
                const premium = testPremiums[i];
                const premiumSizeFactor = await policyMaker.calculatePremiumSizeFactor(policyId, premium);
                console.log(premiumSizeFactor);
                // Check if the premium size factor is calculated correctly
                // The exact assertion can vary based on the expected logic of premiumSizeFactor
                // expect(premiumSizeFactor).to.be.at.least(0);
                // expect(premiumSizeFactor).to.be.below(2); // Assuming the maximum factor is less than 2
            }
        });
        it("should correctly allocate premium to coverage and investment funds", async function () {
            // Create policy
            const coverageAmount = ethers.parseEther("100"); // 100 ETH coverage amount
            const initialPremiumFee = ethers.parseEther("10"); // 10 ETH initial premium
            const premiumRate = ethers.parseEther("10"); // 5 ETH monthly premium rate

            await policyMaker.createPolicy(
                coverageAmount,
                initialPremiumFee,
                5, // Initial coverage percentage
                premiumRate,
                365, // Duration in days
                5, // Penalty rate percentage
                6, // Months grace period
                75, // Coverage fund percentage
                25  // Investment fund percentage
            );

            // Pay initial premium
            await policyMaker.connect(addr1).payInitialPremium(policyId, {value: initialPremiumFee});

            // Pay premium that covers remaining coverage and contributes to investment fund
            const additionalPremium = ethers.parseEther("80"); // Paying extra to exceed coverage
            await policyMaker.connect(addr1).payPremium(policyId, {value: additionalPremium});

            await policyMaker.connect(addr1).payPremium(policyId, {value: additionalPremium});

            // Retrieve updated fund balances
            const coverageFundBalance = await policyMaker.coverageFundBalance(policyId);
            const investmentFundBalance = await policyMaker.investmentFundBalance(policyId);

            // Calculate expected fund allocations
            const remainingCoverageNeeded = coverageAmount / (initialPremiumFee); // Remaining coverage after initial premium
            const expectedCoverageFund = remainingCoverageNeeded; // All remaining coverage goes to coverage fund
            const expectedInvestmentFund = additionalPremium / (remainingCoverageNeeded); // Excess premium goes to investment fund
            console.log(coverageFundBalance);
            console.log(investmentFundBalance);

            // Assertions
            expect(coverageFundBalance).to.equal(expectedCoverageFund);
            expect(investmentFundBalance).to.equal(expectedInvestmentFund);
        });
        it("Should split funds between coverage and investment correctly", async function () {
            const amountOne = ethers.parseEther('10');
            await policyMaker.connect(addr1).payInitialPremium(policyId, {value: amountOne});
            // Pay a partial coverage premium
            await policyMaker.connect(addr1).payPremium(policyId, {value: amountOne});

            const coverageFund = await policyMaker.coverageFundBalance(policyId);
            const investmentFund = await policyMaker.investmentFundBalance(policyId);
            // Verify fund allocations
            expect(coverageFund).to.equal(ethers.parseEther('15')); // 75% of 5 ETH
            expect(investmentFund).to.equal(ethers.parseEther('5')); // 25% of 5 ETH
        });
        it("Should allocate custom premium correctly", async function () {
            await policyMaker.connect(addr1).payInitialPremium(policyId, {value: ethers.parseEther('10')});
            await policyMaker.connect(addr1).payPremium(policyId, {value: ethers.parseEther('90')});
            await policyMaker.connect(addr1).payCustomPremium(policyId, 50, {value: ethers.parseEther('10')});
            // Verify fund allocations
            const coverageFund = await policyMaker.coverageFundBalance(policyId);
            const investmentFund = await policyMaker.investmentFundBalance(policyId);
            expect(coverageFund).to.equal(ethers.parseEther('75')); // Max coverage amount
            expect(investmentFund).to.equal(ethers.parseEther('30')); // Increased by 5 ETH from custom premium
        });
        it.only("Should calculate correct coverage amount", async function () {
            await policyMaker.connect(addr1).payInitialPremium(policyId, {value: ethers.parseEther('10')});
            await policyMaker.connect(addr1).payPremium(policyId, {value: ethers.parseEther('90')});
            await policyMaker.connect(addr1).payCustomPremium(policyId, 10, {value: ethers.parseEther('10')});
            const coverageFund = await policyMaker.coverageFundBalance(policyId);
            const investmentFund = await policyMaker.investmentFundBalance(policyId);
            expect(coverageFund).to.equal(ethers.parseEther('75')); // Max coverage amount
            expect(investmentFund).to.equal(ethers.parseEther('30')); // Increased by 5 ETH from custom premium
            console.log(await policyMaker.connect(addr1).calculateTotalCoverage(policyId, addr1.address));
        });
        it("should calculate bonus coverage correctly", async function () {
            const policyId = 1; // Assuming policy ID 1
            const coverageAmount = ethers.parseEther("100"); // 100 ETH coverage
            const initialPremium = ethers.parseEther("10"); // 10 ETH initial premium

            await policyMaker.connect(addr1).payInitialPremium(policyId, {value: initialPremium});

            // Pay additional premium to exceed the coverage amount and generate bonus coverage
            const additionalPremium = ethers.parseEther("95"); // 95 ETH additional premium, exceeding coverage
            await policyMaker.connect(addr1).payPremium(policyId, {value: additionalPremium});

            // Calculate expected bonus coverage
            // Assuming bonus coverage is a simple 1:1 ratio for additional premiums beyond coverage amount
            const expectedBonusCoverage = ethers.parseEther("5"); // 5 ETH bonus

            // Retrieve the total coverage from the contract
            const totalCoverage = await policyMaker.calculateTotalCoverage(policyId, addr1.address);
            console.log("total coverage ", ethers.formatEther(totalCoverage));
            const bonusCoverage = totalCoverage - coverageAmount; // Subtract the base coverage to get bonus
            // Assert that the bonus coverage is calculated correctly
            expect(bonusCoverage).to.equal(expectedBonusCoverage);
        });
    })
});