# Discord Music Bot

A robust, modular, and serverless-incompatible Discord Music Bot built using **Node.js 18+**, **discord.js v14**, **@discordjs/voice**, and **play-dl**. 

This bot supports YouTube streaming, YouTube search queries, and Spotify tracks/albums/playlists using **Just-In-Time (JIT) resolution** to prevent API rate-limiting.

---

## Features

- **Slash Commands**: Powered completely by the Discord Application Commands API.
- **Per-Guild Queue**: Multi-server capability with independent queues, players, and volumes.
- **Inactivity Timeout**: Auto-disconnects after 5 minutes of empty queue or when all human users leave the voice channel.
- **Permission Checking**: Gracefully handles voice channel permissions (Connect/Speak) and user voice state validation.
- **Embeds**: Consistent color-themed embeds for notifications, errors, queue details, and now-playing tracks.
- **User Cooldown**: A global command cooldown (3 seconds) prevents rate-limit spam.

---

## Core Commands

- `/play <url or search query>`: Search YouTube, or play direct YouTube/Spotify track, playlist, or album. Auto-joins your channel.
- `/pause`: Pauses current track.
- `/resume`: Resumes paused track.
- `/skip`: Skips to next track in queue.
- `/stop`: Stops playback, clears queue, and leaves voice channel.
- `/queue`: Shows the currently playing track and the next 10 queued tracks.
- `/nowplaying`: Shows the current track progress bar (`▬🔘▬▬▬▬ [01:30 / 04:00]`).
- `/volume <0-100>`: Adjusts audio output volume.
- `/shuffle`: Shuffles remaining queued songs randomly.
- `/remove <position>`: Removes a track at a specific 1-indexed queue position.
- `/loop <off | track | queue>`: Configures repetition mode.
- `/leave`: Disconnects from the voice channel and deletes queue state.

---

## Setup & Invitation Instructions

### 1. Create a Discord Developer Application
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application**, give it a name, and save.
3. Go to the **Bot** tab on the left sidebar and click **Add Bot**.
4. Under the **Privileged Gateway Intents** section, enable **Guild Voice States** (Required for detecting connection state & user leaves).
5. Under the token header, click **Reset Token** and copy the token. You will need this for the `.env` configuration file as `DISCORD_TOKEN`.
6. Go to the **General Information** tab and copy the **Application ID** (or Client ID). You will need this as `CLIENT_ID`.

### 2. Generate Invite Link
1. Navigate to the **OAuth2** -> **URL Generator** tab in the Developer Portal.
2. Select the following **Scopes**:
   - `bot`
   - `applications.commands`
3. Under **Bot Permissions**, select:
   - **General Permissions**: `Read Messages/View Channels`
   - **Text Permissions**: `Send Messages`, `Embed Links`
   - **Voice Permissions**: `Connect`, `Speak`
4. Copy the generated URL at the bottom of the page and paste it into a browser tab to invite the bot to your Discord Server.

---

## Installation & Launch

### Prerequisites
- Node.js 18.0.0 or higher.
- Static FFmpeg (installed automatically via `ffmpeg-static` dependency).

### Steps
1. Clone or download this project folder.
2. Open a terminal in the project directory.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Duplicate `.env.example` and rename it to `.env`:
   ```bash
   cp .env.example .env
   ```
5. Populate the variables in your `.env` file:
   - `DISCORD_TOKEN`: Your Discord Bot Token.
   - `CLIENT_ID`: Your Discord Bot Application ID.
   - `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`: *(Optional)* Your Spotify API credentials (from [Spotify Dashboard](https://developer.spotify.com/dashboard)) required to fetch metadata of Spotify URLs.
   - `DEFAULT_VOLUME`: Default volume from 0 to 100 (e.g., `50`).
   - `IDLE_TIMEOUT`: Auto-disconnect timeout in milliseconds (e.g., `300000` for 5 minutes).

6. Start the bot:
   ```bash
   npm start
   ```

---

## Deployment Notes

### ⚠️ Serverless Disclaimer
This application **cannot be deployed to Serverless platforms** (e.g., AWS Lambda, Google Cloud Functions, Vercel). Voice connections in Discord require persistent WebSockets and continuous UDP streaming connections which are not supported by the short-lived, stateless architecture of serverless functions.

### Running Persistently (24/7)

#### Option 1: PM2 (Recommended)
PM2 is a production process manager for Node.js.
1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```
2. Start the bot:
   ```bash
   pm2 start index.js --name "discord-music-bot"
   ```
3. Keep it running on system reboots:
   ```bash
   pm2 startup
   pm2 save
   ```

#### Option 2: Systemd Service (Linux)
You can set up a simple systemd service to run the bot on Linux.
1. Create a service file: `/etc/systemd/system/discord-music.service`
2. Add the following configuration:
   ```ini
   [Unit]
   Description=Discord Music Bot
   After=network.target

   [Service]
   Type=simple
   User=your-linux-username
   WorkingDirectory=/path/to/your/discord-music-bot
   ExecStart=/usr/bin/node index.js
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```
3. Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable discord-music.service
   sudo systemctl start discord-music.service
   ```
