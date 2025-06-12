// deploy-commands.js - Script for registering slash commands
const { REST, Routes } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data && typeof command.data.toJSON === 'function') {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

const CLIENT_ID = '1330231261419143290';
const GUILD_ID = process.env.GUILD_ID; // Add your test server's guild ID in .env

const deployType = process.argv[2] === 'guild' ? 'guild' : 'global';

(async () => {
    try {
        if (deployType === 'guild' && GUILD_ID) {
            console.log('Started refreshing application (/) commands for GUILD:', GUILD_ID);
            await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands },
            );
            console.log('Successfully reloaded application (/) commands for GUILD:', GUILD_ID);
        } else {
            console.log('Started refreshing application (/) commands globally.');
            await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands },
            );
            console.log('Successfully reloaded application (/) commands globally.');
        }
    } catch (error) {
        console.error(error);
    }
})();
