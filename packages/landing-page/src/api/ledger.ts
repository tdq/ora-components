import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

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

export async function ledgerStream(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
    const encoder = new TextEncoder();
    const data = generateInitialData(10000);

    const stream = new ReadableStream({
        start(controller) {
            // Initial burst
            controller.enqueue(encoder.encode(`event: initial\ndata: ${JSON.stringify(data)}\n\n`));

            const interval = setInterval(() => {
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
                controller.enqueue(encoder.encode(`event: update\ndata: ${JSON.stringify(updates)}\n\n`));
            }, 16);

            (req as any).signal?.addEventListener('abort', () => {
                clearInterval(interval);
                controller.close();
            });
        }
    });

    return {
        body: stream as any,
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    };
}

app.http('ledger-stream', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'ledger-stream',
    handler: ledgerStream
});
