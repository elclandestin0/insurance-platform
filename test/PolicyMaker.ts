import {ethers} from "hardhat";
import {expect} from "chai";
import {Contract} from "ethers";
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";
import {PolicyMaker} from "../typechain-types";
import { BigNumberish } from "ethers";

describe.only("PolicyMaker", function () {
    let policyMaker: PolicyMaker;
    let owner: HardhatEthersSigner, addr1: HardhatEthersSigner;

    // Deploying the PolicyMaker contract before each test
    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();
        const PolicyMaker = await ethers.getContractFactory("PolicyMaker");
        policyMaker = await PolicyMaker.deploy(owner);
        await policyMaker.waitForDeployment();
    });

    describe("Policy Creation", function () {
        it("Should allow the owner to create a new policy", async function () {
            const coverageAmount: any = ethers.parseUnits('1000', 0); // Assuming no decimals needed
            const premiumRate: any = ethers.parseUnits('100', 0);
            const duration: any = ethers.parseUnits('365', 0);
            const policyId: any = ethers.parseUnits('1', 0);

            const tx = await policyMaker.createPolicy(coverageAmount, premiumRate, duration);
            await tx.wait();

            const policy = await policyMaker.policies(policyId);
            expect(policy.coverageAmount).to.equal(1000);
            expect(policy.premiumRate).to.equal(100);
            expect(policy.duration).to.equal(365);
            expect(policy.isActive).to.be.true;
        });

        // Add more tests for policy updates, deactivation, etc.
    });

    describe("Premium Payments", function () {
        it("Should allow payment of initial premium and set claimant status", async function () {
            const coverageAmount: any = ethers.parseUnits('1000', 0); // Assuming no decimals needed
            const premiumRate: any = ethers.parseUnits('100', 0);
            const duration: any = ethers.parseUnits('365', 0);
            const amount: any = ethers.parseEther('100');
            const policyId: any = ethers.parseUnits('1', 0);
            const address: any = addr1.address
            
            await policyMaker.createPolicy(coverageAmount, premiumRate, duration);

            await policyMaker.connect(addr1).payInitialPremium(policyId, {value: amount});

            const isClaimant = await policyMaker.isClaimant(policyId, address);
            expect(isClaimant).to.be.true;

            const paidAmount = await policyMaker.premiumsPaid(policyId, address);
            expect(paidAmount).to.equal(100);
        });
    });
});