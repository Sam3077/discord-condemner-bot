import Discord from 'discord.js';
import CondemnAction from '../models/condemnAction';
import {DefinedSettings} from '../models/settings';

export default class RoleManager {
    jail: Map<string, CondemnAction>;

    constructor() {
        this.jail = new Map();
    }

    arrest = async (user: Discord.GuildMember, guild: Discord.Guild,
            msg: Discord.Message, config: DefinedSettings,
            time?: number, doVote: boolean = false) => {
        
        const role = guild.roles.cache.find(role => role.name == config["jail-role"]);
        if (!role) {
            msg.reply(`I can't find the ${config["jail-role"]} role. Check your configuration.`);
            return;
        };
                
        if (doVote) {
            const sent = await msg.channel.send(`A vote to condemn ${user.displayName} has started. You have 1 minute to react to this message to vote.`);
            if (!(await this.vote(sent))) {
                await msg.channel.send(`Vote has failed. ${user.displayName} will not be sent to ${role.name}`);
                return;
            }
        }

        const key = guild.id + user.id;
        let action: CondemnAction = {
            user: user,
            restateRoles: user.roles.cache.array()
        };

        // if they're already in jail, maintain their roles
        if (this.jail.has(key)) {
            const prevAction = this.jail.get(key)!;
            if (prevAction.timeout) {
                clearTimeout(prevAction.timeout);
            }
            action.restateRoles = this.jail.get(key)!.restateRoles;
        }

        // keep the list of 'save-roles'
        const newRoles = user.roles.cache.filter(role => config["save-roles"].includes(role.name)).array();
        newRoles.push(role);

        try {
            await user.roles.set(newRoles);
        } catch(e) {
            console.log('bad perms', e);
            msg.reply("I don't have the right permissions to condemn this user :");
            return;
        }

        let txt = `${user.displayName} has been condemned to ${config["jail-role"]}`;
        if (time && !Number.isNaN(time)) {
            txt += ` for ${time} minute${time > 1 ? 's' : ''}`;
            action.timeout = setTimeout(async () => {
                await this.release(user, msg, config);
            }, time * 60 * 1000);
        }

        this.jail.set(key, action);
        await msg.channel.send({
            content: txt,
            files: config["arrest-photo"] ? [new Discord.MessageAttachment(config['arrest-photo'])] : undefined
        });
    }

    release = async (user: Discord.GuildMember, msg: Discord.Message, config: DefinedSettings, vote: boolean = false) => {
        const key = user.guild.id + user.id;
        if (!this.jail.has(key)) return;

        const action = this.jail.get(key)!;
        if (vote) {
            const sent = await msg.channel.send(`Shall ${action.user.displayName} be released from ${config["jail-role"]}? You have 1 minute to react to this message to vote.`);
            if (!(await this.vote(sent))) {
                msg.channel.send(`Vote has failed. ${action.user.displayName} will not be released from ${config["jail-role"]}`)
            }
        }
        if(action.timeout) {
            clearTimeout(action.timeout);
        }
        try {
            await action.user.roles.set(action.restateRoles);
        } catch(e) {
            console.log('bad perms', e);
            msg.reply("I don't have the right permissions to condemn this user :(");
            return;
        }

        this.jail.delete(key);
        await msg.channel.send({
            content: `${action.user.displayName} has been released from ${config["jail-role"]}. I hope you have learned something...`,
            files: config["free-photo"] ? [new Discord.MessageAttachment(config['free-photo'])] : undefined
        });
    }

    private vote = (msg: Discord.Message) =>  new Promise(async (resolve, reject) => {
            await msg.react("❎");
            await msg.react("✅")
            setTimeout(() => {
                const reactions = msg.reactions.cache.array();
                const yay = reactions.find(react => react.emoji.name == "✅")?.count;
                const nay = reactions.find(react => react.emoji.name == "❎")?.count;

                msg.delete().then(() => resolve(yay && nay && yay > 1 && yay > nay));
            }, 60000);
        });
}