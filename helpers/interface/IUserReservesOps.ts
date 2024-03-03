import { UserReserve, UserReserves } from "@prisma/client";
import { TokenType, UserMap } from "../types";
import { BigNumber } from "@ethersproject/bignumber";

export interface IUserReservesOps {
	deleteAllUserReserves(): void;
	getUserReserve(
		userReservesId: number,
		reserveAddress: string
	): Promise<UserReserve | null>;
	getUserReserveCount(userReservesId: number): Promise<number>;
	getUserReserves(addressId: string): Promise<UserReserves | null>;
	getAllUserReserves(): Promise<UserReserves[] | null>;
	upsertUserReserves(map: UserMap): void;
	updateUserReserve(
		userReserveId: number,
		key: TokenType,
		newValue: string
	): void;
	createUserReserve(
		addressId: number,
		reserveId: string,
		interestVal: string,
		debtVal: string,
		isColl: boolean
	): void;
	deleteUserReserve(reserveId: number): void;
	deleteUser(userId: number): void;
	updateColl(reserveId: number, isColl: boolean): void;
	createUser(
		addressId: string,
		reserveId: string,
		interestVal: string,
		debtVal: string,
		isColl: boolean
	): void;
	setUserColl(
		reserveId: string,
		addressId: string,
		isCollateral: boolean
	): void;
	increaseScaledInterestBalance(
		addressId: string,
		reserveId: string,
		value: BigNumber
	): void;
	decreaseScaledInterestBalance(
		addressId: string,
		reserveId: string,
		value: BigNumber
	): void;
	increaseScaledVariableDebt(
		addressId: string,
		reserveId: string,
		value: BigNumber
	): void;
	decreaseScaledVariableDebt(
		addressId: string,
		reserveId: string,
		value: BigNumber
	): void;
}
