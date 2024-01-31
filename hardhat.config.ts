import * as dotenv from "dotenv";

dotenv.config();

import {HardhatUserConfig} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import '@eth-optimism/hardhat-ovm';

const PRIVATE_KEY: string = process.env.PRIVATE_KEY || "";
const API_KEY: string = process.env.INFURA_API_KEY || "";


const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: '0.8.20',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 50
                    }
                }
            },
            {
                version: '0.4.24',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 50
                    }
                }
            }
        ],
    },
    networks: {
        // Add the Optimism network configuration
        hardhat: {
            gas: 12000000,
            blockGasLimit: 0x1fffffffffffff,
            forking: {
                url: `https://mainnet.infura.io/v3/${API_KEY}`,
            },
            allowUnlimitedContractSize: true
        },
        localhost: {
            gas: 12000000,
            blockGasLimit: 0x1fffffffffffff,
            url: "http://127.0.0.1:8545",
            allowUnlimitedContractSize: true,
            timeout: 1800000
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
