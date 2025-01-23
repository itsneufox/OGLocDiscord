const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./auth.json');

const commands = {
    'gta': 'Game download link: https://amii.ir/files/hlm-gtasa.iso\nTutorial: https://discord.nfp.is/tY4',
    'piracy': 'IT IS MORALLY CORRECT TO PIRATE THE ORIGINAL GTA SA IN 2025 TO PLAY SAMP AND OMP',
    'gtadhd': 'Game download link: https://amii.ir/files/hlm-gtasa.iso\nTutorial: https://discord.nfp.is/Toi',
    'gtade': 'The GTA SA Defective Edition is not yet supported by open.mp, use the original GTA SA instead.',
    'launcher': 'Download the latest open.mp launcher from here:\nhttps://github.com/openmultiplayer/launcher/releases/latest',
    'server': 'Download the latest open.mp server package from here:\nhttps://github.com/openmultiplayer/open.mp/releases/latest',
    'samp': 'Don\'t use SAMP, use open.mp instead!\nDownload the latest open.mp launcher from here:\nhttps://github.com/openmultiplayer/launcher/releases/latest',
    'retard': 'It\'s this guy here: <@380122256715808770>'
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith('.') || message.author.bot) return;

    const command = message.content.slice(1).toLowerCase();
    const response = commands[command];
    
    if (response) {
        await message.reply(response);
    }
});

client.login(token);