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

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

/* REGISTER COMMANDS ONCE */
client.once("ready", async () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  const commands = [
    new SlashCommandBuilder()
      .setName("adoptable")
      .setDescription("Put yourself up for adoption"),
    new SlashCommandBuilder()
      .setName("adopt")
      .setDescription("Send an adoption request")
      .addUserOption(option =>
        option
          .setName("user")
          .setDescription("Who you want to adopt")
          .setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands registered");
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
});

/* SAFE INTERACTION HANDLER */
client.on("interactionCreate", async interaction => {
  try {
    // SLASH COMMANDS
    if (interaction.isChatInputCommand()) {
      await interaction.deferReply({ ephemeral: false });

      if (interaction.commandName === "adoptable") {
        return interaction.editReply(
          `🍼 **${interaction.user.username} is now up for adoption**`
        );
      }

      if (interaction.commandName === "adopt") {
        const target = interaction.options.getUser("user");

        if (!target) {
          return interaction.editReply("❌ User not found.");
        }

        if (target.bot) {
          return interaction.editReply("🤨 You cannot adopt a bot.");
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`accept_${interaction.user.id}`)
            .setLabel("Accept Adoption")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`reject_${interaction.user.id}`)
            .setLabel("Reject")
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({
          content: `🏡 **Adoption Request**\n${target}, ${interaction.user} wants to adopt you.\nDo you accept?`,
          components: [row]
        });
      }
    }

    // BUTTONS
    if (interaction.isButton()) {
      await interaction.deferUpdate();

      const [action, adopterId] = interaction.customId.split("_");

      if (!action) return; // SAFETY

      if (action === "accept") {
        return interaction.editReply({
          content: `🎉 **AdOPTION COMPLETE**\n${interaction.user} has been adopted.`,
          components: []
        });
      }

      if (action === "reject") {
        return interaction.editReply({
          content: `💔 **Adoption Rejected**\n${interaction.user} said no.`,
          components: []
        });
      }
    }
  } catch (err) {
    console.error("❌ Error handling interaction:", err);
    // DON’T crash the bot
  }
});

client.login(TOKEN);

