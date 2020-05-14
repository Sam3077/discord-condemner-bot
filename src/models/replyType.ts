import {StringResolvable, MessageOptions, MessageAdditions, Message} from 'discord.js';

type Options = MessageOptions | MessageAdditions | (MessageOptions & { split?: false }) | MessageAdditions
type Reply = (
    content?: StringResolvable,
    options?: Options
  ) => Promise<Message>

export {Options, Reply};