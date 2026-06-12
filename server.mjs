import { createServer } from "node:http";
import next from "next";

const port = Number(process.env.PORT || 3100);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

createServer((request, response) => {
  handle(request, response);
}).listen(port, hostname, () => {
  console.log(`Old Glory Warehouse listening on http://${hostname}:${port}`);
});
