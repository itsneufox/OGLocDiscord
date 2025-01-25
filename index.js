const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./auth.json');
const fs = require('fs/promises');

const GLOBAL_COOLDOWN = 20000;
const REMINDERS_FILE = 'reminders.json';
const TIME_REGEX = /^(\d+)([smhd])$/;
const BANNED_USERS = ['283217410578972672'];

const COOLDOWNS = new Map();

const TIME_UNITS = {
    's': 1,
    'm': 60,
    'h': 3600,
    'd': 86400
};

let reminders = new Map();

const commands = {
    'help': generateCommandList(),
    'cmds': generateCommandList(),
    'commands': generateCommandList(),
    'gta': 'Game download link: https://amii.ir/files/hlm-gtasa.iso\nTutorial: https://discord.nfp.is/tY4',
    'piracy': ':warning: IT IS MORALLY CORRECT TO PIRATE THE ORIGINAL GTA SA IN 2025 TO PLAY OMP/SA:MP :warning:',
    'gtadhd': 'Game download link: https://amii.ir/files/hlm-gtasa.iso\nTutorial: https://discord.nfp.is/Toi',
    'gtade': 'The GTA SA Defective Edition is not yet supported by open.mp, use the original GTA SA instead.',
    'launcher': 'Download the latest open.mp launcher from here:\nhttps://github.com/openmultiplayer/launcher/releases/latest',
    'server': 'Download the latest open.mp server package from here:\nhttps://github.com/openmultiplayer/open.mp/releases/latest',
    'samp': 'Why use SA:MP when open.mp exists? :thinking:\nGet the latest open.mp launcher from here:\nhttps://github.com/openmultiplayer/launcher/releases/latest',
    'oglocgit': 'See my source-code here:\nhttps://github.com/itsneufox/OGLocDiscord\n',
    'wtls': 'This is open.mp/sa-mp discord server, not WTLS, you can find their discord at the bottom of their website. Please stop discussing about internal dramas in here, this is NOT the place for it!',
    'stock': 'don\'t use stock, until then eventually you will find out if you ever need it',
    'scm': '`SCM` as a macro for `SendClientMessage` is fucking stupid. Eject it from your code immediately.',
    'storyden': 'can i trouble you good sir to hear the good word of Storyden, the forum software of the future? https://storyden.org',
    'retard': 'Ding ding ding! I found him :point_right: <@380122256715808770>',
    'amir': 'amir is a fuckin bitch',
    'amirfr': 'nah jk amir is cool',
    'graber': 'graber is a bitch',
    'mido': () => `mido is busy rewriting his gamemode for the ${Math.floor(Math.random() * 1000000000)}th time`,
    'whenomp': 'Dobby: :man: :heart: :kiss: :man:',
    'pet': 'Rudy is currently on vacation, try again in a few days!',
    'makerudyfat': 'Rudy is currently on vacation, try again in a few days!'
};

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
        '.whenomp  -  Dobby when open.mp?\n' +
        '.mido     -  Is Mido busy rewriting?\n' +
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

async function cleanExpiredReminders() {
    for (const [userId, userReminders] of reminders) {
        const active = userReminders.filter(r => r.endTime > Date.now());
        if (active.length === 0) reminders.delete(userId);
        else reminders.set(userId, active);
    }
    await saveReminders();
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
    
    if (amount <= 0) {
        await message.reply(':x: Time must be positive!');
        return;
    }
    
    const MAX_TIMES = {
        's': 3600,
        'm': 1440,
        'h': 168,
        'd': 365
    };
    
    if (amount > MAX_TIMES[unit]) {
        await message.reply(`:x: Maximum allowed time for ${unit} is ${MAX_TIMES[unit]}`);
        return;
    }

    if (!content) {
        await message.reply(':x: Please provide a reminder message!');
        return;
    }

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
            try {
                await user.send(`:wave: Hey! Here's your reminder:\n\n\`${reminder.content}\``);
            } catch (dmError) {
                const channel = await client.channels.fetch(reminder.channelId);
                await channel.send(`:wave: Hey <@${reminder.userId}>, here's your reminder (i couldn't DM you):\n\n\`${reminder.content}\``);
            }
        } catch (error) {
            console.error('Failed to deliver reminder:', error);
        }
        
        const userReminders = reminders.get(reminder.userId).filter(r => r !== reminder);
        if (userReminders.length === 0) {
            reminders.delete(reminder.userId);
        } else {
            reminders.set(reminder.userId, userReminders);
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
    await cleanExpiredReminders();
    setInterval(cleanExpiredReminders, 8 * 60 * 60 * 1000);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith('.') && !message.content.startsWith('!')) return;

    const prefix = message.content[0];
    const command = message.content.slice(1).toLowerCase();
    const response = commands[command];

    const isValidCommand = response || message.content.startsWith(`${prefix}remindme`);
    if (!isValidCommand) return;

    if (BANNED_USERS.includes(message.author.id)) {
        await message.react('🖕');
        return;
    }

    const userId = message.author.id;
    const cooldownEnd = COOLDOWNS.get(userId);
    
    if (cooldownEnd && Date.now() < cooldownEnd) {
        await message.react('⏳');
        return;
    }
    
    COOLDOWNS.set(userId, Date.now() + GLOBAL_COOLDOWN);
    
    if (message.content.startsWith(`${prefix}remindme`)) {
        const args = message.content.slice(9).trim().split(/ +/);
        await handleReminder(message, args);
    } else {
        await message.reply(typeof response === 'function' ? response() : response);
    }
    
    setTimeout(() => COOLDOWNS.delete(userId), GLOBAL_COOLDOWN);
});

client.login(token);