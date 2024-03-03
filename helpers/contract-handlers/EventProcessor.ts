import { BigNumber } from "@ethersproject/bignumber";
import { GlobalOps } from "../db/local/GlobalOps";
import { Address, Log } from "viem";
import { LogId, TokenArguments, TokenEvent } from "../types";
import { RAY } from "../constants";
import { UserReserveOps } from "../db/remote/UserReserveOps";
import { decodeEvent, eventSigToPrototype } from "../constants";
import { abi as iTokenAbi } from "../../abi/AToken.json";
import { abi as dTokenAbi } from "../../abi/VariableDebtToken.json";
import { abi as lpAbi } from "../../abi/LendingPool.json";
import { CacheReserves } from "./CacheReserves";

export class EventProcessor {
	readonly dbGlobal = new GlobalOps();
	readonly dbUsers = new UserReserveOps();
	readonly cacheReserves = new CacheReserves();

	updateBlockAndLogIndex(blkNumber: BigInt, logIndex: number | null = null) {
		this.dbGlobal.setLastBlock(blkNumber);
		if (logIndex !== null) this.dbGlobal.setLogIndex(logIndex);
	}

	// isInterest or debt | isMint or Burn
	async processToken(
		log: LogId,
		args: TokenArguments,
		isInterest: boolean,
		isMint: boolean
	) {
		let user = args.user;
		let index = BigNumber.from(args.index);
		let amount = BigNumber.from(args.amount);
		if (index.eq(BigNumber.from(0))) throw Error("divide by zero index");
		let reserveId = args.reserveId as Address;
		// adjsuted scaled balance
		let adjustedBal = RAY.mul(amount).div(index);
		// console.log("log", log.blockNumber, log.logIndex, adjustedBal.toString(), isMint ? "Up" : "Down", isInterest ? "Interest" : "Debt", user, log.transactionHash)
		let db = this.dbUsers;
		if (isInterest)
			if (isMint)
				await db.increaseScaledInterestBalance(user, reserveId, adjustedBal);
			else await db.decreaseScaledInterestBalance(user, reserveId, adjustedBal);
		else if (isMint)
			await db.increaseScaledVariableDebt(user, reserveId, adjustedBal);
		else await db.decreaseScaledVariableDebt(user, reserveId, adjustedBal);

		this.updateBlockAndLogIndex(log.blockNumber as BigInt, log.logIndex);
	}

	async processColl(reserve: string, user: string, isCollateral: boolean) {
		await this.dbUsers.setUserColl(reserve, user, isCollateral);
	}

	async processLog(log: Log) {
		let log0 = log.topics[0] as string;
		let tokenEvent = eventSigToPrototype.get(log0)?.tokenEvent;
		let tokenPrototype = eventSigToPrototype.get(log0)?.prototype;
		let reserveId = log.address;
		let blockLogIndex = `${log.blockNumber},${log.logIndex}`;
		// TO DO assign debt and interest address to underlying
		if (tokenPrototype) {
			let user;
			let amount;
			let index;
			let args;
			let params: string[];
			let logInfo = {
				blockNumber: log.blockNumber as BigInt,
				logIndex: log.logIndex as number,
			};
			switch (tokenEvent) {
				case TokenEvent.dMint:
					args = decodeEvent(log, dTokenAbi).args as any;
					user = args["onBehalfOf"];
					amount = args["value"];
					index = args["index"];
					reserveId = (await this.cacheReserves.getUnderlying(
						reserveId as Address
					)) as Address;
					params = [reserveId, user, amount, index];

					await this.processToken(
						logInfo,
						{ user: user, amount: amount, index: index, reserveId: reserveId },
						false,
						true
					);
					break;
				case TokenEvent.dBurn:
					args = decodeEvent(log, dTokenAbi).args as any;
					user = args["user"];
					amount = args["amount"];
					index = args["index"];
					reserveId = (await this.cacheReserves.getUnderlying(
						reserveId as Address
					)) as Address;
					params = [reserveId, user, amount, index];
					await this.processToken(
						logInfo,
						{ user: user, amount: amount, index: index, reserveId: reserveId },
						false,
						false
					);
					break;
				case TokenEvent.iMint:
					args = decodeEvent(log, iTokenAbi).args as any;
					user = args["from"];
					amount = args["value"];
					index = args["index"];
					reserveId = (await this.cacheReserves.getUnderlying(
						reserveId as Address
					)) as Address;
					params = [reserveId, user, amount, index];
					await this.processToken(
						logInfo,
						{ user: user, amount: amount, index: index, reserveId: reserveId },
						true,
						true
					);
					break;
				case TokenEvent.iBurn:
					args = decodeEvent(log, iTokenAbi).args as any;
					user = args["from"];
					amount = args["value"];
					index = args["index"];
					reserveId = (await this.cacheReserves.getUnderlying(
						reserveId as Address
					)) as Address;
					params = [reserveId, user, amount, index];
					await this.processToken(
						logInfo,
						{ user: user, amount: amount, index: index, reserveId: reserveId },
						true,
						false
					);
					break;
				case TokenEvent.iTransfer:
					args = decodeEvent(log, iTokenAbi).args as any;
					let user0 = args["from"];
					let user1 = args["to"];
					amount = args["value"];
					index = args["index"];
					reserveId = (await this.cacheReserves.getUnderlying(
						reserveId as Address
					)) as Address;
					params = [reserveId, user0, user1, amount, index];
					await this.processToken(
						logInfo,
						{ user: user0, amount: amount, index: index, reserveId: reserveId },
						true,
						false
					);
					await this.processToken(
						logInfo,
						{ user: user1, amount: amount, index: index, reserveId: reserveId },
						true,
						true
					);
					break;
				case TokenEvent.collEnabled:
					args = decodeEvent(log, lpAbi).args as any;
					reserveId = args["reserve"]; // underlying asset
					user = args["user"];
					params = [reserveId, user];
					await this.processColl(reserveId, user, true);
					break;
				case TokenEvent.collDisabled:
					args = decodeEvent(log, lpAbi).args as any;
					reserveId = args["reserve"]; // underlying asset
					user = args["user"];
					params = [reserveId, user];
					await this.processColl(reserveId, user, false);
					break;
				default:
					break;
			}
		}
	}

	async processLogs(logs: Log[], toBlock: bigint) {
		for (let log of logs) {
			await this.processLog(log);
		}

		this.updateBlockAndLogIndex(toBlock);
	}
}
