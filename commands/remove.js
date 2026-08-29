const { SlashCommandBuilder } = require('discord.js');
const { queueManager } = require('../utils/queueManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Removes a specific song from the queue.')
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('The 1-indexed position of the track in the queue')
                .setRequired(true)),
    async execute(interaction) {
        const queue = queueManager.getQueue(interaction.guildId);
        if (!queue || queue.tracks.length === 0) {
            return interaction.reply({
                embeds: [createErrorEmbed('Empty Queue', 'There are no songs in the queue to remove!')],
                ephemeral: true
            });
        }

        const position = interaction.options.getInteger('position');
        const removed = queue.remove(position);

        if (removed) {
            return interaction.reply({
                embeds: [createSuccessEmbed('Removed', `Successfully removed **${removed.title}** from the queue.`)]
            });
        } else {
            return interaction.reply({
                embeds: [createErrorEmbed('Invalid Position', `Position **${position}** is invalid! The queue range is 1 to ${queue.tracks.length}.`)],
                ephemeral: true
            });
        }
    }
};
