import {ethers} from "hardhat";
import {expect} from "chai";
import {PolicyMaker, IWETH, WETH} from "../typechain";
import {BigNumberish, ContractTransaction, Signer} from "ethers";

describe("PolicyMaker", function () {
    let policyMaker: PolicyMaker;
    let weth: WETH;
    let owner: Signer, addr1: Signer;
    let policyId: any;
    const policyMakerAddress = "0x76a999d5F7EFDE0a300e710e6f52Fb0A4b61aD58"; // Replace with your already deployed contract address
    const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    // Deploying the PolicyMaker contract before each test
    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();
        const PolicyMaker = await ethers.getContractFactory("PolicyMaker");
        policyMaker = PolicyMaker.attach(policyMakerAddress);
        policyId = ethers.parseUnits('1', 0);

        const WETH = await ethers.getContractFactory('WETH');
        weth = WETH.attach(wethAddress);

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

        // give owner 1000 WETH
        const amountToConvert = ethers.parseEther("1000");

        // Ensure the balance is sufficient
        // Convert ETH to WETH
        await weth.connect(owner).deposit({value: amountToConvert});
        const ownerBalance = await weth.balanceOf(await owner.getAddress);
        console.log("weth owner balance. ready to go.", ethers.formatEther(ownerBalance));

    });
    describe.only("Aave Pool Integration", function () {
        it("Should fail when converting to WETH with 0 value", async function () {
            // Aave set-up
            const aWethAddress = "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e";
            // Convert ETH to WETH
            const balance = await ethers.provider.getBalance(policyMakerAddress);
            console.log("Contract ETH Balance:", ethers.formatEther(balance));
            expect(await policyMaker.connect(owner).convertEthToWeth(1)).to.be.revertedWith("Investment fund 0!");
        });
        it.only("should convert ETH to WETH from Policy Maker", async function () {
            const initPremiumFee = ethers.parseEther("2");
            // Send ETH to the PolicyMaker contract as part of a transaction
            // For this example, let's assume you're using the payPremium function
            await policyMaker.connect(owner).payInitialPremium(policyId, initPremiumFee);
            // const investmentFundBalance = await policyMaker.investmentFundBalance(ethers.parseUnits("1", 0));
        });
    });
});