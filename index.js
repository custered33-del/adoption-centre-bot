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

/* =====================
   ENV VARIABLES
===================== */
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

/* =====================
   CLIENT SETUP
===================== */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

/* =====================
   SLASH COMMANDS
===================== */
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

/* =====================
   REGISTER COMMANDS ONCE
===================== */
client.once("ready", async () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

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

/* =====================
   INTERACTIONS
===================== */
client.on("interactionCreate", async interaction => {

  /* ---- SLASH COMMANDS ---- */
  if (interaction.isChatInputCommand()) {
    await interaction.deferReply();

    if (interaction.commandName === "adoptable") {
      return interaction.editReply(
        `🍼 **${interaction.user.username} is now up for adoption**`
      );
    }

    if (interaction.commandName === "adopt") {
      const target = interaction.options.getUser("user");

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

  /* ---- BUTTONS ---- */
  if (interaction.isButton()) {
    await interaction.deferUpdate();

    const [action, adopterId] = interaction.customId.split("_");

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
});

/* =====================
   LOGIN
===================== */
client.login(TOKEN);
