const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    entersState, 
    VoiceConnectionStatus, 
    AudioPlayerStatus 
} = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const play = require('play-dl');

/**
 * Formats duration in seconds to a HH:MM:SS or MM:SS string.
 * @param {number} seconds 
 * @returns {string}
 */
function formatDuration(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

class GuildQueue {
    constructor(guildId, client, textChannelId) {
        this.guildId = guildId;
        this.client = client;
        this.textChannelId = textChannelId;
        
        this.tracks = [];
        this.currentTrack = null;
        this.volume = parseInt(process.env.DEFAULT_VOLUME) || 50;
        this.loopMode = 'off'; // 'off' | 'track' | 'queue'
        
        this.connection = null;
        this.player = createAudioPlayer();
        this.idleTimeout = null;
        this.idleTimeoutDuration = parseInt(process.env.IDLE_TIMEOUT) || 300000; // default 5 minutes
        
        // Listen to player events
        this.player.on('stateChange', (oldState, newState) => {
            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                this.handleSongEnd();
            }
        });
        
        this.player.on('error', error => {
            console.error(`[GuildQueue ${this.guildId}] Player error at ${new Date().toISOString()}:`, error);
            this.sendTextChannelMessage({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Playback Error')
                        .setDescription(`An error occurred during playback: ${error.message}. Skipping to the next track...`)
                ]
            });
            this.handleSongEnd();
        });
    }

    /**
     * Sends a message to the registered text channel.
     * @param {object} payload 
     */
    sendTextChannelMessage(payload) {
        const channel = this.client.channels.cache.get(this.textChannelId);
        if (channel) {
            channel.send(payload).catch(err => console.error(`Failed to send message to channel ${this.textChannelId}:`, err));
        }
    }

    /**
     * Connects to a voice channel and subscribes the player.
     * @param {VoiceChannel|StageChannel} voiceChannel 
     */
    join(voiceChannel) {
        this.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: this.guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });

        this.connection.on('stateChange', async (oldState, newState) => {
            if (newState.status === VoiceConnectionStatus.Disconnected) {
                try {
                    // Try to reconnect within 5 seconds
                    await entersState(this.connection, VoiceConnectionStatus.Connecting, 5000);
                } catch (error) {
                    console.log(`[GuildQueue ${this.guildId}] Disconnected from voice channel.`);
                    this.destroy();
                }
            }
        });

        this.connection.subscribe(this.player);
    }

    /**
     * Fully destroys the queue and disconnects the connection.
     */
    destroy() {
        this.clearIdleTimer();
        this.tracks = [];
        this.currentTrack = null;
        
        if (this.connection) {
            if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
                this.connection.destroy();
            }
            this.connection = null;
        }
        
        this.player.stop();
        
        // Remove self from the manager
        queueManager.deleteQueue(this.guildId);
    }

    /**
     * Starts the idle disconnect timeout.
     * @param {string} reason 
     */
    startIdleTimer(reason = '') {
        this.clearIdleTimer();
        console.log(`[GuildQueue ${this.guildId}] Starting idle timer. Reason: ${reason}`);
        this.idleTimeout = setTimeout(() => {
            console.log(`[GuildQueue ${this.guildId}] Idle timeout reached. Disconnecting...`);
            this.sendTextChannelMessage({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FFCC00')
                        .setTitle('Disconnected')
                        .setDescription('Disconnected from the voice channel due to inactivity.')
                ]
            });
            this.destroy();
        }, this.idleTimeoutDuration);
    }

    /**
     * Clears the idle timeout.
     */
    clearIdleTimer() {
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
            this.idleTimeout = null;
        }
    }

    /**
     * Handles track completion and determines loop/queue behavior.
     */
    async handleSongEnd() {
        if (this.loopMode === 'track' && this.currentTrack) {
            // Keep currentTrack as is
        } else if (this.loopMode === 'queue' && this.currentTrack) {
            this.tracks.push(this.currentTrack);
            this.currentTrack = this.tracks.shift() || null;
        } else {
            this.currentTrack = this.tracks.shift() || null;
        }

        if (this.currentTrack) {
            await this.playTrack();
        } else {
            this.sendTextChannelMessage({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#0099FF')
                        .setTitle('Queue Finished')
                        .setDescription('The queue is empty! The bot will automatically disconnect in 5 minutes if no new songs are added.')
                ]
            });
            this.startIdleTimer('Queue finished.');
        }
    }

    /**
     * Starts streaming and playing the current track with multi-engine resilience.
     */
    async playTrack() {
        if (!this.currentTrack) return;
        
        try {
            this.clearIdleTimer();
            let stream = null;
            let streamUrl = this.currentTrack.url;

            // 1. If we have a direct streamable URL, try streaming it directly
            if (streamUrl) {
                try {
                    stream = await play.stream(streamUrl, { discordPlayerCompatibility: true });
                } catch (directErr) {
                    console.warn(`[GuildQueue ${this.guildId}] Direct stream failed for ${streamUrl} (${directErr.message}). Attempting search fallback...`);
                }
            }

            // 2. Fallback / JIT Resolution: Search SoundCloud / YouTube by song title
            if (!stream) {
                const searchTitle = this.currentTrack.title;
                console.log(`[GuildQueue ${this.guildId}] Searching stream for: ${searchTitle}`);

                // Try SoundCloud first (most resilient against cipher/bot challenges)
                try {
                    const scResults = await play.search(searchTitle, { source: { soundcloud: 'tracks' }, limit: 1 });
                    if (scResults && scResults.length > 0) {
                        stream = await play.stream(scResults[0].url);
                        if (!this.currentTrack.duration || this.currentTrack.duration === 0) {
                            this.currentTrack.duration = scResults[0].durationInSec;
                            this.currentTrack.durationText = formatDuration(scResults[0].durationInSec);
                        }
                        if (!this.currentTrack.thumbnail) {
                            this.currentTrack.thumbnail = scResults[0].thumbnail;
                        }
                    }
                } catch (scErr) {
                    console.warn(`[GuildQueue ${this.guildId}] SoundCloud fallback error:`, scErr.message);
                }

                // If SoundCloud didn't return a stream, try YouTube search
                if (!stream) {
                    try {
                        const ytResults = await play.search(searchTitle, { limit: 1 });
                        if (ytResults && ytResults.length > 0) {
                            stream = await play.stream(ytResults[0].url, { discordPlayerCompatibility: true });
                        }
                    } catch (ytErr) {
                        console.warn(`[GuildQueue ${this.guildId}] YouTube fallback error:`, ytErr.message);
                    }
                }
            }

            if (!stream) {
                throw new Error('No compatible audio stream could be extracted.');
            }

            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
                inlineVolume: true
            });
            
            resource.volume.setVolume(this.volume / 100);
            this.player.play(resource);
            
            if (this.connection) {
                this.connection.subscribe(this.player);
            }

            const nowPlayingEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Now Playing')
                .setDescription(`[${this.currentTrack.title}](${this.currentTrack.url || this.currentTrack.spotifyUrl || 'https://discord.com'})`)
                .setThumbnail(this.currentTrack.thumbnail || null)
                .addFields(
                    { name: 'Duration', value: this.currentTrack.durationText || 'Unknown', inline: true },
                    { name: 'Requested By', value: `<@${this.currentTrack.requester}>`, inline: true }
                );

            this.sendTextChannelMessage({ embeds: [nowPlayingEmbed] });

        } catch (error) {
            console.error(`[GuildQueue ${this.guildId}] Playback initiation error for ${this.currentTrack.title}:`, error);
            this.sendTextChannelMessage({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Playback Error')
                        .setDescription(`Failed to play track [${this.currentTrack.title}](${this.currentTrack.url || this.currentTrack.spotifyUrl || ''}): ${error.message}. Skipping to the next track...`)
                ]
            });
            this.handleSongEnd();
        }
    }

    /**
     * Adds a track to the queue. Plays immediately if no song is playing.
     * @param {object} track 
     * @returns {number|null} position in queue, or null if started playing immediately.
     */
    addTrack(track) {
        this.tracks.push(track);
        if (!this.currentTrack) {
            this.currentTrack = this.tracks.shift();
            this.playTrack();
            return null;
        }
        return this.tracks.length;
    }

    /**
     * Adds multiple tracks to the queue. Plays immediately if no song is playing.
     * @param {Array<object>} newTracks 
     * @returns {number} number of tracks added.
     */
    addTracks(newTracks) {
        this.tracks.push(...newTracks);
        if (!this.currentTrack) {
            this.currentTrack = this.tracks.shift();
            this.playTrack();
        }
        return newTracks.length;
    }

    /**
     * Pauses current playback.
     * @returns {boolean} true if paused successfully.
     */
    pause() {
        if (this.player.state.status === AudioPlayerStatus.Playing) {
            this.player.pause();
            return true;
        }
        return false;
    }

    /**
     * Resumes playback.
     * @returns {boolean} true if resumed successfully.
     */
    resume() {
        if (this.player.state.status === AudioPlayerStatus.Paused) {
            this.player.unpause();
            return true;
        }
        return false;
    }

    /**
     * Skips current track.
     * @returns {boolean} true if skipped.
     */
    skip() {
        if (this.currentTrack) {
            this.player.stop(); // triggers state transition to Idle, calling handleSongEnd()
            return true;
        }
        return false;
    }

    /**
     * Adjusts playback volume.
     * @param {number} vol volume from 0 to 100
     */
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(100, vol));
        if (this.player.state.resource) {
            this.player.state.resource.volume.setVolume(this.volume / 100);
        }
    }

    /**
     * Shuffles the current queue.
     */
    shuffle() {
        for (let i = this.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        }
    }

    /**
     * Removes a track at a specific 1-indexed queue position.
     * @param {number} position 
     * @returns {object|null} the removed track or null if invalid position.
     */
    remove(position) {
        if (position < 1 || position > this.tracks.length) return null;
        return this.tracks.splice(position - 1, 1)[0];
    }
}

class QueueManager {
    constructor() {
        this.queues = new Map();
    }

    /**
     * Retrieves or initializes a GuildQueue.
     * @param {string} guildId 
     * @param {Client} client 
     * @param {string} textChannelId 
     * @returns {GuildQueue}
     */
    getOrCreateQueue(guildId, client, textChannelId) {
        if (!this.queues.has(guildId)) {
            const queue = new GuildQueue(guildId, client, textChannelId);
            this.queues.set(guildId, queue);
        } else {
            const queue = this.queues.get(guildId);
            queue.textChannelId = textChannelId;
        }
        return this.queues.get(guildId);
    }

    /**
     * Returns a GuildQueue.
     * @param {string} guildId 
     * @returns {GuildQueue|undefined}
     */
    getQueue(guildId) {
        return this.queues.get(guildId);
    }

    /**
     * Removes a GuildQueue from mapping.
     * @param {string} guildId 
     */
    deleteQueue(guildId) {
        this.queues.delete(guildId);
    }
}

const queueManager = new QueueManager();

module.exports = {
    queueManager,
    formatDuration
};
