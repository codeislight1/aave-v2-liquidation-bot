import fs from "fs";
import { BEFORE_GENESIS, DEFAULT_LOG_INDEX } from "../../constants";
import { GlobalData } from "../../types";
import { BaseOps } from "./BaseOps";

export class GlobalOps extends BaseOps {
	constructor() {
		const _file = "global.json";
		let defaultVal = {
			lastIndex: DEFAULT_LOG_INDEX,
			blockNumber: Number(BEFORE_GENESIS),
		};
		super(_file, defaultVal);
	}

	private getGlobal(): GlobalData {
		const res = fs.readFileSync(this.file, "utf-8");
		return JSON.parse(res) as GlobalData;
	}

	getLastBlock() {
		return this.getGlobal().blockNumber;
	}
	getLogIndex() {
		return this.getGlobal().lastIndex;
	}

	reset() {
		this._reset(); // in case it's deleted
	}

	setLastBlock(newVal: BigInt) {
		let res = this.getGlobal();

		res.blockNumber = newVal;
		fs.writeFileSync(
			this.file,
			JSON.stringify({
				lastIndex: res.lastIndex,
				blockNumber: Number(res.blockNumber),
			})
		);
	}

	setLogIndex(newVal: number) {
		let res = this.getGlobal();
		res.lastIndex = newVal;
		fs.writeFileSync(
			this.file,
			JSON.stringify({
				lastIndex: res.lastIndex,
				blockNumber: Number(res.blockNumber),
			})
		);
	}
}
