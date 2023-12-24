import {ethers} from "hardhat";
import {expect} from "chai";
import {HardhatEthersSigner, SignerWithAddress} from "@nomicfoundation/hardhat-ethers/signers";
import {PolicyMaker, Payout} from "../typechain";
import { BigNumberish } from "ethers";

describe.only("PolicyMaker", function () {
    let policyMaker: PolicyMaker;
    let payout: Payout;
    let owner: HardhatEthersSigner, addr1: HardhatEthersSigner;

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

            const tx = await policyMaker.createPolicy(coverageAmount, initialPremiumFee, initialCoveragePercentage, premiumRate, duration, penaltyRate, monthsGracePeriod);

            const policy = await policyMaker.policies(policyId);
            expect(policy.coverageAmount).to.equal(ethers.parseEther('100'));
            expect(policy.premiumRate).to.equal(ethers.parseEther('10'));
            expect(policy.duration).to.equal(365);
            expect(policy.isActive).to.be.true;
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
            const address: any = addr1.address
            const initialCoveragePercentage = ethers.parseUnits('50', 0);

            await policyMaker.createPolicy(coverageAmount, initialPremiumFee, initialCoveragePercentage, premiumRate, duration, penaltyRate, monthsGracePeriod);

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

            await policyMaker.createPolicy(coverageAmount, initialPremiumFee, initialCoveragePercentage, premiumRate, duration, penaltyRate, monthsGracePeriod);
            await policyMaker.connect(addr1).payInitialPremium(policyId, { value: initialPremiumFee });

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
        it("Should calculate the correct total coverage of the initial premium fee", async function () {
            const policyId = ethers.parseUnits('1', 0);
            const coverageAmount = ethers.parseUnits('100', 0); 
            const initialPremiumFee = ethers.parseEther('20');
            const premiumRate = ethers.parseEther('1');
            const duration = ethers.parseUnits('365', 0);
            const penaltyRate = ethers.parseUnits('20', 0);
            const monthsGracePeriod = ethers.parseUnits('6', 0);
            const initialCoveragePercentage = ethers.parseUnits('50', 0);

            // Create a policy
            await policyMaker.createPolicy(coverageAmount, initialPremiumFee, initialCoveragePercentage, premiumRate, duration, penaltyRate, monthsGracePeriod);
            await policyMaker.connect(addr1).payInitialPremium(policyId, { value: ethers.parseEther("20") });

            // Calculate total coverage
            const totalCoverage = await policyMaker.connect(addr1).calculateTotalCoverage(policyId, addr1.address);
            expect(totalCoverage).to.equal(initialPremiumFee * await policyMaker.calculateCoverageFactor());
        });
        it("Should calculate the correct total coverage of other premiums", async function () {
            const policyId = ethers.parseUnits('1', 0);
            const coverageAmount = ethers.parseUnits('100', 0);
            const initialPremiumFee = ethers.parseEther('20');
            const premiumRate = ethers.parseEther('1');
            const duration = ethers.parseUnits('365', 0);
            const penaltyRate = ethers.parseUnits('20', 0);
            const monthsGracePeriod = ethers.parseUnits('6', 0);
            const initialCoveragePercentage = ethers.parseUnits('50', 0);
            
            // Create a policy
            await policyMaker.createPolicy(coverageAmount, initialPremiumFee, initialCoveragePercentage, premiumRate, duration, penaltyRate, monthsGracePeriod);
            await policyMaker.connect(addr1).payInitialPremium(policyId, { value: ethers.parseEther("20") });

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

            totalCoverage = await policyMaker.connect(addr1).calculateTotalCoverage(policyId, addr1.address);;
            const premiumsPaid = await policyMaker.premiumsPaid(policyId, addr1.address);
            const initialCoverage = coverageAmount * initialPremiumFee / initialCoveragePercentage;
            const additionalCoverage = (premiumsPaid - initialPremiumFee) * coverageFactor;
            let expectedCoverage = initialCoverage + additionalCoverage;
            expect(totalCoverage).to.equal(expectedCoverage);
        });
    });
    describe("Claim Processing", function () {
        it("Should process a claim correctly", async function () {
            const policyId = ethers.parseUnits('1', 0);
            const coverageAmount = ethers.parseUnits('100', 0);
            const initialPremiumFee = ethers.parseEther('20');
            const premiumRate = ethers.parseEther('1');
            const duration = ethers.parseUnits('365', 0);
            const penaltyRate = ethers.parseUnits('20', 0);
            const monthsGracePeriod = ethers.parseUnits('6', 0);
            const initialCoveragePercentage = ethers.parseUnits('50', 0);

            // Create a policy
            await policyMaker.createPolicy(coverageAmount, initialPremiumFee, initialCoveragePercentage, premiumRate, duration, penaltyRate, monthsGracePeriod);
            await policyMaker.connect(addr1).payInitialPremium(policyId, { value: ethers.parseEther("20") });

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

            totalCoverage = await policyMaker.connect(addr1).calculateTotalCoverage(policyId, addr1.address);;
            const premiumsPaid = await policyMaker.premiumsPaid(policyId, addr1.address);
            
            // Process cliam after paying
            const claimAmount = ethers.parseEther("10");
            const balanceBefore = await ethers.provider.getBalance(addr1.address);
            await payout.connect(addr1).processClaim(policyId, addr1.address, claimAmount);
            const balanceAfter = await ethers.provider.getBalance(addr1.address);
            expect(balanceAfter).to.be.greaterThan(balanceBefore);
        });
    });
});