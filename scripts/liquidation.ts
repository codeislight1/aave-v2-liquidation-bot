import { Reserve } from "@prisma/client";
import { BORROW_FREE, FACTOR, HALF_FACTOR, MIN_HEALTH_FACTOR } from "../helpers/constants";
import { ReserveOps } from "../helpers/db/remote/ReserveOps";
import { UserReserveOps } from "../helpers/db/remote/UserReserveOps";
import { ComputedUser, LiqAssetInfo, ProcessedReserve, _Reserve, _UserReserves } from "../helpers/types";
import { BN, BN_10POW, computeUserReserveData, getEthPrice, percentDiv, percentMul } from "../helpers/helper";

let isOnce = false;
const reserves = new ReserveOps();
const userReserves = new UserReserveOps();

// scan for liquidtable positions
export async function processPositions() {
    if (!isOnce) {
        isOnce = true;
        // TODO process them on parallel
        const start = new Date()
        let _reserves = await reserves.getAllReserves()
        let _userReserves = await userReserves.getAllUserReserves();
        let _ethPrice = await getEthPrice()
        let { calls, processedUsersData } = processReserves(_reserves, _userReserves, _ethPrice);
        const elapsed = ((new Date()).getTime() - start.getTime()) / 1000;
        let underwaterUsers = processedUsersData.filter((r) => !BN(r.healthFactor).eq(BORROW_FREE) && BN(r.healthFactor).lt(FACTOR));
        console.log("underwater users", underwaterUsers.length, "spent", elapsed, "s");
    }
}

processPositions().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

