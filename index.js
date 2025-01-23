const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./auth.json');
const fs = require('fs/promises');

const COOLDOWN_TIME = 15000;
const ALLOWED_CHANNELS = ['231799104731217931', '1331013910022852696'];
const REMINDERS_FILE = 'reminders.json';
const TIME_REGEX = /^(\d+)([smhd])$/;
const TIME_UNITS = {
    's': 1,
    'm': 60,
    'h': 3600,
    'd': 86400
};

const COOLDOWN = new Map();
let reminders = new Map();

const commands = {
    'help': generateCommandList(),
    'cmds': generateCommandList(),
    'gta': 'Game download link: https://amii.ir/files/hlm-gtasa.iso\nTutorial: https://discord.nfp.is/tY4',
    'piracy': ':warning: IT IS MORALLY CORRECT TO PIRATE THE ORIGINAL GTA SA IN 2025 TO PLAY OMP/SA:MP :warning:',
    'gtadhd': 'Game download link: https://amii.ir/files/hlm-gtasa.iso\nTutorial: https://discord.nfp.is/Toi',
    'gtade': 'The GTA SA Defective Edition is not yet supported by open.mp, use the original GTA SA instead.',
    'launcher': 'Download the latest open.mp launcher from here:\nhttps://github.com/openmultiplayer/launcher/releases/latest',
    'server': 'Download the latest open.mp server package from here:\nhttps://github.com/openmultiplayer/open.mp/releases/latest',
    'samp': 'Why use SA:MP when open.mp exists? :thinking:\nGet the latest open.mp launcher from here:\nhttps://github.com/openmultiplayer/launcher/releases/latest',
    'oglocgit': 'See my source-code here:\nhttps://github.com/itsneufox/OGLocDiscord\n',
    'retard': 'Ding ding ding! I found him :point_right: <@380122256715808770>'
};

const ogLocQuotes = [
    "Yeah, yeah, yeah... This is me, OG Loc, in the house, baby...",
    "Damn, my shit was whack!",
    "I'm GANGSTA!",
    "I'm the voice of the people, like Moses, only keepin' it real!",
    "Man, fuck you! And I don't care what you heard, I ain't nobody's Ass Technician, BITCH!",
    "You punk-ass bitch, punk-ass busta fool!",
    "You a busta fool. Luckily, your not dead 'coz I'm also a pimp! Including you, I'll pimp anything! You hear me playa?",
    "ARE YOU - DISSIN' - MY HOS, BITCH?",
    "Like a 'quarter pound! Later!",
    "I've been gangbangin' since I was three!",
    "I gotta protect my rep!",
    "Look at my man CJ right there - what up, n-gga? What UUUUUUUUPPPP..."
];

function generateCommandList() {
    return '```md\n# Note: All commands work with both . and ! prefixes\n\n' +
        '# Game Related\n' +
        '.gta      -  Get GTA:SA download with tutorial\n' +
        '.gtadhd   -  Get GTA:SA download with ADHD tutorial\n' +
        '.gtade    -  GTA:SA DE info\n' +
        '.piracy   -  Piracy statement\n\n' +
        '# open.mp Related\n' +
        '.launcher -  Get open.mp launcher\n' +
        '.server   -  Get open.mp server\n' +
        '.samp     -  Get SA:MP launcher\n\n' +
        '# Utility\n' +
        '.remindme -  Set a reminder\n' +
        '.cmds     -  See list of commands\n' +
        '.oglocgit -  Link to OG Loc source-code\n\n' +
        '# Fun\n' +
        '.retard   -  You know who is that...\n' +
        '```';
}

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

async function handleReminder(message, args) {
    const timeArg = args[0];
    const content = args.slice(1).join(' ');

    const timeMatch = timeArg.match(TIME_REGEX);
    if (!timeMatch) {
        await message.reply(':x: Invalid time format! Use: `.remindme <time><unit> <message>`\nExample: `.remindme 30m meeting with macaco`');
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
        try {
            const user = await client.users.fetch(reminder.userId);
            await user.send(`:wave: Here's your reminder:\n\n\`${reminder.content}\``);
        } catch (error) {
            const channel = await client.channels.fetch(reminder.channelId);
            await channel.send(`:wave: <@${reminder.userId}>, here's your reminder:\n\n\`${reminder.content}\``);
        }
        
        const userReminders = reminders.get(message.author.id).filter(r => r !== reminder);
        if (userReminders.length === 0) {
            reminders.delete(message.author.id);
        } else {
            reminders.set(message.author.id, userReminders);
        }
        await saveReminders();
    }, seconds * 1000);

    await message.reply(`:white_check_mark: Reminder set! I'll DM you in ${amount}${unit} about:\n\n\`${content}\``);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await loadReminders();
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content.toLowerCase().includes('og loc') && ALLOWED_CHANNELS.includes(message.channel.id)) {
        const cooldownEnd = COOLDOWN.get(message.author.id);
        if (cooldownEnd && Date.now() < cooldownEnd) {
            await message.react('⏳');
            return;
        }

        COOLDOWN.set(message.author.id, Date.now() + COOLDOWN_TIME);
        await message.reply(ogLocQuotes[Math.floor(Math.random() * ogLocQuotes.length)]);
        setTimeout(() => COOLDOWN.delete(message.author.id), COOLDOWN_TIME);
        return;
    }

    if ((!message.content.startsWith('.') && !message.content.startsWith('!')) || message.author.bot) return;

    const cooldownEnd = COOLDOWN.get(message.author.id);
    if (cooldownEnd && Date.now() < cooldownEnd) {
        await message.react('⏳');
        return;
    }

    COOLDOWN.set(message.author.id, Date.now() + COOLDOWN_TIME);

    const prefix = message.content[0];

    if (message.content.startsWith(`${prefix}remindme`)) {
        const args = message.content.slice(9).trim().split(/ +/);
        await handleReminder(message, args);
        return;
    }

    const command = message.content.slice(1).toLowerCase();
    const response = commands[command];
    
    if (response) {
        await message.reply(response);
    }

    setTimeout(() => COOLDOWN.delete(message.author.id), COOLDOWN_TIME);
});

client.login(token);