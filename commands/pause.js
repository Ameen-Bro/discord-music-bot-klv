const { SlashCommandBuilder } = require('discord.js');
const { queueManager } = require('../utils/queueManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pauses the currently playing track.'),
    async execute(interaction) {
        const queue = queueManager.getQueue(interaction.guildId);
        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                embeds: [createErrorEmbed('No Music Playing', 'There is no music currently playing in this server!')],
                ephemeral: true
            });
        }

        const success = queue.pause();
        if (success) {
            return interaction.reply({
                embeds: [createSuccessEmbed('Paused', 'Playback has been paused.')]
            });
        } else {
            return interaction.reply({
                embeds: [createErrorEmbed('Playback Status', 'Playback is already paused or cannot be paused!')],
                ephemeral: true
            });
        }
    }
};
