import express from "express";
import cluster from "cluster";
import os from "os";

const totalCPUs = os.cpus().length;
const port = 3000;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} running with ${totalCPUs} CPUs`);

  const workers = [];
  let results = [];
  let pendingWorkers = 0;
  let clientRes = null;

  // Fork workers
  for (let i = 0; i < totalCPUs; i++) {
    const worker = cluster.fork();
    workers.push(worker);

    worker.on("message", (msg) => {
      if (msg.type === "RESULT") {
        results.push(msg.partialSum);
        pendingWorkers--;

        if (pendingWorkers === 0) {
          const finalSum = results.reduce((a, b) => a + b, 0);
          clientRes.send(`Final count is ${finalSum}`);
          results = [];
        }
      }
    });
  }

  const app = express();

  app.get("/api/:n", (req, res) => {
    let n = parseInt(req.params.n);
    if (n > 5_000_000_000) n = 5_000_000_000;

    clientRes = res;
    results = [];
    pendingWorkers = totalCPUs;

    const chunkSize = Math.floor(n / totalCPUs);

    workers.forEach((worker, index) => {
      const start = index * chunkSize;
      const end =
        index === totalCPUs - 1 ? n : start + chunkSize - 1;

      worker.send({
        type: "COMPUTE",
        start,
        end,
      });
    });
  });

  app.listen(port, () =>
    console.log(`Primary listening on port ${port}`)
  );

} else {
  console.log(`Worker ${process.pid} started`);

  process.on("message", (msg) => {
    if (msg.type === "COMPUTE") {
      let sum = 0;
      for (let i = msg.start; i <= msg.end; i++) {
        sum += i;
      }

      process.send({
        type: "RESULT",
        partialSum: sum,
      });
    }
  });
}
