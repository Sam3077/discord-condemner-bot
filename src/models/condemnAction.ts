import Discord from 'discord.js';

interface CondemnAction {
    user: Discord.GuildMember;
    restateRoles: Discord.Role[];
    timeout?: NodeJS.Timeout
}

function isCondemnAction(obj: any): obj is CondemnAction {
    return obj.user !== undefined && obj.restateRoles !== undefined;
}

export default CondemnAction;
export {isCondemnAction};