const { EmbedBuilder } = require('discord.js');

/**
 * Creates a consistent success embed with green branding.
 * @param {string} title 
 * @param {string} description 
 * @returns {EmbedBuilder}
 */
function createSuccessEmbed(title, description) {
    return new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Creates a consistent error embed with red branding.
 * @param {string} title 
 * @param {string} description 
 * @returns {EmbedBuilder}
 */
function createErrorEmbed(title, description) {
    return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Creates a consistent info/generic embed with blue branding.
 * @param {string} title 
 * @param {string} description 
 * @param {Array<{name: string, value: string, inline?: boolean}>} fields 
 * @returns {EmbedBuilder}
 */
function createInfoEmbed(title, description, fields = []) {
    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

    if (fields && fields.length > 0) {
        embed.addFields(fields);
    }

    return embed;
}

module.exports = {
    createSuccessEmbed,
    createErrorEmbed,
    createInfoEmbed
};
