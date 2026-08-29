const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { queueManager, formatDuration } = require('../utils/queueManager');
const { createErrorEmbed, createSuccessEmbed, createInfoEmbed } = require('../utils/embeds');
const play = require('play-dl');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song from YouTube, Spotify, SoundCloud, or search query.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The URL (YouTube/Spotify/SoundCloud) or song name to search for')
                .setRequired(true)),
    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [createErrorEmbed('Voice Channel Required', 'You must be in a voice channel to use this command!')],
                ephemeral: true
            });
        }

        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(PermissionsBitField.Flags.Connect) || !permissions.has(PermissionsBitField.Flags.Speak)) {
            return interaction.reply({
                embeds: [createErrorEmbed('Permission Denied', 'I do not have permission to Connect or Speak in your voice channel!')],
                ephemeral: true
            });
        }

        // Defer response as resolving metadata and searching can take a few seconds
        await interaction.deferReply();

        const query = interaction.options.getString('query');
        const queue = queueManager.getOrCreateQueue(interaction.guildId, interaction.client, interaction.channelId);

        // Join channel if connection is missing
        if (!queue.connection) {
            try {
                queue.join(voiceChannel);
            } catch (err) {
                console.error('[PLAY] Error joining channel:', err);
                return interaction.editReply({
                    embeds: [createErrorEmbed('Connection Error', `Failed to join the voice channel: ${err.message}`)]
                });
            }
        }

        try {
            const validation = await play.validate(query);
            
            if (validation === 'yt_video') {
                const videoInfo = await play.video_info(query);
                const video = videoInfo.video_details;
                
                const track = {
                    title: video.title,
                    url: video.url,
                    duration: video.durationInSec,
                    durationText: video.durationRaw,
                    thumbnail: video.thumbnails[0]?.url || '',
                    requester: interaction.user.id
                };

                const pos = queue.addTrack(track);
                if (pos === null) {
                    return interaction.editReply({
                        embeds: [createSuccessEmbed('Play', `Starting playback for: [${track.title}](${track.url})`)]
                    });
                } else {
                    return interaction.editReply({
                        embeds: [createInfoEmbed('Queued', `Added [${track.title}](${track.url}) to the queue at position **${pos}**.`)]
                    });
                }

            } else if (validation === 'yt_playlist') {
                const playlist = await play.playlist_info(query, { incomplete: true });
                const videos = await playlist.all_videos();
                
                const newTracks = videos.map(video => ({
                    title: video.title,
                    url: video.url,
                    duration: video.durationInSec,
                    durationText: video.durationRaw,
                    thumbnail: video.thumbnails[0]?.url || '',
                    requester: interaction.user.id
                }));

                const addedCount = queue.addTracks(newTracks);
                return interaction.editReply({
                    embeds: [createSuccessEmbed('Playlist Queued', `Successfully added **${addedCount}** tracks from playlist [${playlist.title}](${playlist.url}) to the queue.`)]
                });

            } else if (validation === 'so_track') {
                const soInfo = await play.soundcloud(query);
                const track = {
                    title: soInfo.name,
                    url: soInfo.url,
                    duration: soInfo.durationInSec,
                    durationText: formatDuration(soInfo.durationInSec),
                    thumbnail: soInfo.thumbnail || '',
                    requester: interaction.user.id
                };

                const pos = queue.addTrack(track);
                if (pos === null) {
                    return interaction.editReply({
                        embeds: [createSuccessEmbed('Play', `Starting playback for: [${track.title}](${track.url})`)]
                    });
                } else {
                    return interaction.editReply({
                        embeds: [createInfoEmbed('Queued', `Added [${track.title}](${track.url}) to the queue at position **${pos}**.`)]
                    });
                }

            } else if (validation === 'sp_track') {
                const spotifyTrack = await play.spotify(query);
                const track = {
                    title: `${spotifyTrack.name} - ${spotifyTrack.artists.map(a => a.name).join(', ')}`,
                    spotifyUrl: query,
                    url: null, // Resolved right before playback (JIT)
                    duration: Math.round(spotifyTrack.duration / 1000),
                    durationText: formatDuration(Math.round(spotifyTrack.duration / 1000)),
                    thumbnail: spotifyTrack.album?.images[0]?.url || '',
                    requester: interaction.user.id
                };

                const pos = queue.addTrack(track);
                if (pos === null) {
                    return interaction.editReply({
                        embeds: [createSuccessEmbed('Play', `Resolving and starting playback for Spotify track: **${track.title}**`)]
                    });
                } else {
                    return interaction.editReply({
                        embeds: [createInfoEmbed('Queued', `Added Spotify track **${track.title}** to the queue at position **${pos}**.`)]
                    });
                }

            } else if (validation === 'sp_playlist' || validation === 'sp_album') {
                const spotifyCollection = await play.spotify(query);
                const spotifyTracks = await spotifyCollection.all_tracks();
                
                const newTracks = spotifyTracks.map(t => ({
                    title: `${t.name} - ${t.artists.map(a => a.name).join(', ')}`,
                    spotifyUrl: t.url,
                    url: null, // Resolved right before playback (JIT)
                    duration: Math.round(t.duration / 1000),
                    durationText: formatDuration(Math.round(t.duration / 1000)),
                    thumbnail: t.album?.images[0]?.url || '',
                    requester: interaction.user.id
                }));

                const addedCount = queue.addTracks(newTracks);
                return interaction.editReply({
                    embeds: [createSuccessEmbed('Spotify Queued', `Successfully added **${addedCount}** tracks from Spotify to the queue.`)]
                });

            } else {
                // Search query: search SoundCloud and YouTube
                console.log(`[PLAY] Searching for query: "${query}"`);
                
                let foundTrack = null;

                // 1. Search SoundCloud
                try {
                    const scResults = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 });
                    if (scResults && scResults.length > 0) {
                        foundTrack = {
                            title: scResults[0].name,
                            url: scResults[0].url,
                            duration: scResults[0].durationInSec,
                            durationText: formatDuration(scResults[0].durationInSec),
                            thumbnail: scResults[0].thumbnail || '',
                            requester: interaction.user.id
                        };
                    }
                } catch (scSearchErr) {
                    console.warn('[PLAY] SoundCloud search warning:', scSearchErr.message);
                }

                // 2. Search YouTube if not found on SoundCloud
                if (!foundTrack) {
                    try {
                        const ytResults = await play.search(query, { limit: 1 });
                        if (ytResults && ytResults.length > 0) {
                            foundTrack = {
                                title: ytResults[0].title,
                                url: ytResults[0].url,
                                duration: ytResults[0].durationInSec,
                                durationText: ytResults[0].durationRaw,
                                thumbnail: ytResults[0].thumbnails[0]?.url || '',
                                requester: interaction.user.id
                            };
                        }
                    } catch (ytSearchErr) {
                        console.warn('[PLAY] YouTube search warning:', ytSearchErr.message);
                    }
                }

                if (foundTrack) {
                    const pos = queue.addTrack(foundTrack);
                    if (pos === null) {
                        return interaction.editReply({
                            embeds: [createSuccessEmbed('Play', `Starting playback for: [${foundTrack.title}](${foundTrack.url})`)]
                        });
                    } else {
                        return interaction.editReply({
                            embeds: [createInfoEmbed('Queued', `Added [${foundTrack.title}](${foundTrack.url}) to the queue at position **${pos}**.`)]
                        });
                    }
                } else {
                    return interaction.editReply({
                        embeds: [createErrorEmbed('No Results', `No search results found for: \`${query}\``)]
                    });
                }
            }

        } catch (error) {
            console.error('[PLAY] Play command error:', error);
            return interaction.editReply({
                embeds: [createErrorEmbed('Playback Error', `An error occurred while trying to process the query: \`${error.message}\``)]
            });
        }
    }
};
