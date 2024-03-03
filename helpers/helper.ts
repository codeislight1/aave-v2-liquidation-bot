import { ethers } from "ethers";
import { BigNumber } from "@ethersproject/bignumber";
import { ReserveResponse, _Reserve, _UserReserves } from "./types";
import { Reserve } from "@prisma/client";
import {
	BASE,
	HALF_RAY,
	RAY,
	SECONDS_PER_YEAR,
	clientEthMainnet,
} from "./constants";
import { Address } from "viem";
import { abi as iChainlink } from "../abi/IChainlinkAggregator.json";

export function floor(num: Number): number {
	return Math.floor(num.valueOf());
}

export function percentMul(amount: BigNumber, percent: BigNumber) {
	return amount.mul(percent).div(BASE);
}

export function percentDiv(amount: BigNumber, percent: BigNumber) {
	return amount.mul(BASE).div(percent);
}

export function concatWithComma(arr: string[]) {
	return arr.join(",");
}

export const S = (input: number) => {
	return input.toString();
};

export function BN(input: any) {
	return BigNumber.from(input);
}

export function rayMul(a: BigNumber, b: BigNumber) {
	return a.mul(b).add(HALF_RAY).div(RAY);
}

export const BN_10POW = (num: string) => {
	return BN((10 ** Number(num)).toString());
};

export function calculateCompoundedInterest(
	rate: BigNumber,
	lastUpdateTimestamp: BigNumber,
	lastTimestamp: BigNumber
): BigNumber {
	const exp = lastTimestamp.sub(lastUpdateTimestamp);
	if (exp.eq(0)) return RAY;
	const expMinusOne = exp.sub(1);
	const expMinusTwo = exp.gt(2) ? exp.sub(2) : BN(0);
	const ratePerSecond = rate.div(SECONDS_PER_YEAR);
	const basePowerTwo = rayMul(ratePerSecond, ratePerSecond);
	const basePowerThree = rayMul(basePowerTwo, ratePerSecond);
	const secondTerm = exp.mul(expMinusOne).mul(basePowerTwo).div(2);
	const thirdTerm = exp
		.mul(expMinusOne)
		.mul(expMinusTwo)
		.mul(basePowerThree)
		.div(6);
	return RAY.add(ratePerSecond.mul(exp)).add(secondTerm).add(thirdTerm);
}

