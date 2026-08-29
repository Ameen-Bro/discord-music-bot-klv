const { SlashCommandBuilder } = require('discord.js');
const { queueManager } = require('../utils/queueManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffles the current queue.'),
    async execute(interaction) {
        const queue = queueManager.getQueue(interaction.guildId);
        if (!queue || queue.tracks.length === 0) {
            return interaction.reply({
                embeds: [createErrorEmbed('Empty Queue', 'There are no tracks in the queue to shuffle!')],
                ephemeral: true
            });
        }

        queue.shuffle();
        return interaction.reply({
            embeds: [createSuccessEmbed('Shuffled', 'Successfully shuffled the music queue!')]
        });
    }
};
