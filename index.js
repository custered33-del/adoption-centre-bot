const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  REST,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const commands = [
  new SlashCommandBuilder()
    .setName("adoptable")
    .setDescription("Put yourself up for adoption"),

  new SlashCommandBuilder()
    .setName("adopt")
    .setDescription("Adopt someone")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("Who you want to adopt")
        .setRequired(true)
    )
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("✅ Slash commands registered");
})();

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "adoptable") {
      await interaction.reply(`🍼 **${interaction.user.username} is now up for adoption**`);
    }

    if (interaction.commandName === "adopt") {
      const user = interaction.options.getUser("user");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("accept")
          .setLabel("Accept Adoption")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("reject")
          .setLabel("Reject")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({
        content: `🏡 **Adoption Request**\n${user}, do you accept?`,
        components: [row]
      });
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === "accept") {
      await interaction.update({ content: "🎉 Adoption successful", components: [] });
    }
    if (interaction.customId === "reject") {
      await interaction.update({ content: "💔 Adoption rejected", components: [] });
    }
  }
});

client.login(TOKEN);
