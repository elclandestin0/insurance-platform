import { ethers } from "hardhat";
import {PolicyMaker, Payout} from "../typechain";
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";

async function main() {
  // Deploy the first contract
  let owner: HardhatEthersSigner;
  [owner] = await ethers.getSigners();
  const PolicyMaker = await ethers.getContractFactory("PolicyMaker");
  const policyMaker: PolicyMaker = await PolicyMaker.deploy(owner.address); // Add constructor arguments if needed
  await policyMaker.deployed();
  console.log("FirstContract deployed to address:", policyMaker.address);

  // Deploy the second contract
  const Payout = await ethers.getContractFactory("Payout");
  const payout = await Payout.deploy(await policyMaker.address); // Add constructor arguments if needed
  await payout.deployed();
  console.log("SecondContract deployed to address:", payout.address);

  // // Deploy the third contract
  const ExploitationDetector = await ethers.getContractFactory("ExploitationDetector");
  const exploitationDetector = await ExploitationDetector.deploy(); // Add constructor arguments if needed
  await exploitationDetector.deployed();
  console.log("ThirdContract deployed to address:", exploitationDetector.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