export function castReserveResponseToReserve(
	input: ReserveResponse,
	normalizedInterestBalance: BigNumber,
	normalizedDebtVariable: BigNumber
): Reserve {
	return {
		underlyingAsset: input.underlyingAsset,
		name: input.name,
		symbol: input.symbol,
		decimals: input.decimals.toString(),
		baseLTVasCollateral: input.baseLTVasCollateral.toString(),
		reserveLiquidationThreshold: input.reserveLiquidationThreshold.toString(),
		reserveLiquidationBonus: input.reserveLiquidationBonus.toString(),
		reserveFactor: input.reserveFactor.toString(),
		usageAsCollateralEnabled: input.usageAsCollateralEnabled,
		borrowingEnabled: input.borrowingEnabled,
		stableBorrowRateEnabled: input.stableBorrowRateEnabled,
		isActive: input.isActive,
		isFrozen: input.isFrozen,
		liquidityIndex: input.liquidityIndex.toString(),
		variableBorrowIndex: input.variableBorrowIndex.toString(),
		liquidityRate: input.liquidityRate.toString(),
		variableBorrowRate: input.variableBorrowRate.toString(),
		stableBorrowRate: input.stableBorrowRate.toString(),
		normalizedInterestBalance: normalizedInterestBalance.toString(),
		normalizedDebtVariable: normalizedDebtVariable.toString(),
		lastUpdateTimestamp: input.lastUpdateTimestamp.toString(),
		aTokenAddress: input.aTokenAddress,
		stableDebtTokenAddress: input.stableDebtTokenAddress,
		variableDebtTokenAddress: input.variableDebtTokenAddress,
		interestRateStrategyAddress: input.interestRateStrategyAddress,
		availableLiquidity: input.availableLiquidity.toString(),
		totalPrincipalStableDebt: input.totalPrincipalStableDebt.toString(),
		averageStableRate: input.averageStableRate.toString(),
		stableDebtLastUpdateTimestamp:
			input.stableDebtLastUpdateTimestamp.toString(),
		totalScaledVariableDebt: input.totalScaledVariableDebt.toString(),
		priceInMarketReferenceCurrency:
			input.priceInMarketReferenceCurrency.toString(),
		priceOracle: input.priceOracle,
		variableRateSlope1: input.variableRateSlope1.toString(),
		variableRateSlope2: input.variableRateSlope2.toString(),
		stableRateSlope1: input.stableRateSlope1.toString(),
		stableRateSlope2: input.stableRateSlope2.toString(),
		baseStableBorrowRate: input.baseStableBorrowRate.toString(),
		baseVariableBorrowRate: input.baseVariableBorrowRate.toString(),
		optimalUsageRatio: input.optimalUsageRatio.toString(),
		isPaused: input.isPaused,
		isSiloedBorrowing: input.isSiloedBorrowing,
		accruedToTreasury: input.accruedToTreasury.toString(),
		unbacked: input.unbacked.toString(),
		isolationModeTotalDebt: input.isolationModeTotalDebt.toString(),
		flashLoanEnabled: input.flashLoanEnabled,
		debtCeiling: input.debtCeiling.toString(),
		debtCeilingDecimals: input.debtCeilingDecimals.toString(),
		eModeCategoryId: input.eModeCategoryId.toString(),
		borrowCap: input.borrowCap.toString(),
		supplyCap: input.supplyCap.toString(),
		eModeLtv: input.eModeLtv.toString(),
		eModeLiquidationThreshold: input.eModeLiquidationThreshold.toString(),
		eModeLiquidationBonus: input.eModeLiquidationBonus.toString(),
		eModePriceSource: input.eModePriceSource,
		eModeLabel: input.eModeLabel,
		borrowableInIsolation: input.borrowableInIsolation,
	};
}

export function computeUserReserveData(
	poolReserve: Reserve,
	userReserve: _Reserve,
	ethUsdPrice: bigint
) {
	const {
		symbol,
		decimals,
		priceInMarketReferenceCurrency: price,
	} = poolReserve;
	const underlyingBalance = getCompoundedBalance(
		BN(poolReserve.normalizedInterestBalance),
		BN(userReserve.scaledInterestBalance)
	);
	const borrowBalance = getCompoundedBalance(
		BN(poolReserve.normalizedDebtVariable),
		BN(userReserve.scaledVariableDebt)
	);
	const underlyingBalanceUSD = getUsdBalance(
		underlyingBalance,
		BN(price),
		Number(decimals),
		BN(ethUsdPrice)
	);
	const borrowBalanceUSD = getUsdBalance(
		borrowBalance,
		BN(price),
		Number(decimals),
		BN(ethUsdPrice)
	);
	return {
		symbol,
		underlyingBalance,
		borrowBalance,
		underlyingBalanceUSD,
		borrowBalanceUSD,
	};
}

function getCompoundedBalance(
	normalizedBalance: BigNumber,
	scaledBalance: BigNumber
) {
	return normalizedBalance.mul(scaledBalance).div(RAY);
}

export function getUsdBalance(
	balance: BigNumber,
	priceInEth: BigNumber,
	decimals: number,
	ethPrice: BigNumber
) {
	const chainlinkEthBaseDecimals = (10 ** 8).toString();
	return balance
		.mul(priceInEth)
		.mul(ethPrice)
		.div((10 ** decimals).toString())
		.div(chainlinkEthBaseDecimals);
}

export async function getEthPrice() {
	const ethChainlinkAddress: Address =
		"0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419";

	let [, price, , ,] = (await clientEthMainnet.readContract({
		abi: iChainlink,
		address: ethChainlinkAddress,
		functionName: "latestRoundData",
	})) as [bigint, bigint, bigint, bigint, bigint];
	return price;
}
