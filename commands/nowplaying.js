const { SlashCommandBuilder } = require('discord.js');
const { queueManager, formatDuration } = require('../utils/queueManager');
const { createErrorEmbed, createInfoEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Shows the currently playing track with a progress bar.'),
    async execute(interaction) {
        const queue = queueManager.getQueue(interaction.guildId);
        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                embeds: [createErrorEmbed('No Music Playing', 'There is no music currently playing in this server!')],
                ephemeral: true
            });
        }

        const track = queue.currentTrack;
        const player = queue.player;
        const resource = player.state.resource;

        let elapsed = 0;
        if (resource) {
            elapsed = Math.floor(resource.playbackDuration / 1000);
        }

        const total = track.duration || 0;
        const trackUrl = track.url || track.spotifyUrl;

        // Draw progress bar
        let progressBar = '';
        if (total > 0) {
            const barSize = 15;
            const progress = Math.min(elapsed / total, 1);
            const progressIndex = Math.round(progress * barSize);
            progressBar = '▬'.repeat(progressIndex) + '🔘' + '▬'.repeat(barSize - progressIndex);
            progressBar += ` \`[${formatDuration(elapsed)} / ${track.durationText}]\``;
        } else {
            // Live stream fallback
            progressBar = '🔘 ▬▬▬▬▬▬▬▬▬▬▬▬▬▬ `[Live]`';
        }

        const embed = createInfoEmbed(
            'Now Playing',
            `[${track.title}](${trackUrl})\n\n${progressBar}`
        )
        .setThumbnail(track.thumbnail)
        .addFields(
            { name: 'Requested By', value: `<@${track.requester}>`, inline: true },
            { name: 'Loop Mode', value: `🔁 \`${queue.loopMode.toUpperCase()}\``, inline: true }
        );

        return interaction.reply({ embeds: [embed] });
    }
};
