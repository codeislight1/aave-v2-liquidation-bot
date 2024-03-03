import { clientEthMainnet } from "../constants";
import { abi as iTokenAbi } from "../../abi/AToken.json";
import { Address } from "viem";

export class CacheReserves {
	private cacheReservesToUnderlying = new Map<string, string>();
	async getUnderlying(reserveAddress: Address) {
		let result = this.cacheReservesToUnderlying.get(reserveAddress);
		if (!result) {
			// retrieve it onchain
			const res = (await clientEthMainnet.readContract({
				abi: iTokenAbi,
				address: reserveAddress,
				functionName: "UNDERLYING_ASSET_ADDRESS",
			})) as Address;
			result = res;
			// cache it
			this.cacheReservesToUnderlying.set(reserveAddress, res);
		}
		return result;
	}
}
