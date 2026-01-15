import express from "express";
import os from "os";
import { Worker } from "worker_threads";
import path from "path";

const app = express();
const PORT = 3000;
const CPU_COUNT = os.cpus().length;

app.get("/sum", async (req, res) => {
  const N = 1_000_000_000;
  const chunkSize = Math.floor(N / CPU_COUNT);

  let completed = 0;
  let totalSum = 0;

  for (let i = 0; i < CPU_COUNT; i++) {
    const start = i * chunkSize + 1;
    const end = i === CPU_COUNT - 1 ? N : start + chunkSize - 1;

    const worker = new Worker(
      path.resolve("./sumWorker.js"),
      { workerData: { start, end } }
    );

    worker.on("message", (partialSum) => {
      totalSum += partialSum;
      completed++;

      if (completed === CPU_COUNT) {
        res.send({
          totalSum,
          workersUsed: CPU_COUNT
        });
      }
    });

    worker.on("error", err => {
      res.status(500).send(err.message);
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
