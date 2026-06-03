import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { attachLedgerStream, LEDGER_STREAM_PATH } from '../src/api/ledger.js';

const app = express();
const port = 7071;
const server = createServer(app);

app.use(cors());

attachLedgerStream(server);

server.listen(port, () => {
    console.log(`Local dummy backend listening at http://localhost:${port}`);
    console.log(`WebSocket path: ${LEDGER_STREAM_PATH}`);
});
