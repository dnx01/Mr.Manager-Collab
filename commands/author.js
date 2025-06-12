const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
let getAuthorInfo;
try {
  getAuthorInfo = require('../utils/getAuthorInfo');
} catch (e) {
  getAuthorInfo = () => ({
    author: 'dnz_zz',
    discord: '923205829166006272',
    discord_url: 'https://discord.com/users/923205829166006272',
    website: 'https://github.com/dnx01/Mr.Manager'
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('author')
    .setDescription('Show information about the bot author.'),
  async execute(interaction) {
    const author = getAuthorInfo();
    const embed = new EmbedBuilder()
      .setTitle('Bot Author')
      .addFields(
        { name: 'Name', value: author.author, inline: true },
        //{ name: 'Discord', value: author.discord, inline: true },
        { name: 'Author Profile', value: `[Click here](https://discord.com/users/${author.discord})`, inline: true },
        { name: 'GitHub Source C0de', value: author.website, inline: false }
      )
      .setColor(0x5865F2)
      .setFooter({ text: 'This information is hardcoded and cannot be removed.' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
