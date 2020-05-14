import Discord from 'discord.js';

interface CondemnAction {
    user: Discord.GuildMember;
    restateRoles: Discord.Role[];
    timeout?: NodeJS.Timeout
}

export default CondemnAction;