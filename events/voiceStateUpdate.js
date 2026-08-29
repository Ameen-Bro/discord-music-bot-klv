const { queueManager } = require('../utils/queueManager');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const guildId = newState.guild.id;
        const botId = newState.client.user.id;
        const queue = queueManager.getQueue(guildId);

        // If there is no active queue for this guild, we don't care
        if (!queue) return;

        // Scenario 1: The bot itself was disconnected/moved from its voice channel
        if (oldState.id === botId) {
            // Bot left the channel (newState.channelId is null)
            if (oldState.channelId && !newState.channelId) {
                console.log(`[VOICE] Bot was disconnected from voice channel in guild ${guildId}. Cleaning up queue.`);
                queue.destroy();
                return;
            }
            
            // Bot was moved to another channel
            if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                console.log(`[VOICE] Bot was moved to channel ${newState.channelId} in guild ${guildId}.`);
                // Update connection references if needed (handled automatically by @discordjs/voice, but log it)
            }
        }

        // Scenario 2: Other users joined/left the voice channel
        if (queue.connection) {
            const botChannelId = queue.connection.joinConfig.channelId;
            
            // Check if the update happened in the channel the bot is in
            if (oldState.channelId === botChannelId || newState.channelId === botChannelId) {
                const channel = newState.guild.channels.cache.get(botChannelId);
                
                if (channel) {
                    // Count how many human (non-bot) users are left in the channel
                    const humanMembers = channel.members.filter(m => !m.user.bot);
                    
                    if (humanMembers.size === 0) {
                        // All humans left the channel, start idle timer
                        queue.startIdleTimer('Voice channel is empty (no human listeners).');
                    } else {
                        // Humans are back in the channel, clear idle timer
                        queue.clearIdleTimer();
                    }
                }
            }
        }
    },
};
