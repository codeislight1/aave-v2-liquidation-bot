import { BigNumber } from "@ethersproject/bignumber";
import { Reserve } from "@prisma/client";
import { Address } from "viem";

export type GlobalData = {
	lastIndex: number;
	blockNumber: BigInt;
};

export type ReserveMap = { [id: string]: ReserveResponse };
export type UserReserveMap = { [reserveId: string]: UserReserve };
export type UserMap = {
	[address: string]: UserReserveMap;
};
export type UserReserve = {
	reserveId: string;
	scaledInterestBalance: string;
	scaledVariableDebt: string;
	usageAsCollateralEnabledOnUser: boolean;
};

export type UserReserveInputData = {
	reserveAddress: string;
	scaledInterestBalance: string;
	scaledVariableDebt: string;
	usageAsCollateralEnabledOnUser: boolean;
};

export type TokenType = "scaledInterestBalance" | "scaledVariableDebt";

export type Enumerable<T> = T | T[];

export type TokenArguments = {
	reserveId: string;
	user: string;
	index: BigNumber;
	amount: BigNumber;
};

export enum TokenEvent {
	dMint,
	dBurn,
	iMint,
	iBurn,
	iTransfer,
	collEnabled,
	collDisabled,
}

export type ReserveData = {
	__typename: string;
	id: string;
	underlyingAsset: string;
	name: string;
	symbol: string;
	decimals: number;
	liquidityRate: string;
	reserveLiquidationBonus: string;
	lastUpdateTimestamp: number;
	aToken: {
		__typename: string;
		id: string;
	};
};

export type ReserveResponse = {
	underlyingAsset: string;
	name: string;
	symbol: string;
	decimals: bigint;
	baseLTVasCollateral: bigint;
	reserveLiquidationThreshold: bigint;
	reserveLiquidationBonus: bigint;
	reserveFactor: bigint;
	usageAsCollateralEnabled: boolean;
	borrowingEnabled: boolean;
	stableBorrowRateEnabled: boolean;
	isActive: boolean;
	isFrozen: boolean;
	liquidityIndex: bigint;
	variableBorrowIndex: bigint;
	liquidityRate: bigint;
	variableBorrowRate: bigint;
	stableBorrowRate: bigint;
	lastUpdateTimestamp: bigint;
	aTokenAddress: string;
	stableDebtTokenAddress: string;
	variableDebtTokenAddress: string;
	interestRateStrategyAddress: string;
	availableLiquidity: bigint;
	totalPrincipalStableDebt: bigint;
	averageStableRate: bigint;
	stableDebtLastUpdateTimestamp: bigint;
	totalScaledVariableDebt: bigint;
	priceInMarketReferenceCurrency: bigint;
	priceOracle: string;
	variableRateSlope1: bigint;
	variableRateSlope2: bigint;
	stableRateSlope1: bigint;
	stableRateSlope2: bigint;
	baseStableBorrowRate: bigint;
	baseVariableBorrowRate: bigint;
	optimalUsageRatio: bigint;
	isPaused: boolean;
	isSiloedBorrowing: boolean;
	accruedToTreasury: bigint;
	unbacked: bigint;
	isolationModeTotalDebt: bigint;
	flashLoanEnabled: boolean;
	debtCeiling: bigint;
	debtCeilingDecimals: bigint;
	eModeCategoryId: bigint;
	borrowCap: bigint;
	supplyCap: bigint;
	eModeLtv: number;
	eModeLiquidationThreshold: number;
	eModeLiquidationBonus: number;
	eModePriceSource: string;
	eModeLabel: string;
	borrowableInIsolation: boolean;
};

export type _Reserve = {
	id: number;
	reserveAddress: string;
	scaledInterestBalance: string;
	scaledVariableDebt: string;
	usageAsCollateralEnabledOnUser: boolean;
	userReservesId: number;
};

export type _UserReserves = {
	userAddress: string;
	reserves: _Reserve[];
};

