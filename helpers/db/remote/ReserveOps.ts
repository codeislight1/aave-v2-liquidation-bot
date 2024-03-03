import { PrismaClient, Reserve } from "@prisma/client";
import { ReserveResponse } from "../../types";
import {
	BN,
	calculateCompoundedInterest,
	castReserveResponseToReserve,
	rayMul,
} from "../../helper";
import { RAY, SECONDS_PER_YEAR } from "../../constants";

export class ReserveOps {
	private client = new PrismaClient();

	async getReserve(reserveId: string) {
		return await this.client.reserve.findUnique({
			where: {
				underlyingAsset: reserveId,
			},
		});
	}

	async getReserves(reserveId: string[]) {
		return await this.client.reserve.findMany({
			where: {
				underlyingAsset: {
					in: reserveId,
				},
			},
		});
	}

	async getAllReserves() {
		return await this.client.reserve.findMany();
	}

	async createManyReserves(newReserves: Reserve[]) {
		return await this.client.reserve.createMany({
			data: newReserves,
		});
	}

	async upsertReserve(updatedReserve: Reserve) {
		await this.client.reserve.upsert({
			where: {
				underlyingAsset: updatedReserve.underlyingAsset,
			},
			update: updatedReserve,
			create: updatedReserve,
		});
	}

	async updateAll(
		updatedReserves: ReserveResponse[],
		lastBlockTimestamp: number
	) {
		for (let r of updatedReserves) {
			let lastTimestamp = r.lastUpdateTimestamp;
			let liquidityIndex = BN(r.liquidityIndex);
			let variableBorrowIndex = BN(r.variableBorrowIndex);
			let normalizedInterestBalance = liquidityIndex;
			let normalizedDebtVariable = variableBorrowIndex;
			if (lastBlockTimestamp != Number(lastTimestamp)) {
				let liquidityRate = BN(r.liquidityRate);
				let variableBorrowRate = BN(r.variableBorrowRate);
				let timeDiff = lastBlockTimestamp - Number(lastTimestamp);
				let linearInterest = liquidityRate
					.mul(timeDiff)
					.div(SECONDS_PER_YEAR)
					.add(RAY);
				let compoundedInterest = calculateCompoundedInterest(
					variableBorrowRate,
					BN(lastTimestamp),
					BN(lastBlockTimestamp)
				);
				normalizedInterestBalance = rayMul(linearInterest, liquidityIndex);
				normalizedDebtVariable = rayMul(
					compoundedInterest,
					variableBorrowIndex
				);
			}
			await this.upsertReserve(
				castReserveResponseToReserve(
					r,
					normalizedInterestBalance,
					normalizedDebtVariable
				)
			);
		}
	}
}
