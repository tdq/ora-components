import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const port = 7071;
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/api/ledger-stream' });

app.use(cors());

interface Money {
    amount: number;
    currencyId: string;
}

interface LedgerEntry {
    date: string;
    account: string;
    description: string;
    reference: string;
    debit: Money;
    credit: Money;
    balance: Money;
}

const ACCOUNTS = ['Cash & Bank', 'Revenue / SaaS Subscriptions', 'Accounts Receivable', 'Expenses / Payroll', 'Expenses / Office Rent', 'Revenue / Professional Services', 'Expenses / SaaS Tools', 'Accounts Payable', 'Revenue / Add-ons', 'Expenses / Marketing'];

function generateInitialData(count: number): LedgerEntry[] {
    const data: LedgerEntry[] = [];
    let runningBalance = 81400.00;

    for (let i = 0; i < count; i++) {
        const amount = Math.floor(Math.random() * 500000) / 100;
        const isDebit = Math.random() > 0.5;
        data.push({
            date: `2026-04-${String((i % 30) + 1).padStart(2, '0')}`,
            account: ACCOUNTS[i % ACCOUNTS.length],
            description: `Auto-generated entry ${i + 1}`,
            reference: `AUTO-${i + 1}`,
            debit: { amount: isDebit ? amount : 0, currencyId: 'EUR' },
            credit: { amount: isDebit ? 0 : amount, currencyId: 'EUR' },
            balance: { amount: runningBalance += (isDebit ? -amount : amount), currencyId: 'EUR' }
        });
    }
    return data;
}

wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    const data = generateInitialData(10000);

    // Initial burst
    ws.send(JSON.stringify({ type: 'initial', data }));

    const interval = setInterval(() => {
        if (ws.readyState !== ws.OPEN) {
            clearInterval(interval);
            return;
        }
        const updates: { index: number, entry: LedgerEntry }[] = [];
        for (let i = 0; i < 100; i++) {
            const index = Math.floor(Math.random() * data.length);
            const amount = Math.floor(Math.random() * 500000) / 100;
            const isDebit = Math.random() > 0.5;
            data[index] = {
                ...data[index],
                debit: { amount: isDebit ? amount : 0, currencyId: 'EUR' },
                credit: { amount: isDebit ? 0 : amount, currencyId: 'EUR' }
            };
            updates.push({ index, entry: data[index] });
        }
        ws.send(JSON.stringify({ type: 'update', data: updates }));
    }, 16);

    ws.on('close', () => {
        console.log('Client disconnected from WebSocket');
        clearInterval(interval);
    });
});

server.listen(port, () => {
    console.log(`Local dummy backend listening at http://localhost:${port}`);
    console.log(`WebSocket path: /api/ledger-stream`);
});
