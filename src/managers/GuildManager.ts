import Discord from 'discord.js';
import Config, {isSettings} from '../models/settings';
import config from '../config.json';
import storage from 'node-persist';

export default class GuildManager {
    private STORAGE_PATH = './data/guild-configs'
    private guildStorage: storage.LocalStorage;

    constructor() {
        this.guildStorage = storage.create({
            dir: this.STORAGE_PATH
        });
        this.guildStorage.init();
    }

    connect = async (guild: Discord.Guild) => {
        try {
            await this.guildStorage.setItem(guild.id, {initialized: false});
            return true;
        } catch(e) {
            return false;
        }
    }

    disconnect = async (guild: Discord.Guild) => {
        try {
            await this.guildStorage.removeItem(guild.id)
            return true;
        } catch(e) {
            return false;
        }
    }

    getConfig = async (guild: Discord.Guild) => {
        try {
            const config = await this.guildStorage.getItem(guild.id)
            if (isSettings(config)) {
                return config;
            } else {
                console.log("something else existed in storage", config);
                return { initialized: false };
            }
        } catch(e) {
            console.log(e);
            return { initialized: false };
        }
    }

    initialize = async (guild: Discord.Guild, channel: Discord.TextChannel, initializerId: string) => {
        const roleName = (await this.ask("What is the name of the \"jail\" role?", channel, initializerId))?.content;
        if (!roleName) return;

        let role = guild.roles.cache.find(role => role.name === roleName);
        if (!role) {
            const tmp = await this.createRole(roleName, channel, guild, initializerId);
            if (!tmp) return;

            role = tmp;
        }

        const savedRoleList = (await this.ask("Are there any roles that you want to persist even when a user is put in \"jail\"?\nType the name of each role, separated by a comma, or type 'no' if there aren't any.", channel, initializerId))?.content
        if (!savedRoleList) return;

        let rolesToSave: string[] = [];
        if (savedRoleList !== 'no') {
            const savedRoleNames = savedRoleList.split(",").map(r => r.trim());
            const savedRoles = savedRoleNames.map(name => guild.roles.cache.find(r => r.name === name));
            const notFound = savedRoles.map((val, index) => {
                if (val === undefined) {
                    return savedRoleNames[index];
                }
                return null;
            }).filter(v => v !== null);
            if (notFound.length > 0) {
                await channel.send(`Hmm... I counldn't find any roles named ${notFound.join(", or ")}. Exiting initialization.`);
                return;
            }

            rolesToSave = savedRoleNames;
        }

        const condemnRes = await this.ask("Do you want me to post an attachment (photo, gif, etc.) when a user is condemned?\nRespond with the attachment or \"no\".", channel, initializerId);
        let jailAttach: Discord.MessageAttachment | undefined;
        if (!condemnRes) return;
        if (this.textToBool(condemnRes.content) !== false) {
            jailAttach = condemnRes.original.attachments.first();
        }

        const freeRes = await this.ask("Do you want me to post an attachment (photo, gif, etc.) when a user is freed?\nRespond with the attachment or \"no\".", channel, initializerId);
        let freeAttach: Discord.MessageAttachment | undefined;
        if (!freeRes) return;
        if (this.textToBool(freeRes.content) !== false) {
            freeAttach = freeRes.original.attachments.first();
        }

        const settings: Config = {
            initialized: true,
            "jail-role": role.name,
            "save-roles": rolesToSave,
            "arrest-photo": jailAttach?.attachment.toString(),
            "free-photo": freeAttach?.attachment.toString()
        }

        await this.guildStorage.setItem(guild.id, settings);
        await channel.send(`Great! Everything's set up on my end.
Now go set the permissions on the role, ${role.name}, to whatever you want to restrict access to!

Remember, you can always run \`${config.prefix} ${config["init-command"]}\` if you want to change your settings.`);
    }

    private createRole = async (roleName: string, channel: Discord.TextChannel, guild: Discord.Guild, initializerId: string) => {
        const res = (await this.ask(`I can't find a role called ${roleName}. Would you like to create a new role and continue with initalization? (yes/no)`, channel, initializerId))?.content
        if (!res) return;

        let processedRes = this.textToBool(res);
        while (processedRes === null) {
            const res = (await this.ask("Please answer yes or no. Or exit to quit initialization", channel, initializerId))?.content;
            if (!res || res === 'exit') return;

            processedRes = this.textToBool(res);
        }

        if (!processedRes) {
            await channel.send('Okay. Exiting initialization for now.');
            return;
        }

        return guild.roles.create({
            data: {
                name: roleName
            },
            reason: "Auto-created by Condemner bot."
        });
    }

    private ask = async (message: string, channel: Discord.TextChannel, fromId: string) => {
        await channel.send(message);
        const response = (await channel.awaitMessages((m) => m.author.id === fromId, {max: 1, time: 30000})).first();
        if (!response) {
            await channel.send("No response. Exiting initialization");
            return null
        }
        return {
            content: response.content.trim(),
            original: response
        }
    }

    private textToBool = (text: string) => {
        if (text.toLowerCase() === 'yes' || text.toLowerCase() == 'y') {
            return true;
        }

        if (text.toLowerCase() === 'no' || text.toLowerCase() == 'n') {
            return false;
        }
        return null;
    }
}