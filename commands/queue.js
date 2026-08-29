const { SlashCommandBuilder } = require('discord.js');
const { queueManager } = require('../utils/queueManager');
const { createErrorEmbed, createInfoEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Displays the current music queue.'),
    async execute(interaction) {
        const queue = queueManager.getQueue(interaction.guildId);
        if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
            return interaction.reply({
                embeds: [createErrorEmbed('Empty Queue', 'The queue is empty and there is nothing playing.')],
                ephemeral: true
            });
        }

        let description = '';
        if (queue.currentTrack) {
            const trackUrl = queue.currentTrack.url || queue.currentTrack.spotifyUrl;
            description += `**Now Playing:**\n[${queue.currentTrack.title}](${trackUrl}) | \`${queue.currentTrack.durationText}\` (Requested by: <@${queue.currentTrack.requester}>)\n\n`;
        }

        if (queue.tracks.length > 0) {
            description += `**Up Next:**\n`;
            const maxDisplay = 10;
            const displayTracks = queue.tracks.slice(0, maxDisplay);
            
            displayTracks.forEach((track, index) => {
                const trackUrl = track.url || track.spotifyUrl;
                description += `\`${index + 1}.\` [${track.title}](${trackUrl}) | \`${track.durationText}\` (Requested by: <@${track.requester}>)\n`;
            });

            if (queue.tracks.length > maxDisplay) {
                description += `\n*And **${queue.tracks.length - maxDisplay}** more track(s) in queue.*`;
            }
        } else {
            description += `*No other tracks in queue.*`;
        }

        const statusFields = [
            { name: 'Volume', value: `🔊 \`${queue.volume}%\``, inline: true },
            { name: 'Loop Mode', value: `🔁 \`${queue.loopMode.toUpperCase()}\``, inline: true },
            { name: 'Total Songs', value: `🎶 \`${queue.tracks.length + (queue.currentTrack ? 1 : 0)}\``, inline: true }
        ];

        return interaction.reply({
            embeds: [createInfoEmbed('Music Queue', description, statusFields)]
        });
    }
};
