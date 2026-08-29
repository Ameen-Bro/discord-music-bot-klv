const { SlashCommandBuilder } = require('discord.js');
const { queueManager } = require('../utils/queueManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resumes paused playback.'),
    async execute(interaction) {
        const queue = queueManager.getQueue(interaction.guildId);
        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                embeds: [createErrorEmbed('No Music Playing', 'There is no music currently playing in this server!')],
                ephemeral: true
            });
        }

        const success = queue.resume();
        if (success) {
            return interaction.reply({
                embeds: [createSuccessEmbed('Resumed', 'Playback has been resumed.')]
            });
        } else {
            return interaction.reply({
                embeds: [createErrorEmbed('Playback Status', 'Playback is already playing or cannot be resumed!')],
                ephemeral: true
            });
        }
    }
};
