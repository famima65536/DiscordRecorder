import { SlashCommandBuilder } from '@discordjs/builders';
import { OpusEncoder } from '@discordjs/opus';
import { AudioReceiveStream, EndBehaviorType, getVoiceConnection, joinVoiceChannel } from '@discordjs/voice';
import { CacheType, CommandInteraction, GuildMember } from 'discord.js';
import fs, { mkdir } from 'node:fs';
export abstract class BaseCommand {
    public abstract getSlashCommandBuilder(): Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
    public abstract execute(interaction: CommandInteraction): void;
}

const baseRecordingOutdir = process.env.OUTDIR ?? 'recordings/'

export class JoinCommand extends BaseCommand {
    public getSlashCommandBuilder(): Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'> {
        return new SlashCommandBuilder()
            .setName('join')
            .setDescription('録音を開始する')
    }
    public execute(interaction: CommandInteraction<CacheType>): void {
        if (interaction.guild === null || !(interaction.member instanceof GuildMember)) {
            interaction.reply('command is only available in guild')
            return
        }

        const guild = interaction.guild
        const member = interaction.member
        if (member.voice.channel === null) {
            interaction.reply({ content: 'vcに接続していません', ephemeral: true })
            return
        }

        
        const channel = member.voice.channel

        if (!channel.joinable) {
            interaction.reply({ content: 'vcに接続できません', ephemeral: true })
            return
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false
        })

        const start = Date.now()
        const recordingOutdir = baseRecordingOutdir + String(guild.id) + "/" + new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long' }).format(start) + "/"

        const audioStreams = new Map<string, AudioReceiveStream>

        connection.receiver.speaking.on("start", async userId => {
            const audioStream = connection.receiver.subscribe(userId, {
                end: {
                    behavior: EndBehaviorType.Manual
                }
            })
            audioStreams.set(userId, audioStream)
            const memberOutdir = recordingOutdir + String(userId) + "/"
            await fs.promises.mkdir(memberOutdir, { recursive: true })
            const encoder = new OpusEncoder(48000, 2)
            const path = memberOutdir + String(Date.now() - start) + ".pcm"
            const fileStream = fs.createWriteStream(path)
            audioStream.on("data", chunk => {
                fileStream.write(encoder.decode(chunk))
            })
            audioStream.on("end", () => {
                fileStream.end()
            })
        })

        connection.receiver.speaking.on("end", async userId => {
            const audioStream = audioStreams.get(userId)
            audioStream?.destroy()
        })

        interaction.reply('vcに接続完了しました。録音を開始します。')
    }
}

export class ByeCommand extends BaseCommand {
    public getSlashCommandBuilder(): Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'> {
        return new SlashCommandBuilder()
            .setName('bye')
            .setDescription('録音を終了する')
    }
    public execute(interaction: CommandInteraction<CacheType>): void {
        if (interaction.guild === null) {
            interaction.reply('command is only available in guild')
            return
        }
        const connection = getVoiceConnection(interaction.guild.id)
        if (connection === undefined) {
            interaction.reply({content: 'vcに接続していません', ephemeral: true})
            return
        }

        connection.disconnect()
        interaction.reply('vcから切断されました。録音を終了します。')

        
    }
}