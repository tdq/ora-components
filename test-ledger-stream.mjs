import WebSocket from 'ws';

const ws = new WebSocket('wss://www.ora-components.com/api/ledger-stream');

ws.on('open', () => {
    console.log('Connected to WebSocket');
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        console.log('Received message type:', message.type);
        if (message.type === 'initial') {
            console.log('Initial data length:', message.data.length);
            // After receiving initial data, we can close the connection
            // or wait for an update. Let's wait for one update to be sure.
        } else if (message.type === 'update') {
            console.log('Received update with', message.data.length, 'entries');
            ws.close();
        }
    } catch (e) {
        console.error('Error parsing message:', e);
        ws.close();
    }
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});

ws.on('close', () => {
    console.log('WebSocket closed');
});

// Timeout after 30 seconds if no message received
setTimeout(() => {
    console.log('Timed out waiting for message');
    ws.close();
    process.exit(1);
}, 30000);
