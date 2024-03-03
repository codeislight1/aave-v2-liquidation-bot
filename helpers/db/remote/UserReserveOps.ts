import { BigNumber } from "@ethersproject/bignumber";
import { PrismaClient } from "@prisma/client";
import { BN } from "../../helper";
import {
	BalanceType,
	ChangeType,
	Enumerable,
	TokenType,
	UserMap,
	UserReserveInputData,
} from "../../types";
import { IUserReservesOps } from "../../interface/IUserReservesOps";

export class UserReserveOps implements IUserReservesOps {
	private client = new PrismaClient();

	async deleteAllUserReserves() {
		await this.client.userReserve.deleteMany();
		await this.client.userReserves.deleteMany();
	}

	async getUserReserve(userReservesId: number, reserveAddress: string) {
		return await this.client.userReserve.findFirst({
			where: {
				userReservesId: userReservesId,
				reserveAddress: reserveAddress,
			},
		});
	}

	async getUserReserveCount(userReservesId: number) {
		return await this.client.userReserve.count({
			where: {
				userReservesId: userReservesId,
			},
		});
	}

	async getUserReserves(addressId: string) {
		return await this.client.userReserves.findFirst({
			where: {
				userAddress: addressId,
			},
		});
	}

	async getAllUserReserves() {
		return await this.client.userReserves.findMany({
			select: {
				id: true,
				userAddress: true,
				reserves: true,
			},
		});
	}

	async upsertUserReserves(map: UserMap) {
		for (const [index0, [k0, v0]] of Object.entries(Object.entries(map))) {
			for (const [index1, [k1, v1]] of Object.entries(Object.entries(v0))) {
				// create a user with first reserve
				if (Number(index1) == 0) {
					await this.createUser(
						k0,
						k1,
						v1.scaledInterestBalance,
						v1.scaledVariableDebt
					);
				} else {
					// expected index in remote DB
					let userIndex = Number(index0) + 1;
					await this.createUserReserve(
						userIndex,
						k1,
						v1.scaledInterestBalance,
						v1.scaledVariableDebt
					);
				}
			}
		}
	}

	async updateUserReserve(
		userReserveId: number,
		key: TokenType,
		newValue: string
	) {
		if (key === "scaledInterestBalance") {
			await this.client.userReserve.update({
				where: {
					id: userReserveId,
				},
				data: {
					[key]: newValue,
				},
			});
		} else if (key === "scaledVariableDebt") {
			await this.client.userReserve.update({
				where: {
					id: userReserveId,
				},
				data: {
					[key]: newValue,
				},
			});
		}
	}

	async createUserReserve(
		addressId: number,
		reserveId: string,
		interestVal: string,
		debtVal: string,
		isColl: boolean = false
	) {
		await this.client.userReserve.create({
			data: {
				scaledInterestBalance: interestVal,
				scaledVariableDebt: debtVal,
				reserveAddress: reserveId,
				userReservesId: addressId,
				usageAsCollateralEnabledOnUser: isColl,
			},
		});
	}

	async deleteUserReserve(reserveId: number) {
		await this.client.userReserve.delete({
			where: {
				id: reserveId,
			},
		});
	}

	async deleteUser(userId: number) {
		await this.client.userReserves.delete({
			where: {
				id: userId,
			},
		});
	}

	async updateColl(reserveId: number, isColl: boolean) {
		await this.client.userReserve.update({
			where: {
				id: reserveId,
			},
			data: {
				usageAsCollateralEnabledOnUser: isColl,
			},
		});
	}

	async createUser(
		addressId: string,
		reserveId: string,
		interestVal: string,
		debtVal: string,
		isColl: boolean = false
	) {
		// create user
		await this.client.userReserves.create({
			data: {
				userAddress: addressId,
				reserves: {
					create: {
						reserveAddress: reserveId,
						scaledInterestBalance: interestVal,
						scaledVariableDebt: debtVal,
						usageAsCollateralEnabledOnUser: isColl,
					},
				},
			},
		});
	}

