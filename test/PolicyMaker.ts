import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";

describe.only("PolicyMaker", function () {
    let policyMaker: Contract;
    let owner: any, addr1: any;

    // Deploying the PolicyMaker contract before each test
    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();
        const PolicyMaker = await ethers.getContractFactory("PolicyMaker");
        policyMaker = await PolicyMaker.deploy(owner);
        await policyMaker.waitForDeployment();
    });

    describe("Policy Creation", function () {
        it("Should allow the owner to create a new policy", async function () {
            const tx = await policyMaker.createPolicy(1000, 100, 365);
            await tx.wait();

            const policy = await policyMaker.policies(1);
            expect(policy.coverageAmount).to.equal(1000);
            expect(policy.premiumRate).to.equal(100);
            expect(policy.duration).to.equal(365);
            expect(policy.isActive).to.be.true;
        });

        // Add more tests for policy updates, deactivation, etc.
    });

    describe("Premium Payments", function () {
        it("Should allow payment of initial premium and set claimant status", async function () {
            await policyMaker.createPolicy(1000, 100, 365);

            await policyMaker.connect(addr1).payInitialPremium(1, { value: 100 });

            const isClaimant = await policyMaker.isClaimant(1, addr1.address);
            expect(isClaimant).to.be.true;

            const paidAmount = await policyMaker.premiumsPaid(1, addr1.address);
            expect(paidAmount).to.equal(100);
        });
    });
});