const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const play = require('play-dl');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`[READY] Logged in as ${client.user.tag} (ID: ${client.user.id})`);
        
        // Set up play-dl Spotify credentials if configured
        if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
            try {
                await play.setToken({
                    spotify: {
                        client_id: process.env.SPOTIFY_CLIENT_ID,
                        client_secret: process.env.SPOTIFY_CLIENT_SECRET
                    }
                });
                console.log('[READY] Spotify credentials successfully registered in play-dl.');
            } catch (error) {
                console.error('[READY] Failed to register Spotify credentials in play-dl:', error);
            }
        } else {
            console.log('[READY] Spotify credentials not found. Spotify integration will run in unauthenticated public mode.');
        }

        // Set up SoundCloud Client ID for resilient audio streaming
        try {
            const scClientId = await play.getFreeClientID();
            await play.setToken({
                soundcloud: { client_id: scClientId }
            });
            console.log('[READY] SoundCloud streaming client successfully initialized.');
        } catch (scError) {
            console.warn('[READY] SoundCloud client setup notice:', scError.message);
        }

        // Load commands
        const commands = [];
        const commandsPath = path.join(__dirname, '../commands');
        
        if (fs.existsSync(commandsPath)) {
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    commands.push(command.data.toJSON());
                } else {
                    console.warn(`[READY] [WARNING] Command at ${filePath} is missing "data" or "execute" properties.`);
                }
            }
        }

        // Register application commands globally
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        try {
            console.log(`[READY] Registering ${commands.length} slash commands globally...`);
            
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands }
            );

            console.log('[READY] Successfully registered application (/) commands globally.');
        } catch (error) {
            console.error('[READY] Error registering global application (/) commands:', error);
        }
    },
};
