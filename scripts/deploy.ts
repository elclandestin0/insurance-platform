import { ethers } from "hardhat";

async function main() {
  // Deploy the first contract
  const FirstContractFactory = await ethers.getContractFactory("PolicyMaker");
  const firstContract = await FirstContractFactory.deploy(); // Add constructor arguments if needed
  await firstContract.waitForDeployment();
  console.log("FirstContract deployed to address:", firstContract.getAddress());

  // Deploy the second contract
  const SecondContractFactory = await ethers.getContractFactory("Payout");
  const secondContract = await SecondContractFactory.deploy(); // Add constructor arguments if needed
  await secondContract.waitForDeployment();
  console.log("SecondContract deployed to address:", secondContract.getAddress());

  // Deploy the third contract
  const ThirdContractFactory = await ethers.getContractFactory("ExploitationDetector");
  const thirdContract = await ThirdContractFactory.deploy(); // Add constructor arguments if needed
  await thirdContract.waitForDeployment();
  console.log("ThirdContract deployed to address:", thirdContract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
