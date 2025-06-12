module.exports = {
    data: {},
    async execute(interaction) {
        await interaction.reply({ content: 'The /verify command has been disabled.', ephemeral: true });
    },
};
