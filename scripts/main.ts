import { parseAbi } from "viem";
import { abi as dataProviderAbi } from "../abi/IUiPoolDataProviderV3.json"
import { SIZE, dataProviderAddress, providerAddress, clientEthMainnet, lendingAddress } from "../helpers/constants";
import { ReserveResponse } from "../helpers/types";
import EventEmitter from "events";
import { ReserveOps } from "../helpers/db/remote/ReserveOps";
import { GlobalOps } from "../helpers/db/local/GlobalOps";
import { EventProcessor } from "../helpers/contract-handlers/EventProcessor";
import { eventPrototypes } from "../helpers/constants";

let isOnce = false;
let firstRun = true;
let recoveryMode = false;
let addresses: string[] = [];

const e = new EventEmitter();
const dbGlobal = new GlobalOps();
const dbReserves = new ReserveOps();
const ep = new EventProcessor();
let cacheReserves: ReserveResponse[] = [];

export async function main() {
    if (!isOnce) {
        isOnce = true;
        await fetchReserves();

        clientEthMainnet.watchBlockNumber({
            onError: error => {
                console.log("error", error)
            },
            onBlockNumber: async blockNumber => {
                if (recoveryMode) return;
                if (firstRun) await processSingleLastBlock();
                let lastBK = blockNumber - 1n
                let processedBlock = dbGlobal.getLastBlock() as BigInt;
                if ((Number(lastBK) - Number(processedBlock)) / SIZE < 1) {
                    // synced
                    await fetchReserves()
                    let logs = await getLogs(BigInt(Number(processedBlock) + 1), lastBK)
                    await ep.processLogs(logs, lastBK)
                    console.log(`processed blk ${processedBlock} new blk ${lastBK} has ${logs.length} logs`)
                } else {
                    console.log("initiate recovery")
                    e.emit("recovery", lastBK)
                }
                if (firstRun) firstRun = false;
            }
        })

        e.on("recovery", async (latestBlock: BigInt) => {
            console.log("recovery started");
            recoveryMode = true;
            // start
            await processRecovery(latestBlock)
            // end
            console.log("recovery ends")
            recoveryMode = false;
        })
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

async function fetchReserves() {
    let response = await clientEthMainnet.readContract({
        address: dataProviderAddress,
        abi: dataProviderAbi,
        functionName: "getReservesData",
        args: [providerAddress]
    }) as [[], object]

    if (response[0].length > 0) {
        let lastBlockTimestamp = (await clientEthMainnet.getBlock({
            blockTag: "latest"
        })).timestamp;
        const result = response[0] as ReserveResponse[];
        cacheReserves = result;
        await dbReserves.updateAll(result, Number(lastBlockTimestamp))
        let _debt_interest: string[] = [];
        for (let a of result) {
            // gather interest and debt
            _debt_interest = _debt_interest.concat([a.aTokenAddress, a.variableDebtTokenAddress])
        }
        // add lending pool
        addresses = _debt_interest.concat(lendingAddress);
    }
}

async function getLogs(from: bigint, to: bigint) {
    return await clientEthMainnet.getLogs({
        address: addresses as `0x${string}`[],
        events: parseAbi(eventPrototypes),
        fromBlock: from,
        toBlock: to,
    })
}

async function processSingleLastBlock() {
    let processedBlock = dbGlobal.getLastBlock()
    let preProcessedLogIndex = dbGlobal.getLogIndex()
    let logs = await getLogs(BigInt(processedBlock.valueOf()), BigInt(processedBlock.valueOf()));
    for (let log of logs) {
        let index = log.logIndex;
        if (index > preProcessedLogIndex) await ep.processLog(log)
    }
    ep.updateBlockAndLogIndex(processedBlock)
}

async function processRecovery(latestBlock: BigInt) {
    let processedBlock = dbGlobal.getLastBlock();
    let diffBlock = Number(latestBlock) - Number(processedBlock);
    
    let startTime = new Date().valueOf();
    let startBlock = Number(processedBlock) + 1;
    while ((Number(latestBlock) - Number(processedBlock)) / SIZE > 1 && processedBlock !== latestBlock) {
        let fromBK = BigInt(Number(processedBlock) + 1) // offset by 1
        let toBK = BigInt(Number(processedBlock) + (diffBlock / SIZE >= 1 ? SIZE : Number(latestBlock) - Number(processedBlock)));
        let logs = await getLogs(fromBK, toBK)
        await ep.processLogs(logs, toBK)
        processedBlock = dbGlobal.getLastBlock();
        diffBlock = Number(latestBlock) - Number(processedBlock);
        let ratePerSec = (Number(toBK) - startBlock) / (((new Date().valueOf()) - startTime) / 1000);
        let timeleftPerHour = (diffBlock / ratePerSec) / 3600;
        console.log(`processed from ${fromBK} to ${toBK} - accumulative rate ${ratePerSec.toFixed(2)} blk/s - approx time left ${timeleftPerHour.toFixed(2)} h`)
    }
}