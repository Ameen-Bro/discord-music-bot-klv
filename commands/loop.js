const { SlashCommandBuilder } = require('discord.js');
const { queueManager } = require('../utils/queueManager');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Sets the looping mode for the server.')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('The loop mode')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Track (Repeat Current Song)', value: 'track' },
                    { name: 'Queue (Repeat Whole Queue)', value: 'queue' }
                )),
    async execute(interaction) {
        const queue = queueManager.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({
                embeds: [createErrorEmbed('No Active Queue', 'The bot is not currently active in a voice channel!')],
                ephemeral: true
            });
        }

        const mode = interaction.options.getString('mode');
        queue.loopMode = mode;

        return interaction.reply({
            embeds: [createSuccessEmbed('Loop Mode Updated', `Looping mode has been set to: **${mode.toUpperCase()}**`)]
        });
    }
};
