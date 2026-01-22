const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

// --- 1. EXPRESS SETUP (Wichtig für Railway Health-Check) ---
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot läuft und ist bereit!');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Web-Server aktiv auf Port ${port}`);
});

// --- 2. DEINE EINSTELLUNGEN ---
const whitelist = ['4915208227394@c.us']; 
const n8nWebhookUrl = 'https://primary-production-c4ea.up.railway.app/webhook-test/webhook-bot';

// --- 3. BOT INITIALISIEREN ---
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './sessions' 
    }),
    puppeteer: { 
        headless: true, // Wichtig für Cloud-Server
        handleSIGINT: false,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ],
        executablePath: '/usr/bin/google-chrome-stable' // Pfad durch nixpacks.toml gesetzt
    }
});

// QR-Code Ausgabe in den Railway-Logs
client.on('qr', qr => {
    console.log('--- NEUER QR CODE ---');
    qrcode.generate(qr, {small: true});
    console.log('Bitte scanne den Code in den Railway-Logs mit deinem Handy.');
});

client.on('ready', () => {
    console.log('✅ BOT IST ONLINE AUF RAILWAY!');
});

// --- 4. LOGIK ---
client.on('message_create', async (msg) => {
    // Verhindert Endlosschleifen (Bot antwortet sich selbst) und prüft Whitelist
    if (whitelist.includes(msg.from) && !msg.fromMe) {
        try {
            console.log(`Nachricht von ${msg.from}: ${msg.body}`);
            const response = await axios.post(n8nWebhookUrl, {
                sender: msg.from,
                body: msg.body,
                timestamp: new Date().toISOString()
            });

            if (response.data && response.data.reply) {
                await msg.reply(response.data.reply);
            }
        } catch (error) {
            console.log('Fehler beim Senden an n8n.');
        }
    }
});

client.initialize();