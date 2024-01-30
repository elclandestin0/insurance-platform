import {ethers} from "hardhat";
import {expect} from "chai";
import {IERC20, PolicyMaker, WETH, IPool} from "../typechain";
import {Block, Contract, Signer} from "ethers";
import {AToken, AToken__factory} from "@aave/core-v3/dist/types/types";

const IERC20_ABI = require('../artifacts/contracts/IERC20.sol/IERC20.json');

describe("PolicyMaker", function () {
    let policyMaker: PolicyMaker;
    let weth: WETH;
    let poolContract: IPool;
    let aWeth: AToken;
    let owner: Signer, addr1: Signer;
    let policyId: any;
    const policyMakerAddress = "0xE2307e3710d108ceC7a4722a020a050681c835b3";
    const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const aWethAddress = "0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8";
    const poolAddress = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";

    // Deploying the PolicyMaker contract before each test
    before(async function () {
        [owner, addr1] = await ethers.getSigners();
        const PolicyMaker = await ethers.getContractFactory("PolicyMaker");
        policyMaker = PolicyMaker.attach(policyMakerAddress);
        policyId = await policyMaker.nextPolicyId();
        console.log(policyId);

        const WETH = await ethers.getContractFactory('WETH');
        weth = WETH.attach(wethAddress);

        // Maybe delete later?
        aWeth = new ethers.Contract(aWethAddress, IERC20_ABI.abi, owner);
        poolContract = await ethers.getContractAt('IPool', poolAddress);

        const tx = await policyMaker.createPolicy(
            ethers.parseEther("100"),
            ethers.parseEther("1"),
            5,
            ethers.parseEther("5"),
            365,
            20,
            6,
            85,
            15
        );

        // give owner 1000 WETH
        const amountToConvert = ethers.parseEther("250");

        // Ensure the balance is sufficient
        await weth.connect(owner).deposit({value: amountToConvert});
        await weth.connect(addr1).deposit({value: amountToConvert});

        // Approve PolicyMaker to spend owner's WETH
        const unlimitedAmount = ethers.MaxUint256;
        await weth.connect(owner).approve(policyMakerAddress, unlimitedAmount);
        await weth.connect(addr1).approve(policyMakerAddress, unlimitedAmount);

        // check owner's WETH balance
        const ownerBalance = await weth.balanceOf(await addr1.getAddress());
        console.log("weth owner balance. ready to go.", ethers.formatEther(ownerBalance));
    });
    describe("Aave Pool Integration", function () {
        it.skip("Should fail when we cannot afford the premium rate", async function () {
            const initPremiumFee = ethers.parseEther("0.5");
            await expect(policyMaker.payInitialPremium(policyId)).to.be.revertedWith("Can't afford the rate!");
        });
        it.only("Should be able to pay initial premium and decrease my WETH balance", async function () {
            const ownerBalanceBefore = await weth.balanceOf(await addr1.getAddress());
            await policyMaker.connect(addr1).payInitialPremium(policyId);
            const totalCoverage = await policyMaker.calculateTotalCoverage(policyId, addr1.address);
            console.log("Total covearge with initial premium of 1 weth. ", ethers.formatEther(totalCoverage));
            const ownerBalanceAfter = await weth.balanceOf(await addr1.getAddress());
            expect(ownerBalanceBefore).to.be.greaterThan(ownerBalanceAfter);
        });
        it("Should increase premium", async function () {
            const premiumRateBefore = await policyMaker.calculatePremium(policyId, owner.address);
            console.log("the accumulated premium rate is: " + ethers.formatEther(premiumRateBefore))
            const oneYearInSeconds = 31 * 24 * 60 * 60;
            await ethers.provider.send("evm_increaseTime", [oneYearInSeconds]);
            await ethers.provider.send("evm_mine");
            const premiumRateAfter = await policyMaker.calculatePremium(policyId, owner.address);
            console.log("the accumulated premium rate is: " + ethers.formatEther(premiumRateAfter))
            expect(premiumRateAfter).to.be.greaterThan(premiumRateBefore);
        });
        it("Should fail when paying the premium with an amount < calculatedPremium", async function () {
            const premiumFee = ethers.parseEther("1");
            await expect(policyMaker.connect(owner).payPremium(policyId, premiumFee)).to.be.revertedWith("Amount needs to be higher than the calculated premium!");
        });
        it("Should succeed when paying the correct premium rate", async function () {
            const oneYearInSeconds = 31 * 24 * 60 * 60;
            await ethers.provider.send("evm_increaseTime", [oneYearInSeconds]);
            await ethers.provider.send("evm_mine");
            const premiumFee = await policyMaker.calculatePremium(1, owner.address);
            console.log(ethers.formatEther(premiumFee));

            const lastPaid: any = await policyMaker.lastPremiumPaidTime(policyId, owner.address);
            const numberLastPaid = Number(lastPaid.toString());
            console.log("Last paid, ", numberLastPaid);
            const timeFactor = await policyMaker.calculateDecayFactor(policyId, lastPaid);
            console.log("decay factor, ", timeFactor);
            const premiumFactor = await policyMaker.calculatePremiumSizeFactor(policyId, premiumFee);
            console.log("Premium , ", premiumFactor);
            const dynamicFactor = timeFactor * premiumFactor;
            console.log(dynamicFactor);

            const dynamicCoverageFactor = await policyMaker.calculateDynamicCoverageFactor(policyId, owner.address, ethers.parseEther('10'));
            console.log("Dynamic coverage factor, ", dynamicCoverageFactor);
            const provider = new ethers.JsonRpcProvider();
            const blockNow: Block | null = await provider.getBlock('latest');
            // Calculate the difference in milliseconds
            const blockTimestamp = blockNow?.timestamp;
            // Calculate the difference in days
            const differenceInMilliseconds = blockTimestamp - numberLastPaid;
            const differenceInDays = differenceInMilliseconds / (60 * 60 * 24); // Convert milliseconds to days
            console.log(differenceInDays);
            // await expect(policyMaker.connect(owner).payPremium(policyId, premiumFee)).to.not.be.reverted;
        });
        it.only("Should increase aWETH balance after 1 year", async function () {
            const premiumAmount = ethers.parseEther("60");
            const premiumFee = await policyMaker.connect(addr1).calculatePremium(policyId, addr1.address);
            console.log(ethers.formatEther(premiumFee));
            await policyMaker.connect(addr1).payPremium(policyId, premiumAmount);
            const potentialCoverage = await policyMaker.calculatePotentialCoverage(policyId, addr1.address, premiumAmount);
            console.log(ethers.formatEther(potentialCoverage));
            await policyMaker.connect(addr1).payCustomPremium(policyId, 50, premiumAmount);
            let investmentFundBalance = await policyMaker.investmentFundBalance(policyId);
            console.log(ethers.formatEther(investmentFundBalance));
            const aWethBalanceBefore = await aWeth.balanceOf(owner.address);
            console.log("aweth balance before: ", ethers.formatEther(aWethBalanceBefore));

            // Invest in Aave Pool
            await policyMaker.connect(owner).investInAavePool(policyId, investmentFundBalance / ethers.parseUnits("2", 0));

            // Fast-forward time by 1 year
            console.log("Fast forwarding by one year ...");
            const oneYearInSeconds = 365 * 60 * 60 * 24;
            await ethers.provider.send("evm_increaseTime", [oneYearInSeconds]);
            await ethers.provider.send("evm_mine");
            const aWethBalanceAfter = await aWeth.balanceOf(owner.address);
            const rewards = await policyMaker.calculateRewards(policyId);
            console.log("rewards for owner: ", ethers.formatEther(rewards[0][1]));
            console.log("aweth balance after: ", ethers.formatEther(aWethBalanceAfter));
            expect(aWethBalanceAfter).to.be.greaterThan(aWethBalanceBefore);
        });
    });
});