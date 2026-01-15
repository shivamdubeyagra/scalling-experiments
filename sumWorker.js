import { parentPort, workerData } from "worker_threads";

const { start, end } = workerData;

// Efficient math formula
const sum = (end * (end + 1)) / 2 - ((start - 1) * start) / 2;

parentPort.postMessage(sum);
