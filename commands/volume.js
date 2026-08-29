const { SlashCommandBuilder } = require('discord.js');
const { queueManager } = require('../utils/queueManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Adjusts playback volume.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Volume level from 0 to 100')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)),
    async execute(interaction) {
        const queue = queueManager.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({
                embeds: [createErrorEmbed('No Active Session', 'The bot is not currently active in a voice channel!')],
                ephemeral: true
            });
        }

        const vol = interaction.options.getInteger('amount');
        queue.setVolume(vol);

        return interaction.reply({
            embeds: [createSuccessEmbed('Volume Adjusted', `Volume set to **${vol}%**.`)]
        });
    }
};
