import * as dotenv from "dotenv";
dotenv.config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import '@eth-optimism/hardhat-ovm';

const PRIVATE_KEY:string = process.env.PRIVATE_KEY || "";
const API_KEY:string = process.env.INFURA_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: "0.7.6", // Your Solidity version
  networks: {
    // Add the Optimism network configuration
    optimism: {
      url: `https://optimism-sepolia.infura.io/v3/` + API_KEY, // Optimism testnet RPC URL
      accounts: [PRIVATE_KEY],
    },
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
};

export default config;
