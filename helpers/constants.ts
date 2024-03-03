import { BigNumber } from "@ethersproject/bignumber";
import { Chain, createPublicClient, createWalletClient, http } from "viem";
import { decodeEventLog, Log } from "viem";
import { TokenEvent } from "./types";
import dotenv from "dotenv";
dotenv.config();

export const RAY = BigNumber.from("1000000000000000000000000000");
export const HALF_RAY = BigNumber.from("500000000000000000000000000");
export const FACTOR = BigNumber.from("1000000000000000000");
export const BASE = BigNumber.from("10000");
export const HALF_FACTOR = BigNumber.from("500000000000000000"); //  0.5e18
export const MIN_HEALTH_FACTOR = BigNumber.from("300000000000000000"); //  0.3e18
export const BORROW_FREE = BigNumber.from("-1");

export const alchemyMainet: Chain = {
	id: 1,
	name: "Mainnet",
	network: "mainnet",
	nativeCurrency: {
		decimals: 18,
		name: "Ether",
		symbol: "ETH",
	},
	rpcUrls: {
		default: { http: [process.env.ALCHEMY_RPC_MAINNET as string] },
		public: { http: [process.env.ALCHEMY_RPC_MAINNET as string] },
	},
};

const localhostfoundry: Chain = {
	id: 8453, // foundry anvil
	name: "Localhost",
	network: "localhost",
	nativeCurrency: {
		decimals: 18,
		name: "Ether",
		symbol: "ETH",
	},
	rpcUrls: {
		default: { http: ["http://127.0.0.1:8545"] },
		public: { http: ["http://127.0.0.1:8545"] },
	},
};

const chosenChain = localhostfoundry;

export const clientEthMainnet = createPublicClient({
	chain: alchemyMainet,
	transport: http(),
});
export const walletClient = createWalletClient({
	chain: chosenChain,
	transport: http(),
});
export const client = createPublicClient({
	chain: chosenChain,
	transport: http(),
});

export const GENESIS = 11362579n; // before genesis blk
export const BEFORE_GENESIS = GENESIS - 1n; // before genesis blk
export const DEFAULT_LOG_INDEX = 0;
export const SIZE = 799;
export const SECONDS_PER_YEAR = 30758400;
export const lendingAddress = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9";
export const providerAddress = "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5";
export const dataProviderAddress = "0x00e50FAB64eBB37b87df06Aa46b8B35d5f1A4e1A";

// event constants

export const debtToken_Mint =
	"event Mint(address indexed from, address indexed onBehalfOf, uint256 value, uint256 index)";
export const debtToken_Burn =
	"event Burn(address indexed user, uint256 amount, uint256 index)";
export const interestToken_Mint =
	"event Mint(address indexed from, uint256 value, uint256 index)";
export const interestToken_Burn =
	"event Burn(address indexed from, address indexed target, uint256 value, uint256 index)";
export const interestBalance_Transfer =
	"event BalanceTransfer(address indexed from, address indexed to, uint256 value, uint256 index)";
export const lendingPoolCollateralEnabled =
	"event ReserveUsedAsCollateralEnabled(address indexed reserve, address indexed user)";
export const lendingPoolCollateralDisabled =
	"event ReserveUsedAsCollateralDisabled(address indexed reserve, address indexed user)";

export const debtToken_MINT_sig =
	"0x2f00e3cdd69a77be7ed215ec7b2a36784dd158f921fca79ac29deffa353fe6ee";
export const debtToken_Burn_sig =
	"0x49995e5dd6158cf69ad3e9777c46755a1a826a446c6416992167462dad033b2a";
export const interestToken_MINT_sig =
	"0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f";
export const interestToken_Burn_sig =
	"0x5d624aa9c148153ab3446c1b154f660ee7701e549fe9b62dab7171b1c80e6fa2";
export const interestBalance_Transfer_sig =
	"0x4beccb90f994c31aced7a23b5611020728a23d8ec5cddd1a3e9d97b96fda8666";
export const lendingPoolCollateralEnabled_sig =
	"0x00058a56ea94653cdf4f152d227ace22d4c00ad99e2a43f58cb7d9e3feb295f2";
export const lendingPoolCollateralDisabled_sig =
	"0x44c58d81365b66dd4b1a7f36c25aa97b8c71c361ee4937adc1a00000227db5dd";

// sig -> prototype
export const eventSigToPrototype = new Map<
	string,
	{ tokenEvent: TokenEvent; prototype: string }
>([
	[
		debtToken_MINT_sig,
		{ tokenEvent: TokenEvent.dMint, prototype: debtToken_Mint },
	],
	[
		debtToken_Burn_sig,
		{ tokenEvent: TokenEvent.dBurn, prototype: debtToken_Burn },
	],
	[
		interestToken_MINT_sig,
		{ tokenEvent: TokenEvent.iMint, prototype: interestToken_Mint },
	],
	[
		interestToken_Burn_sig,
		{ tokenEvent: TokenEvent.iBurn, prototype: interestToken_Burn },
	],
	[
		interestBalance_Transfer_sig,
		{ tokenEvent: TokenEvent.iTransfer, prototype: interestBalance_Transfer },
	],
	[
		lendingPoolCollateralEnabled_sig,
		{
			tokenEvent: TokenEvent.collEnabled,
			prototype: lendingPoolCollateralEnabled,
		},
	],
	[
		lendingPoolCollateralDisabled_sig,
		{
			tokenEvent: TokenEvent.collDisabled,
			prototype: lendingPoolCollateralDisabled,
		},
	],
]);

const _eventPrototypes = () => {
	let res = [];
	for (let [k, v] of eventSigToPrototype.entries()) {
		res.push(v.prototype);
	}
	return res;
};

export const eventPrototypes = _eventPrototypes();

export const decodeEvent = (log: Log, _abi: any) => {
	return decodeEventLog({
		abi: _abi,
		topics: log.topics,
		data: log.data,
	});
};
