import Discord from 'discord.js';
import CondemnAction, {SerailizeableCondemnAction, toSerailizeableCondemnAction, isCondemnAction, isSerializeableCondemnAction} from '../models/condemnAction';
import {DefinedSettings} from '../models/settings';
import storage from 'node-persist';

const VOTE_LENGTH = 60000;
export default class RoleManager {
    private jail: Map<string, CondemnAction>;
    private actionStorage: storage.LocalStorage;
    private STORAGE_PATH = "./data/condemn-actions"
    private ready: Promise<void>;

    constructor(client: Discord.Client) {
        this.jail = new Map();
        this.actionStorage = storage.create({
            dir: this.STORAGE_PATH
        });

        let onReady: () => void;
        this.ready = new Promise((resolve) => {onReady = resolve});
        this.actionStorage.init().then(() => {
            this.rebuildState(client).then(() => {
                onReady();
            });
        });
    }

    dumpStateToStorage = async () => {
        console.log('dumping');
        await this.ready;

        const promises: Promise<storage.WriteFileResult>[] = [];
        this.jail.forEach((action, key) => {
            promises.push(this.actionStorage.setItem(key, toSerailizeableCondemnAction(action)));
        });
        return Promise.all(promises);
    }

    private rebuildState = async (client: Discord.Client) => {
        const data = await this.actionStorage.data();
        const promises = data.map(async d => {
            const action = d.value;
            if (!isSerializeableCondemnAction(action)) return;

            const guild = client.guilds.resolve(action.guildID)
            if (!guild) {
                console.log("guild not found");
                return;
            }
            const member = guild.members.resolve(action.userID);
            if (!member) {
                console.log("member not found");
                return;
            }
            const channel = guild.channels.resolve(action.channelID);
            if (!channel) {
                console.log("channel not found");
                return;
            }
            if (channel.type !== 'text') {
                console.log("not a text channel :(");
                return;
            }
            const message = await (channel as Discord.TextChannel).messages.fetch(action.msgID);
            if (!message) {
                console.log("message not found");
                return;
            }
            const roles = action.roleIDs.map(r => {
                const temp = guild.roles.resolve(r);
                if (!temp) {
                    console.log('role not found');
                }
                return temp;
            }).filter(r => r !== null);

            let obj: CondemnAction = d.value;
            obj.user = member;
            obj.msg = message;
            obj.restateRoles = roles as Discord.Role[];
            if (obj.fireTime) {
                const delay = obj.fireTime - Date.now();
                obj.timeout = setTimeout(async () => {
                    await this.release(obj.user, obj.msg, obj.config, false);
                }, delay);
            }

            this.jail.set(d.key, obj);
        });

        await Promise.all(promises);
        return this.actionStorage.clear();
    }

    arrest = async (user: Discord.GuildMember, guild: Discord.Guild,
            msg: Discord.Message, config: DefinedSettings,
            time?: number, doVote: boolean = false) => {
        await this.ready;

        const role = guild.roles.cache.find(role => role.name == config["jail-role"]);
        if (!role) {
            msg.reply(`I can't find the ${config["jail-role"]} role. Check your configuration.`);
            return;
        };
                
        if (doVote) {
            const sent = await msg.channel.send(`A vote to condemn ${user.displayName} has started. You have 1 minute to react to this message to vote.`);
            if (!(await this.vote(sent, VOTE_LENGTH))) {
                await msg.channel.send(`Vote has failed. ${user.displayName} will not be sent to ${role.name}`);
                return;
            }
        }

        const key = guild.id + user.id;
        let action: CondemnAction = {
            restateRoles: user.roles.cache.array(),
            user,
            msg,
            config
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
            const timeInMs = time * 60 * 1000;
            action.fireTime = Date.now() + timeInMs;
            action.timeout = setTimeout(async () => {
                await this.release(action.user, action.msg, action.config);
            }, timeInMs);
        }

        this.jail.set(key, action);
        await msg.channel.send({
            content: txt,
            files: config["arrest-photo"] ? [new Discord.MessageAttachment(config['arrest-photo'])] : undefined
        });
    }

    release = async (user: Discord.GuildMember, msg: Discord.Message, config: DefinedSettings, vote: boolean = false) => {
        await this.ready;
        const key = user.guild.id + user.id;

        if (!this.jail.has(key)) return;

        const action = this.jail.get(key)!;
        if (vote) {
            const sent = await msg.channel.send(`Shall ${action.user.displayName} be released from ${config["jail-role"]}? You have 1 minute to react to this message to vote.`);
            if (!(await this.vote(sent, VOTE_LENGTH))) {
                msg.channel.send(`Vote has failed. ${action.user.displayName} will not be released from ${config["jail-role"]}`)
                return;
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

    private vote = (msg: Discord.Message, time: number) =>  new Promise(async (resolve, reject) => {
            await msg.react("❎");
            await msg.react("✅");
            setTimeout(() => {
                const reactions = msg.reactions.cache.array();
                const yay = reactions.find(react => react.emoji.name == "✅")?.count;
                const nay = reactions.find(react => react.emoji.name == "❎")?.count;

                msg.delete().then(() => resolve(yay && nay && yay > 1 && yay > nay));
            }, time);
        });
}