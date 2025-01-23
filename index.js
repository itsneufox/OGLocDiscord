const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./auth.json');
const fs = require('fs/promises');

const REMINDERS_FILE = 'reminders.json';
let reminders = new Map();

const commands = {
    'cmds': 
    '```md\n# Game Related\n' +
    '.gta      -  Get GTA:SA download link\n' +
    '.gtadhd   -  Get ADHD GTA:SA download link\n' +
    '.gtade    -  DE support info\n' +
    '.piracy   -  Piracy statement\n\n' +
    '# open.mp Related\n' +
    '.launcher -  Get open.mp launcher\n' +
    '.server   -  Get open.mp server\n' +
    '.samp     -  SA:MP info\n\n' +
    '# Utility\n' +
    '.cmds     -  See list of commands\n' +
    '.remindme -  Set a reminder\n' +
    '.retard   -  You know who is that...\n' +
    '```',
    'gta': 'Game download link: https://amii.ir/files/hlm-gtasa.iso\nTutorial: https://discord.nfp.is/tY4',
    'piracy': 'IT IS MORALLY CORRECT TO PIRATE THE ORIGINAL GTA SA IN 2025 TO PLAY SAMP AND OMP',
    'gtadhd': 'Game download link: https://amii.ir/files/hlm-gtasa.iso\nTutorial: https://discord.nfp.is/Toi',
    'gtade': 'The GTA SA Defective Edition is not yet supported by open.mp, use the original GTA SA instead.',
    'launcher': 'Download the latest open.mp launcher from here:\nhttps://github.com/openmultiplayer/launcher/releases/latest',
    'server': 'Download the latest open.mp server package from here:\nhttps://github.com/openmultiplayer/open.mp/releases/latest',
    'samp': 'Don\'t use SAMP, use open.mp instead!\nDownload the latest open.mp launcher from here:\nhttps://github.com/openmultiplayer/launcher/releases/latest',
    'retard': 'It\'s this guy here: <@380122256715808770>'
};

async function loadReminders() {
    try {
        const data = await fs.readFile(REMINDERS_FILE, 'utf8');
        const parsed = JSON.parse(data);
        reminders = new Map(parsed);
    } catch (err) {
        console.log('No existing reminders found');
    }
}

async function saveReminders() {
    const data = JSON.stringify(Array.from(reminders));
    await fs.writeFile(REMINDERS_FILE, data);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TIME_REGEX = /^(\d+)([smhd])$/;
const TIME_UNITS = {
    's': 1,
    'm': 60,
    'h': 3600,
    'd': 86400
};

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await loadReminders();
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith('.') || message.author.bot) return;

    if (message.content.startsWith('.remindme')) {
        const args = message.content.slice(9).trim().split(/ +/);
        const timeArg = args[0];
        const content = args.slice(1).join(' ');

        const timeMatch = timeArg.match(TIME_REGEX);
        if (!timeMatch) {
            await message.reply(':iq: Invalid time format! Use: `.remindme <time><unit> <message>`\nExample: `.remindme 30m meeting with macaco`');
            return;
        }

        const amount = parseInt(timeMatch[1]);
        const unit = timeMatch[2];
        const seconds = amount * TIME_UNITS[unit];
        const endTime = Date.now() + (seconds * 1000);

        const reminder = {
            userId: message.author.id,
            channelId: message.channel.id,
            content,
            endTime
        };

        if (!reminders.has(message.author.id)) {
            reminders.set(message.author.id, []);
        }
        reminders.get(message.author.id).push(reminder);
        await saveReminders();

        setTimeout(async () => {
            const channel = await client.channels.fetch(reminder.channelId);
            await channel.send(`:wave: <@${reminder.userId}>, here's your reminder:\n\n\`${reminder.content}\`\n\nHope you didn't forget!`);
            
            reminders.set(message.author.id, 
                reminders.get(message.author.id).filter(r => r !== reminder));
            await saveReminders();
        }, seconds * 1000);

        await message.reply(`:white_check_mark: Reminder set! I'll notify you in ${amount}${unit} about:\n\n\`${content}\`\n\n:warning: Note: I can't send you a DM, so I'll ping you here.`);
        return;
    }

    const command = message.content.slice(1).toLowerCase();
    const response = commands[command];
    
    if (response) {
        await message.reply(response);
    }
});

client.login(token);