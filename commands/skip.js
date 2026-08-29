const { SlashCommandBuilder } = require('discord.js');
const { queueManager } = require('../utils/queueManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the current song.'),
    async execute(interaction) {
        const queue = queueManager.getQueue(interaction.guildId);
        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                embeds: [createErrorEmbed('No Music Playing', 'There is no music currently playing in this server!')],
                ephemeral: true
            });
        }

        const skippedTitle = queue.currentTrack.title;
        const success = queue.skip();
        
        if (success) {
            return interaction.reply({
                embeds: [createSuccessEmbed('Skipped', `Skipped track: **${skippedTitle}**`)]
            });
        } else {
            return interaction.reply({
                embeds: [createErrorEmbed('Skip Error', 'Could not skip the current track.')],
                ephemeral: true
            });
        }
    }
};