	async createUserWithManyReserves(
		addressId: string,
		reserves: Enumerable<UserReserveInputData>
	) {
		// create user
		return await this.client.userReserves.create({
			data: {
				userAddress: addressId,
				reserves: {
					createMany: {
						data: reserves,
					},
				},
			},
		});
	}

	async setUserColl(
		reserveId: string,
		addressId: string,
		isCollateral: boolean
	) {
		let user = await this.getUserReserves(addressId);
		if (user) {
			let reserve = await this.getUserReserve(user.id, reserveId);
			if (reserve) {
				await this.updateColl(reserve.id, isCollateral);
			} else {
				await this.createUserReserve(
					user.id,
					reserveId,
					"0",
					"0",
					isCollateral
				);
			}
		} else {
			await this.createUser(addressId, reserveId, "0", "0", isCollateral);
		}
	}

	async increaseScaledInterestBalance(
		addressId: string,
		reserveId: string,
		value: BigNumber
	) {
		await this._exec(addressId, reserveId, value, "INTEREST", "UP");
	}

	async decreaseScaledInterestBalance(
		addressId: string,
		reserveId: string,
		value: BigNumber
	) {
		await this._exec(addressId, reserveId, value, "INTEREST", "DOWN");
	}

	async increaseScaledVariableDebt(
		addressId: string,
		reserveId: string,
		value: BigNumber
	) {
		await this._exec(addressId, reserveId, value, "DEBT", "UP");
	}

	async decreaseScaledVariableDebt(
		addressId: string,
		reserveId: string,
		value: BigNumber
	) {
		await this._exec(addressId, reserveId, value, "DEBT", "DOWN");
	}

	private async _exec(
		addressId: string,
		reserveId: string,
		value: BigNumber,
		isInterest: BalanceType,
		isIncrease: ChangeType
	) {
		const valueStr = value.toString();
		let user = await this.getUserReserves(addressId);
		if (user) {
			let reserve = await this.getUserReserve(user.id, reserveId);
			if (reserve) {
				const reserveVal = BN(
					isInterest === "INTEREST"
						? reserve.scaledInterestBalance
						: reserve.scaledVariableDebt
				);
				let newBal =
					isIncrease === "UP" ? reserveVal.add(value) : reserveVal.sub(value);
				let deleteReserve = false;
				let deleteUser = false;
				if (isIncrease === "DOWN" && newBal.lt(0)) {
					newBal = BN("0");
					const otherBal = BN(
						isInterest === "DEBT"
							? reserve.scaledInterestBalance
							: reserve.scaledVariableDebt
					);
					if (otherBal.eq(0)) {
						let count = await this.getUserReserveCount(user.id);
						if (count === 1) {
							deleteReserve = true;
							deleteUser = true;
						} else if (count > 1) {
							deleteReserve = true;
						} else {
							throw Error(
								`No Reserve Found: ${{
									addressId,
									reserve,
									value,
									isInterest,
									isIncrease,
								}}`
							);
						}
					}
				}

				if (deleteReserve || deleteUser) {
					if (deleteReserve) await this.deleteUserReserve(reserve.id);
					if (deleteUser) await this.deleteUser(user.id);
				} else {
					await this.updateUserReserve(
						reserve.id,
						isInterest === "INTEREST"
							? "scaledInterestBalance"
							: "scaledVariableDebt",
						newBal.toString()
					);
				}
			} else {
				await this.createUserReserve(
					user.id,
					reserveId,
					isInterest === "INTEREST" ? valueStr : "0",
					isInterest ? "0" : valueStr
				);
			}
		} else {
			await this.createUser(
				addressId,
				reserveId,
				isInterest === "INTEREST" ? valueStr : "0",
				isInterest ? "0" : valueStr
			);
		}
	}
}
