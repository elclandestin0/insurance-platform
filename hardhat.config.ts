import * as dotenv from "dotenv";
dotenv.config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import '@eth-optimism/hardhat-ovm';

const PRIVATE_KEY:string = process.env.PRIVATE_KEY || "";
const API_KEY:string = process.env.INFURA_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: "0.8.20", // Your Solidity version
  networks: {
    // Add the Optimism network configuration
    hardhat: {
      chainId: 1,
      forking: {
        url: `https://mainnet.infura.io/v3/${API_KEY}`,
        // blockNumber: 1622505600,
        // May 19th, 2020 -- DeFi Summer
      },
    },
    optimism: {
      url: `https://sepolia.optimism.io`, // Optimism testnet RPC URL
      accounts: [PRIVATE_KEY],
    },
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
};

export default config;
