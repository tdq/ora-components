import type { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

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

interface LedgerUpdate {
    index: number;
    entry: LedgerEntry;
}

const ACCOUNTS = ['Cash & Bank', 'Revenue / SaaS Subscriptions', 'Accounts Receivable', 'Expenses / Payroll', 'Expenses / Office Rent', 'Revenue / Professional Services', 'Expenses / SaaS Tools', 'Accounts Payable', 'Revenue / Add-ons', 'Expenses / Marketing'];

const INITIAL_ROWS = 10000;
const UPDATES_PER_TICK = 100;
const TICK_MS = 16;

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

export function handleLedgerConnection(ws: WebSocket): void {
    const data = generateInitialData(INITIAL_ROWS);

    ws.send(JSON.stringify({ type: 'initial', data }));

    const interval = setInterval(() => {
        if (ws.readyState !== ws.OPEN) {
            clearInterval(interval);
            return;
        }
        const updates: LedgerUpdate[] = [];
        for (let i = 0; i < UPDATES_PER_TICK; i++) {
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
    }, TICK_MS);

    ws.on('close', () => {
        clearInterval(interval);
    });
}

export const LEDGER_STREAM_PATH = '/api/ledger-stream';

export function attachLedgerStream(server: Server, path: string = LEDGER_STREAM_PATH): WebSocketServer {
    const wss = new WebSocketServer({ server, path });
    wss.on('connection', handleLedgerConnection);
    return wss;
}
