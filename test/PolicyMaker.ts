import {ethers} from "hardhat";
import {expect} from "chai";
import {IERC20, PolicyMaker, WETH, IPool} from "../typechain";
import {Contract, Signer} from "ethers";

const IERC20_ABI = require('../artifacts/contracts/IERC20.sol/IERC20.json');

describe("PolicyMaker", function () {
    let policyMaker: PolicyMaker;
    let weth: WETH;
    let poolContract: IPool;
    let aWeth: IERC20;
    let owner: Signer, addr1: Signer;
    let policyId: any;
    const policyMakerAddress = "0xe519389F8c262d4301Fd2830196FB7D0021daf59";
    const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const aWethAddress = "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e";
    const poolAddress = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";

    // Deploying the PolicyMaker contract before each test
    before(async function () {
        [owner, addr1] = await ethers.getSigners();
        const PolicyMaker = await ethers.getContractFactory("PolicyMaker");
        policyMaker = PolicyMaker.attach(policyMakerAddress);
        policyId = ethers.parseUnits('1', 0);

        const WETH = await ethers.getContractFactory('WETH');
        weth = WETH.attach(wethAddress);
        // Maybe delete later?
        aWeth = new ethers.Contract(aWethAddress, IERC20_ABI.abi, owner);
        poolContract = await ethers.getContractAt('IPool', poolAddress);
        const tx = await policyMaker.createPolicy(
            ethers.parseEther("100"),
            ethers.parseEther("10"),
            5,
            ethers.parseEther("5"),
            365,
            20,
            6,
            75,
            25
        );

        // give owner 1000 WETH
        const amountToConvert = ethers.parseEther("100");

        // Ensure the balance is sufficient
        await weth.connect(owner).deposit({value: amountToConvert});

        // Approve PolicyMaker to spend owner's WETH
        const unlimitedAmount = ethers.MaxUint256;
        await weth.connect(owner).approve(policyMakerAddress, unlimitedAmount);

        // check owner's WETH balance
        const ownerBalance = await weth.balanceOf(await owner.getAddress());
        console.log("weth owner balance. ready to go.", ethers.formatEther(ownerBalance));
    });
    describe("Aave Pool Integration", function () {
        it("Should fail when we cannot afford the premium rate", async function () {
            const initPremiumFee = ethers.parseEther("2");
            await expect(policyMaker.payInitialPremium(1, initPremiumFee)).to.be.revertedWith("Can't afford the rate!");
        });
        it("Should be able to pay initial premium and decrease my WETH balance", async function () {
            const ownerBalanceBefore = await weth.balanceOf(await owner.getAddress());
            const initPremiumFee = ethers.parseEther("10");
            await policyMaker.connect(owner).payInitialPremium(1, initPremiumFee);
            const ownerBalanceAfter = await weth.balanceOf(await owner.getAddress());
            expect(ownerBalanceBefore).to.be.greaterThan(ownerBalanceAfter);
        });
        it.skip("Should be able to get correct investment fund", async function () {
            const ownerBalanceBefore = await weth.balanceOf(await owner.getAddress());
            console.log(ownerBalanceBefore);
            const initPremiumFee = ethers.parseEther("100");
            await policyMaker.connect(owner).payPremium(1, initPremiumFee);
            const ownerBalanceAfter = await weth.balanceOf(await owner.getAddress());
            console.log(ownerBalanceAfter);
            expect(ownerBalanceBefore).to.be.greaterThan(ownerBalanceAfter);
        });
        it.skip("should increase aWETH balance after 1 year", async function () {
            const initPremiumFee = ethers.parseEther("100");
            await policyMaker.connect(owner).payCustomPremium(1, 50, initPremiumFee);
            const ownerBalanceBefore = await weth.balanceOf(policyMakerAddress);
            console.log("weth owner balance before supplying", ownerBalanceBefore)
            let investmentFundBalance = await policyMaker.investmentFundBalance(1);
            const aWethBalanceBefore = await aWeth.balanceOf(policyMakerAddress);
            console.log(ethers.formatEther(aWethBalanceBefore));
            
            // Invest in Aave Pool
            const reserveDataBefore = await poolContract.getReserveData(wethAddress);
            console.log("liquidity index before: ", ethers.formatEther(reserveDataBefore.liquidityIndex));
            await policyMaker.connect(owner).investInAavePool(1, investmentFundBalance / ethers.parseUnits("2", 0));
            
            // Fast-forward time by 1 year
            const oneYearInSeconds = 365 * 24 * 60 * 60;
            await ethers.provider.send("evm_increaseTime", [oneYearInSeconds]);
            await ethers.provider.send("evm_mine");

            investmentFundBalance = await policyMaker.investmentFundBalance(1);
            await policyMaker.connect(owner).investInAavePool(1, investmentFundBalance / ethers.parseUnits("2", 0));
            const aWethBalanceAfter = await aWeth.balanceOf(policyMakerAddress);
            console.log(ethers.formatEther(aWethBalanceAfter));
            console.log()
            const reserveDataAfter = await poolContract.getReserveData(wethAddress);
            console.log(reserveDataAfter);
            console.log("liquidity index after ", ethers.formatEther(reserveDataAfter.liquidityIndex));
            // Calculate accrued aWETH
            const userData = await poolContract.getUserAccountData(policyMakerAddress);
            const ownerBalanceAfter = await weth.balanceOf(policyMakerAddress);
            console.log("weth owner balance before supplying", ownerBalanceAfter)
            console.log(ethers.formatEther(userData.totalCollateralBase));
            console.log(ethers.formatEther(userData.totalDebtBase));
            console.log(ethers.formatEther(userData.ltv));

            const userData2 = await poolContract.getUserAccountData(owner.address);
            console.log(ethers.formatEther(userData2.totalCollateralBase));

            // const currentLiquidityIndex = reserveDataAfter.liquidityIndex;
            // console.log(ethers.formatEther(currentLiquidityIndex));
            // // Calculate accrued interest
            // const accruedInterest = currentLiquidityIndex * investmentFundBalance / depositLiquidityIndex - investmentFundBalance;
            // console.log("accruedInterest", ethers.formatEther(accruedInterest));
            // // const depositLiquidityIndex = reserveDataAfter.depositLiquidityIndex;
            // // const accruedAWETH = (currentLiquidityIndex / depositLiquidityIndex) * investmentFundBalance;
            // // console.log(accruedAWETH);
            // // Check aWETH balance
            // const finalAWethBalance = await aWeth.balanceOf(policyMakerAddress);
            // console.log(finalAWethBalance);
            // expect(finalAWethBalance).to.be.gt(initialAWethBalance);
        });
    });
});