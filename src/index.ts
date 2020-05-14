import Discord from 'discord.js';
import config from './config.json';
import privateConfig from './private-config.json';
import RoleManager from './managers/RoleManager';
import GuildManager from './managers/GuildManager';
import { isDefinedSettings } from './models/settings';

// const img = require('../static/horny-jail.jpg');

const client = new Discord.Client();
const manager = new RoleManager();
const guildManager = new GuildManager();

client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
});

client.on('guildCreate', guild => {
    console.log(`Joined guild ${guild.name}`);
    guildManager.connect(guild);
});

client.on('guildDelete', guild => {
    console.log(`Left guild ${guild.name}`);
    guildManager.disconnect(guild);
});

client.on('message', async (msg) => {
    if (!msg.guild) return;
    if (!msg.content.startsWith(config.prefix)) return;

    const command = msg.content.substring(config.prefix.length).trim();

    if (command.startsWith(config["help-command"])) {
        msg.reply(`Available commands are:
${config.prefix} ${config["help-command"]}: Displays available commands

${config.prefix} ${config['arrest-command']} @user [optional time in minutes]: Places a user in the "jail" role. If a time is provided, they will automatically be released after the given time expires

${config.prefix} ${config["free-command"]} @user: Releases a user from the "jail" role.

-- ADMIN ONLY COMMANDS --
${config.prefix} ${config["init-command"]}: Initializes the bot in your server or updates your settings.

${config.prefix} ${config['admin-arrest']} @user [optional time in minutes]: Same as ${config['arrest-command']}, but places the user in the role immediately and _bypasses the voting stage_.

${config.prefix} ${config['admin-free']} @user: Same as ${config['free-command']}, but releases the user immediately and _bypasses the voting stage_`);
        return;
    }

    if (command.startsWith(config["init-command"])) {
        if (!(msg.channel.type === 'text')) {
            await msg.reply("Please initialize this bot in a text channel");
            return;
        }
        if (!msg.member?.hasPermission("ADMINISTRATOR")) {
            await msg.reply(`Sorry, only admins can run the ${config['init-command']} command`)
            return;
        }
        msg.author.id
        await guildManager.initialize(msg.guild, msg.channel, msg.author.id);
        return;
    }

    const guildConfig = await guildManager.getConfig(msg.guild);
    if (!isDefinedSettings(guildConfig)) {
        await msg.reply(`Please initialize the bot first by typing: ${config.prefix} ${config["init-command"]}`);
        return;
    }

    const users = msg.mentions.members?.array();
    if (command.startsWith(config["arrest-command"])) {
        if (!users || users.length === 0) {
            msg.reply("Please @ mention at least one user.");
            return;
        }

        const args = msg.content.split(' ').filter(cont => cont);
        const time = args[args.length - 1];

        const promises = users.map(user => {
            return manager.arrest(user, msg.guild!, msg, guildConfig, parseFloat(time), true);
        });
        await Promise.all(promises);
        return;
    }

    if (command.startsWith(config['admin-arrest'])) {
        if (!msg.member?.hasPermission("ADMINISTRATOR")) {
            await msg.reply(`Sorry, only admins can run the ${config['admin-arrest']} command.`);
            return;
        }

        if (!users || users.length === 0) {
            msg.reply("Please @ mention at least one user.");
            return;
        }

        const args = msg.content.split(' ').filter(cont => cont);
        const time = args[args.length - 1];

        const promises = users.map(user => {
            return manager.arrest(user, msg.guild!, msg, guildConfig, parseFloat(time), false);
        });
        await Promise.all(promises);
        return;
    }

    if (command.startsWith(config["free-command"])) {
        if (!users || users.length === 0) {
            msg.reply("Please @ mention at least one user.");
            return;
        }

        const promises = users.map(user => {
            return manager.release(user, msg, guildConfig, true);
        });
        await Promise.all(promises);
        return;
    }
    
    if (command.startsWith(config['admin-free'])) {
        if (!msg.member?.hasPermission("ADMINISTRATOR")) {
            await msg.reply(`Sorry, only admins can run the ${config['admin-free']} command.`);
            return;
        }

        if (!users || users.length === 0) {
            msg.reply("Please @ mention at least one user.");
            return;
        }

        const promises = users.map(user => {
            return manager.release(user, msg, guildConfig, false);
        });
        await Promise.all(promises);
        return;
    }

    await msg.reply(`Unknown command: ${command}. Type \`${config.prefix} ${config["help-command"]}\` for a list of available commands`);
});

client.login(privateConfig["token"]);