export function processReserves(_reserves: Reserve[], _users: _UserReserves[], ethPrice: bigint) {
    let calls: Object[] = []
    // users
    let processedUsersData = _users.map((_userReserves, index) => {
        const zero = BN("0")
        let currentLiquidationThreshold = zero
        let totalCollateralUSD = zero
        let totalLiquidityUSD = zero
        let totalBorrowsUSD = zero
        let currentLtv = zero
        let colls: LiqAssetInfo[] = []
        let debts: LiqAssetInfo[] = []
        // reserves
        let processedUserReservesData: ComputedUser[] = _userReserves.reserves.map((_userReserve) => {
            const poolReserve = _reserves.find((reserve) => _userReserve.reserveAddress === reserve.underlyingAsset)
            if (!poolReserve) {
                throw new Error(
                    `Reserve is not registered on platform, please contact support = ${_userReserve}`
                );
            }
            const computedUserReserve = computeUserReserveData(
                poolReserve,
                _userReserve,
                ethPrice
            );
            const underlyingBalanceUSD = computedUserReserve.underlyingBalanceUSD;
            const borrowBalanceUSD = computedUserReserve.borrowBalanceUSD;
            totalLiquidityUSD = totalLiquidityUSD.add(underlyingBalanceUSD)
            totalBorrowsUSD = totalBorrowsUSD.add(borrowBalanceUSD)

            if (poolReserve.usageAsCollateralEnabled && _userReserve.usageAsCollateralEnabledOnUser && computedUserReserve.underlyingBalance.gt(0)) {
                // TO DO account for user collateral enabled
                totalCollateralUSD = totalCollateralUSD.add(underlyingBalanceUSD)
                currentLtv = currentLtv.add(underlyingBalanceUSD.mul(poolReserve.baseLTVasCollateral))
                currentLiquidationThreshold = currentLiquidationThreshold.add(underlyingBalanceUSD.mul(poolReserve.reserveLiquidationThreshold))
                colls.push({
                    reserve: poolReserve,
                    amount: computedUserReserve.underlyingBalance,
                    amountUSD: computedUserReserve.underlyingBalanceUSD,
                    oneUSD: computedUserReserve.underlyingBalanceUSD.mul(BN_10POW(poolReserve.decimals)).div(computedUserReserve.underlyingBalance),
                })
            }

            if (computedUserReserve.borrowBalance.gt(0)) {
                debts.push({
                    reserve: poolReserve,
                    amount: computedUserReserve.borrowBalance,
                    amountUSD: computedUserReserve.borrowBalanceUSD,
                    oneUSD: computedUserReserve.borrowBalanceUSD.mul(BN_10POW(poolReserve.decimals)).div(computedUserReserve.borrowBalance),
                })
            }

            return {
                reserveId: poolReserve.underlyingAsset,
                isCollateral: _userReserve.usageAsCollateralEnabledOnUser,
                symbol: computedUserReserve.symbol,
                underlyingBalance: computedUserReserve.underlyingBalance.toString(),
                underlyingBalanceUSD: computedUserReserve.underlyingBalanceUSD.toString(),
                borrowBalance: computedUserReserve.borrowBalance.toString(),
                borrowBalanceUSD: computedUserReserve.borrowBalanceUSD.toString()
            };
        }).sort((a, b) =>
            a.symbol > b.symbol
                ? 1
                : a.symbol < b.symbol
                    ? -1
                    : 0
        )

        if (currentLtv.gt(0)) currentLtv = currentLtv.div(totalCollateralUSD)

        if (currentLiquidationThreshold.gt(0)) currentLiquidationThreshold = currentLiquidationThreshold.div(totalCollateralUSD)


        const healthFactor = totalBorrowsUSD.eq(0) ? BORROW_FREE : percentMul(totalCollateralUSD.mul(FACTOR), currentLiquidationThreshold).div(totalBorrowsUSD)
        const avilableBorrows = totalCollateralUSD.mul(currentLtv).div(10 ** 4).sub(totalBorrowsUSD)
        const availableBorrowsUSD = currentLtv.eq(0) ? zero : avilableBorrows.gt(0) ? avilableBorrows : zero;

        if (!BN(healthFactor).eq(BORROW_FREE) && BN(healthFactor).lt(FACTOR) && healthFactor.gt(MIN_HEALTH_FACTOR) && colls.length > 0 && debts.length > 0) {
            const coll = colls.sort((a, b) => a.amountUSD.gt(b.amountUSD) ? 1 : a.amountUSD.gt(b.amountUSD) ? -1 : 0)[0];
            const debt = debts.sort((a, b) => a.amountUSD.gt(b.amountUSD) ? 1 : a.amountUSD.gt(b.amountUSD) ? -1 : 0)[0];
            const liqBonus = coll.reserve.reserveLiquidationBonus;

            let maxLiquidatableDebtAmount = HALF_FACTOR.mul(debt.amount).div(FACTOR);
            let maxLiquidatableDebtAmountUSD = HALF_FACTOR.mul(debt.amountUSD).div(FACTOR);

            let maxAmountColl = percentMul(maxLiquidatableDebtAmountUSD.mul(BN_10POW(coll.reserve.decimals)), BN(liqBonus)).div(coll.oneUSD)

            let debtAmountNeeded;
            let collateralAmount;

            if (maxAmountColl.gt(coll.amount)) {
                collateralAmount = coll.amount;
                debtAmountNeeded = percentDiv(coll.amountUSD.mul(BN_10POW(debt.reserve.decimals)), BN(liqBonus)).div(debt.oneUSD)
            } else {
                collateralAmount = maxAmountColl;
                debtAmountNeeded = maxLiquidatableDebtAmount;
            }

            calls.push({
                user: _userReserves.userAddress,
                collateralAddress: coll.reserve.underlyingAsset,
                collateralAmount: collateralAmount,
                debtAddress: debt.reserve.underlyingAsset,
                debtAmount: debtAmountNeeded
            })
        }

        return {
            id: _userReserves.userAddress,
            totalLiquidityUSD: totalLiquidityUSD.toString(),
            totalCollateralUSD: totalCollateralUSD.toString(),
            totalBorrowsUSD: totalBorrowsUSD.toString(),
            availableBorrowsUSD: availableBorrowsUSD.toString(),
            currentLtv: currentLtv.toString(),
            currentLiquidationThreshold: currentLiquidationThreshold.toString(),
            healthFactor: healthFactor.toString(),
            colls,
            debts,
            reservesData: processedUserReservesData
        }
    })

    return {
        processedUsersData,
        calls
    } as ProcessedReserve;
}