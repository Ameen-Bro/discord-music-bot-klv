const { SlashCommandBuilder } = require('discord.js');
const { queueManager } = require('../utils/queueManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Disconnects the bot from the voice channel.'),
    async execute(interaction) {
        const queue = queueManager.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({
                embeds: [createErrorEmbed('No Active Connection', 'The bot is not connected to a voice channel in this server.')],
                ephemeral: true
            });
        }

        queue.destroy();
        return interaction.reply({
            embeds: [createSuccessEmbed('Disconnected', 'Disconnected from the voice channel and cleared all queue data.')]
        });
    }
};
