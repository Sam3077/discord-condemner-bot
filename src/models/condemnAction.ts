import Discord from 'discord.js';
import {DefinedSettings} from './settings';

interface SerailizeableCondemnAction {
    guildID: string;
    userID: string;
    roleIDs: string[];
    fireTime?: number;
    channelID: string;
    msgID: string;
    config: DefinedSettings;
}

interface CondemnAction {
    timeout?: NodeJS.Timeout;
    user: Discord.GuildMember;
    restateRoles: Discord.Role[];
    fireTime?: number;
    msg: Discord.Message;
    config: DefinedSettings;
}

function toSerailizeableCondemnAction(obj: CondemnAction): SerailizeableCondemnAction {
    let n: SerailizeableCondemnAction = {
        guildID: obj.user.guild.id,
        userID: obj.user.id,
        roleIDs: obj.restateRoles.map(r => r.id),
        fireTime: obj.fireTime,
        channelID: obj.msg.channel.id,
        msgID: obj.msg.id,
        config: obj.config
    };
    return n;
}

function isCondemnAction(obj: any): obj is CondemnAction {
    return obj.user !== undefined && obj.restateRoles !== undefined;
}

function isSerializeableCondemnAction(obj: any): obj is SerailizeableCondemnAction {
    return obj.guildID !== undefined && obj.userID !== undefined && obj.roleIDs !== undefined && obj.channelID !== undefined && obj.msgID !== undefined && obj.config !== undefined;
}

export default CondemnAction;
export {isCondemnAction, toSerailizeableCondemnAction, SerailizeableCondemnAction, isSerializeableCondemnAction};