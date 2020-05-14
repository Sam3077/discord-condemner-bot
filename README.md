# Discord Condemner Bot
This is a bot made using [discord.js](https://discord.js.org/) and [TypeScript](https://www.typescriptlang.org/).
The intention of this bot is to be a moderation tool. It allows for democratization of moderation actions by allowing guild members to vote to silence a user temporarily.

## Installation
You can install this bot to your server using https://discord.com/oauth2/authorize?client_id=710031052424609833&scope=bot&permissions=268470272
After installing, run the admin command `!condemner init` to setup your personal settings.
Run `!condemner help` for a full list of available commands.

## Contribution
Feel free to contribute to this repo as you see fit!
- Install the git repo to your local machine.
- Run `npm i` to install all dependencies.
- Run `npm run compile` to compile the TypeScript to JavaScript.
- Run `npm run start` to compile the TypeScript to JavaScript and start the bot.
- Run `npm run no-compile` to start the bot without compiling.

### Before running your own instance
You'll need to do this before testing you local code or if you want to create your own fork of this project.
- Go to https://discord.com/developers/applications/me and register a new application.
- On the left-hand pannel, click on "Bot" and add a bot to your application.
- After adding a new bot, find where it says "Token" and copy the value.
- Add a new file `src/private-config.json` with contents:
```
{
    "token": [token value from console]
}
```
- Finally, reference https://discord.com/developers/docs/topics/oauth2#bots to create a link to add your new bot to a server!