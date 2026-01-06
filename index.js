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

// =====================
// ENV VARIABLES
// =====================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

// =====================
// CLIENT SETUP
// =====================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// =====================
// SLASH COMMANDS
// =====================
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
    ),

  new SlashCommandBuilder()
    .setName("removeadoption")
    .setDescription("Remove your adoption roles")
].map(cmd => cmd.toJSON());

// =====================
// REGISTER COMMANDS
// =====================
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

  // Optional presence
  client.user.setPresence({
    status: "online",
    activities: [{ name: "Adoption Centre 🍼", type: 0 }]
  });
});

// =====================
// INTERACTIONS
// =====================
client.on("interactionCreate", async interaction => {
  try {
    const guild = interaction.guild;

    // ---- SLASH COMMANDS ----
    if (interaction.isChatInputCommand()) {
      await interaction.deferReply({ ephemeral: false });

      // ----- Adoptable -----
      if (interaction.commandName === "adoptable") {
        // Give "Up for Adoption" role
        let role = guild.roles.cache.find(r => r.name === "Up for Adoption");
        if (!role) {
          role = await guild.roles.create({ name: "Up for Adoption", mentionable: true });
        }

        await interaction.member.roles.add(role);

        return interaction.editReply(
          `🍼 **${interaction.user.username} is now up for adoption!**`
        );
      }

      // ----- Adopt -----
      if (interaction.commandName === "adopt") {
        const target = interaction.options.getUser("user");
        if (!target) return interaction.editReply("❌ User not found.");
        if (target.id === interaction.user.id) return interaction.editReply("❌ You cannot adopt yourself!");
        if (target.bot) return interaction.editReply("🤨 You cannot adopt a bot.");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`accept_${interaction.user.id}_${target.id}`)
            .setLabel("Accept Adoption")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId(`reject_${interaction.user.id}_${target.id}`)
            .setLabel("Reject")
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({
          content: `🏡 **Adoption Request**\n${target}, ${interaction.user} wants to adopt you.\nDo you accept?`,
          components: [row]
        });
      }

      // ----- Remove Adoption Roles -----
      if (interaction.commandName === "removeadoption") {
        const rolesToRemove = guild.roles.cache.filter(r =>
          r.name.startsWith("Up for Adoption") || r.name.startsWith("Adopted by")
        );

        await interaction.member.roles.remove(rolesToRemove);

        return interaction.editReply("✅ Your adoption roles have been removed.");
      }
    }

    // ---- BUTTONS ----
    if (interaction.isButton()) {
      await interaction.deferUpdate();

      const [action, requesterId, targetId] = interaction.customId.split("_");

      if (interaction.user.id !== targetId) {
        return interaction.followUp({
          content: "❌ You can't click this button!",
          ephemeral: true
        });
      }

      const member = interaction.member;
      const guild = interaction.guild;

      // Accept Adoption
      if (action === "accept") {
        // Remove "Up for Adoption" role if exists
        let adoptableRole = guild.roles.cache.find(r => r.name === "Up for Adoption");
        if (adoptableRole) await member.roles.remove(adoptableRole);

        // Create "Adopted by <name>" role
        const requester = await guild.members.fetch(requesterId);
        let adoptedRole = guild.roles.cache.find(r => r.name === `Adopted by ${requester.user.username}`);
        if (!adoptedRole) {
          adoptedRole = await guild.roles.create({
            name: `Adopted by ${requester.user.username}`,
            mentionable: true
          });
        }

        await member.roles.add(adoptedRole);

        return interaction.editReply({
          content: `🎉 **AdOPTION COMPLETE**\n${member.user} has been adopted by ${requester.user}!`,
          components: []
        });
      }

      // Reject Adoption
      if (action === "reject") {
        return interaction.editReply({
          content: `💔 **Adoption Rejected**\n${member.user} said no to <@${requesterId}>.`,
          components: []
        });
      }
    }
  } catch (err) {
    console.error("❌ Error handling interaction:", err);
  }
});

// =====================
// LOGIN
// =====================
client.login(TOKEN);

