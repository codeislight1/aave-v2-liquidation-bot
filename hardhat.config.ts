import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  
  solidity: {
    compilers: [
      {
        version: "0.8.13",
      },
      {
        version: "0.6.11",
      },
      {
        version: "0.6.6",
      },
      {
        version: "0.5.16",
      },
    ],
  }
};

export default config;
