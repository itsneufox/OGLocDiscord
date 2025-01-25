const {
    Client,
    GatewayIntentBits
} = require('discord.js');

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const {
    token
} = require('./auth.json');

const fs = require('fs/promises');
const axios = require('axios');

const GLOBAL_COOLDOWN = 15000;
const REMINDERS_FILE = 'reminders.json';
const COUNTER_FILE = 'counter.json';
const TIME_REGEX = /^(\d+)([smhd])$/;
const BANNED_USERS = ['283217410578972672'];

const COOLDOWNS = new Map();
let counter = 0;

const TIME_UNITS = {
    's': 1,
    'm': 60,
    'h': 3600,
    'd': 86400
};

let reminders = new Map();

async function handleUrban(message, args) {
    const word = args.join(' ');
    if (!word) {
        await message.reply(':x: Please provide a word to search!');
        return;
    }

    try {
        const response = await axios.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`);
        const data = response.data;

        if (!data.list || data.list.length === 0) {
            await message.reply('No Urban Dictionary entries were found.');
            return;
        }

        const entries = data.list.map(ud => ({
            title: `${ud.word} by ${ud.author}`.slice(0, 255),
            url: ud.permalink,
            description: `${ud.definition}\n\n**Example:** ${ud.example}`.slice(0, 2047),
            footer: `👎 ${ud.thumbs_down} / 👍 ${ud.thumbs_up}, Powered by your modder`
        }));

        let currentPage = 0;
        const embed = {
            color: 0x0099ff,
            title: entries[currentPage].title,
            url: entries[currentPage].url,
            description: entries[currentPage].description,
            footer: {
                text: `${entries[currentPage].footer} | Page ${currentPage + 1}/${entries.length}`
            }
        };

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setCustomId('previous')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 0),
                new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(entries.length <= 1)
            );

        const reply = await message.reply({
            embeds: [embed],
            components: entries.length > 1 ? [row] : []
        });

        if (entries.length > 1) {
            const collector = reply.createMessageComponentCollector({
                time: 60000
            });

            collector.on('collect', async interaction => {
                if (interaction.user.id !== message.author.id) {
                    await interaction.reply({
                        content: 'This is not for you!',
                        ephemeral: true
                    });
                    return;
                }

                if (interaction.customId === 'previous') {
                    currentPage = currentPage > 0 ? currentPage - 1 : entries.length - 1;
                } else if (interaction.customId === 'next') {
                    currentPage = currentPage < entries.length - 1 ? currentPage + 1 : 0;
                }

                const newEmbed = {
                    color: 0x0099ff,
                    title: entries[currentPage].title,
                    url: entries[currentPage].url,
                    description: entries[currentPage].description,
                    footer: {
                        text: `${entries[currentPage].footer} | Page ${currentPage + 1}/${entries.length}`
                    }
                };

                const newRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === entries.length - 1)
                    );

                await interaction.update({
                    embeds: [newEmbed],
                    components: [newRow]
                });
            });

            collector.on('end', () => {
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                        new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                    );
                reply.edit({
                    components: [disabledRow]
                }).catch(console.error);
            });
        }
    } catch (error) {
        console.error('Urban Dictionary API error:', error);
        await message.reply('Failed to fetch Urban Dictionary entry.');
    }
}

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
    'whenomp': 'Dobby: :man: :heart: :kiss: :man:',
    'pet': 'Rudy is currently on vacation, try again in a few days!',
    'makerudyfat': 'Rudy is currently on vacation, try again in a few days!',
    'crazy': 'Crazy? I was crazy once. They locked me in a room. A rubber room. A rubber room with rats, and rats make me crazy',
    'dentist': 'i am a medical student it is complicated when you know how your brain works',
    'mido': () => {
        counter++;
        saveCounter();
        const suffix = counter % 10 === 1 && counter % 100 !== 11 ? 'st' :
            counter % 10 === 2 && counter % 100 !== 12 ? 'nd' :
            counter % 10 === 3 && counter % 100 !== 13 ? 'rd' : 'th';
        return `mido is busy rewriting his gamemode for the ${counter}${suffix} time`;
    },
    'urban': async (message, args) => {
        const searchArgs = args.slice(1);
        await handleUrban(message, searchArgs);
    }
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
        '.urban    -  Search Urban Dictionary\n' +
        '.cmds     -  See list of commands\n' +
        '.oglocgit -  Link to OG Loc source-code\n\n' +
        '# Fun\n' +
        '.retard   -  You know who is that...\n' +
        '.whenomp  -  Dobby when open.mp?\n' +
        '.mido     -  Is Mido busy rewriting?\n' +
        '.crazy    -  HE IS CRAZY!!!\n' +
        '.dentist  -  Definitely not British...\n' +
        '```';
}

async function loadCounter() {
    try {
        const data = await fs.readFile(COUNTER_FILE, 'utf8');
        counter = JSON.parse(data).count;
    } catch (err) {
        console.log('No existing counter found, starting at 0');
        await saveCounter();
    }
}

async function saveCounter() {
    const data = JSON.stringify({
        count: counter
    });
    await fs.writeFile(COUNTER_FILE, data);
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
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions
    ]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await loadCounter();
    await loadReminders();
    await cleanExpiredReminders();
    setInterval(cleanExpiredReminders, 8 * 60 * 60 * 1000);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if ((message.content.includes('instagram.com') && !message.content.includes('ddinstagram.com') && !message.content.includes('instagramez.com')) ||
        (message.content.includes('x.com') && !message.content.includes('fxtwitter.com')) ||
        (message.content.includes('twitter.com') && !message.content.includes('vxtwitter.com'))) {

        const linkVariants = [{
                transform: content => content
                    .replace(/instagram\.com/g, 'ddinstagram.com')
                    .replace(/twitter\.com/g, 'vxtwitter.com')
                    .replace(/x\.com/g, 'fxtwitter.com'),
                label: content => {
                    if (content.includes('instagram.com')) return 'Try DDinstagram';
                    if (content.includes('twitter.com') || content.includes('x.com')) return 'Try  VXtwitter';
                    return 'Try Alternate';
                }
            },
            {
                transform: content => content
                    .replace(/instagram\.com/g, 'instagramez.com')
                    .replace(/twitter\.com/g, 'fxtwitter.com')
                    .replace(/x\.com/g, 'vxtwitter.com'),
                label: content => {
                    if (content.includes('instagram.com')) return 'Try instagramEZ';
                    if (content.includes('twitter.com') || content.includes('x.com')) return 'Try FXtwitter';
                    return 'Try Alternate';
                }
            }
        ];

        let currentVariant = 0;
        let currentContent = linkVariants[currentVariant].transform(message.content);

        const getRow = () => {
            return new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                    .setCustomId('alternate')
                    .setLabel(linkVariants[(currentVariant + 1) % linkVariants.length].label(message.content))
                    .setStyle(ButtonStyle.Primary)
                );
        };

        const reply = await message.reply({
            content: currentContent,
            components: [getRow()]
        });

        const collector = reply.createMessageComponentCollector({
            time: 60000
        });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id) {
                await interaction.reply({
                    content: 'This is not for you!',
                    ephemeral: true
                });
                return;
            }

            currentVariant = (currentVariant + 1) % linkVariants.length;
            currentContent = linkVariants[currentVariant].transform(message.content);

            await interaction.update({
                content: currentContent,
                components: [getRow()]
            });
        });

        collector.on('end', () => {
            if (!reply.deleted) {
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                        .setCustomId('alternate')
                        .setLabel(linkVariants[(currentVariant + 1) % linkVariants.length].label(message.content))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                    );
                reply.edit({
                    components: [disabledRow]
                }).catch(() => {});
            }
        });
    }
    if (!message.content.startsWith('.') && !message.content.startsWith('!')) return;

    const prefix = message.content[0];
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args[0].toLowerCase();

    const isValidCommand = commands[command] || message.content.startsWith(`${prefix}remindme`);
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
        const reminderArgs = message.content.slice(9).trim().split(/ +/);
        await handleReminder(message, reminderArgs);
    } else if (command === 'urban') {
        await commands.urban(message, args);
    } else {
        const response = commands[command];
        await message.reply(typeof response === 'function' ? response() : response);
    }

    setTimeout(() => COOLDOWNS.delete(userId), GLOBAL_COOLDOWN);
});

client.login(token);