export type poolReserve = {
	underlyingAsset: string;
	name: string;
	symbol: string;
	decimals: number;
	// isActive: boolean;
	// isFrozen: boolean;
	usageAsCollateralEnabled: boolean;
	aTokenAddress: string;
	// stableDebtTokenAddress: string;
	variableDebtTokenAddress: string;
	borrowingEnabled: boolean;
	// stableBorrowRateEnabled: boolean;
	reserveFactor: string;
	baseLTVasCollateral: string;
	optimalUtilisationRate: string;
	// stableRateSlope1: string;
	// stableRateSlope2: string;
	// averageStableRate: string;
	// stableDebtLastUpdateTimestamp: number;
	baseVariableBorrowRate: string;
	variableRateSlope1: string;
	variableRateSlope2: string;
	// liquidityIndex: string;
	reserveLiquidationThreshold: string;
	reserveLiquidationBonus: string;
	// variableBorrowIndex: string;
	// variableBorrowRate: string;
	// avg30DaysVariableBorrowRate?: string;
	// availableLiquidity: string;
	// stableBorrowRate: string;
	// liquidityRate: string;
	// avg30DaysLiquidityRate?: string;
	// totalPrincipalStableDebt: string;
	// totalScaledVariableDebt: string;
	// lastUpdateTimestamp: number;
	// price: {
	//   priceInEth: string;
	// };
};

export type User = {
	__typename: string;
	id: string;
	reserves: UserReserve[];
};

export type lastEventTimestamp = {
	eventName: number;
	timestamp: number;
};

export type Schema = {
	users: User[];
	lastEventTimestamps: lastEventTimestamp[];
	poolReserves: poolReserve[];
	userVitals: UserVitals[];
	blockInfo: blockData;
};

export type blockData = {
	block: {
		number: number;
	};
};

export type ReserveRatesData = {
	id: string;
	symbol: string;
	paramsHistory: {
		variableBorrowIndex: string;
		liquidityIndex: string;
		timestamp: number;
	}[];
};

export type ComputedReserveData = {
	utilizationRate: string;
	totalStableDebt: string;
	totalVariableDebt: string;
	totalDebt: string;
	totalLiquidity: string;
} & ReserveData;

export type ComputedUserReserve = UserReserve & {
	underlyingBalance: string;
	underlyingBalanceETH: string;
	underlyingBalanceUSD: string;

	variableBorrows: string;
	variableBorrowsETH: string;
	variableBorrowsUSD: string;

	stableBorrows: string;
	stableBorrowsETH: string;
	stableBorrowsUSD: string;

	totalBorrows: string;
	totalBorrowsETH: string;
	totalBorrowsUSD: string;
};

export type ComputedUserReserveOpt = UserReserve & {
	underlyingBalance: string;
	underlyingBalanceETH: string;

	variableBorrows: string;
	variableBorrowsETH: string;

	stableBorrows: string;
	stableBorrowsETH: string;

	totalBorrows: string;
	totalBorrowsETH: string;
};

export type UserSummaryData = {
	id: string;
	totalLiquidityETH: string;
	totalLiquidityUSD: string;
	totalCollateralETH: string;
	totalCollateralUSD: string;
	totalBorrowsETH: string;
	totalBorrowsUSD: string;
	availableBorrowsETH: string;
	currentLoanToValue: string;
	currentLiquidationThreshold: string;
	healthFactor: string;
	reservesData: ComputedUserReserve[];
};

export type UserSummaryDataOpt = {
	id: string;
	totalLiquidityETH: string;
	totalCollateralETH: string;
	totalBorrowsETH: string;
	currentLiquidationThreshold: string;
	healthFactor: string;
};

export type UserVitals = {
	id: string;
	totalLiquidityETH: string;
	totalCollateralETH: string;
	totalBorrowsETH: string;
	currentLiquidationThreshold: string;
	healthFactor: string;
	healthFactorNum: number;
	totalCollateralETHNum: number;
};

export type ComputedUser = {
	symbol: string;
	underlyingBalance: string;
	underlyingBalanceUSD: string;
	borrowBalance: string;
	borrowBalanceUSD: string;
};

export type LiqAssetInfo = {
	reserve: Reserve;
	amount: BigNumber;
	amountUSD: BigNumber;
	oneUSD: BigNumber;
};

export type ChangeType = "UP" | "DOWN";
export type BalanceType = "INTEREST" | "DEBT";

export type LogId = {
	blockNumber: BigInt;
	logIndex: number;
};

export type ProcessedReserve = {
	processedUsersData: {
		id: string;
		totalLiquidityUSD: string;
		totalCollateralUSD: string;
		totalBorrowsUSD: string;
		availableBorrowsUSD: string;
		currentLtv: string;
		currentLiquidationThreshold: string;
		healthFactor: string;
		colls: LiqAssetInfo[];
		debts: LiqAssetInfo[];
		reservesData: ComputedUser[];
	}[];
	calls: {
		user: string;
		collateralAddress: string;
		collateralAmount: string;
		debtAddress: string;
		debtAmount: string;
	}[];
};
