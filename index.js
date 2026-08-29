require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Check for required configuration
if (!process.env.DISCORD_TOKEN) {
    console.error('[FATAL] DISCORD_TOKEN is not defined in the environment variables!');
    process.exit(1);
}

// Initialize the Discord client with required intents
// We only need Guilds and GuildVoiceStates as we are strictly using Slash Commands
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Create command registry on the client object
client.commands = new Collection();

// Dynamically bind event handlers
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        console.log(`[BOOT] Loading event: ${event.name}`);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

// Maintain high uptime by capturing unhandled rejections and uncaught exceptions gracefully
process.on('unhandledRejection', error => {
    console.error(`[UNHANDLED REJECTION] at ${new Date().toISOString()}:`, error);
});

process.on('uncaughtException', error => {
    console.error(`[UNCAUGHT EXCEPTION] at ${new Date().toISOString()}:`, error);
});

// Connect to the Discord Gateway
client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('[BOOT] Bot connection initiated...'))
    .catch(error => {
        console.error('[BOOT] Failed to login to Discord:', error);
        process.exit(1);
    });
