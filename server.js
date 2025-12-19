const express = require('express');
const path = require('path');
const chokidar = require('chokidar');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const PORT = 3000;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server for live reload
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(__dirname));

// Redirect root to splash screen
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'splash.html'));
});

// Watch for file changes
const watcher = chokidar.watch([
    path.join(__dirname, '*.html'),
    path.join(__dirname, '*.css'),
    path.join(__dirname, '*.js')
], {
    ignored: /node_modules/,
    persistent: true
});

// Broadcast reload message to all connected clients
watcher.on('change', (filePath) => {
    console.log(`File changed: ${filePath}`);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send('reload');
        }
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log('📁 Serving files from:', __dirname);
    console.log('🔄 Live reload enabled');
});