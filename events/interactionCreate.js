const { Collection } = require('discord.js');
const { createErrorEmbed } = require('../utils/embeds');

// A map to store command cooldowns (User ID -> Cooldown End Timestamp)
const cooldowns = new Collection();
const COOLDOWN_TIME = 3000; // 3 seconds cooldown

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`[INTERACTION] Command ${interaction.commandName} was not found.`);
            return;
        }

        // Apply global user cooldown
        const userId = interaction.user.id;
        const now = Date.now();

        if (cooldowns.has(userId)) {
            const expirationTime = cooldowns.get(userId) + COOLDOWN_TIME;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                const cooldownEmbed = createErrorEmbed(
                    'Cooldown',
                    `Please wait ${timeLeft.toFixed(1)} more second(s) before using this command again.`
                );
                return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
            }
        }

        // Set cooldown timestamp
        cooldowns.set(userId, now);
        setTimeout(() => cooldowns.delete(userId), COOLDOWN_TIME);

        try {
            console.log(`[COMMAND] Executing /${interaction.commandName} in Guild ${interaction.guildId} by ${interaction.user.tag}`);
            await command.execute(interaction);
        } catch (error) {
            console.error(`[ERROR] Command /${interaction.commandName} in Guild ${interaction.guildId}:`, error);

            const errorEmbed = createErrorEmbed(
                'Command Error',
                `An error occurred while executing this command: \`${error.message}\``
            );

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(console.error);
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(console.error);
            }
        }
    },
};
