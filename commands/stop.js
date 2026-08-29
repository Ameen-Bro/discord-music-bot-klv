const { SlashCommandBuilder } = require('discord.js');
const { queueManager } = require('../utils/queueManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops playback, clears the queue, and leaves the voice channel.'),
    async execute(interaction) {
        const queue = queueManager.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({
                embeds: [createErrorEmbed('No Active Queue', 'There is no active music session or bot connection in this server.')],
                ephemeral: true
            });
        }

        queue.destroy();
        return interaction.reply({
            embeds: [createSuccessEmbed('Stopped', 'Stopped playback, cleared the queue, and disconnected from the voice channel.')]
        });
    }
};
