const fs = require('fs');
const Discord = require('discord.js');
const config = require('./config.json');
const textToSpeech = require('@google-cloud/text-to-speech');
const util = require('util');
const https = require('https');
const path = require("path");
const Readable = require('stream').Readable;


const client = new Discord.Client();
let currentTalkChannel = null;
let voiceConnection = null;

/*
    TTS
*/
const googleTTS = require('google-tts-api');
async function convertText(data) {

    let string = data.content;
    let discordMember = data.author;

    string = discordMember.displayName + ", " + string;

    if (currentTalkChannel == null) {
        return;
    }

    if (data.confidence < 0.1) {
        //return
    }

    if (data.content.length > 198) {
        return;
    }

    const url = googleTTS.getAudioUrl(string, {
        lang: 'de-DE',
        slow: false,
        host: 'https://translate.google.com',
    });

    await voiceConnection.play(url, { quality: 'highestaudio', volume: 0.85 })
}

/*
    STT
*/
async function getTextFromAudio(discordMember) {
    console.log("Sending audio for " + discordMember.displayName)

    //LOAD AUDIO FROM FILE
    let peth = path.join(__dirname, "user_audio", discordMember.id);
    let rawData = fs.readFileSync(peth);

    try {
        //SEND AUDIO
        let payload = {
            author: discordMember,
            binary: rawData
        }
        await ws.send(JSON.stringify(payload))
    } catch (e) {
        return false;
    }

    //RETURN
    return true;
}

/*
    WEBSOCKET
*/
const WebSocket = require("ws");
const request = require('request');
var ws;

async function connect() {
    ws = new WebSocket(config.websocket);
    ws.onopen = function () {
        console.log("Socket is opened.")
    };

    ws.onmessage = async function (e) {
        let jsonData = JSON.parse(e.data)

        if ("recognized" in jsonData) {
            let payload = {
                content: jsonData.recognized,
                author: jsonData.author
            }
            await ws.send(JSON.stringify(payload))
            return;
        }

        await convertText(JSON.parse(e.data));
    };

    ws.onclose = function (e) {
        console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
        setTimeout(function () {
            connect();
        }, 1000);
    };

    ws.onerror = function (err) {
        console.error('Socket encountered error: ', err.message, 'Closing socket');
        ws.close();
    };
}

connect();

/*
    DISCORD MESSAGES
*/
client.on('message', async message => {

    if (message.author.id == client.user.id) {
        return;
    }

    if (message.channel.id == config.channel) {
        let content = message.content;
        let member = message.member;

        if (content == config.prefix + " join") {

            if (message.member.voice.channelID == null) {
                await message.channel.send(`<@${member.id}> Du befindest dich nicht in einem Sprachkanal.`)
                return;
            }

            if (voiceConnection != null) {
                await message.channel.send(`<@${member.id}> Ich befinde mich bereits in einem Sprachkanal.`)
                return;
            }

            await message.channel.send(`<@${member.id}> Alles klar, bin auf dem Weg!`)
            await joinVoiceChat(message.member.voice.channelID);

            let payload = {
                content: "Hallo",
                author: message.member
            }
            await ws.send(JSON.stringify(payload))
        }
    }
});

/*
    SPEAKING EVENT
*/
let speaker_dict = {}
async function onSpeaking(user, speaking) {

    guild = currentTalkChannel.guild;
    member = await guild.members.fetch(user.id);

    memberVoiceState = member.voice;
    memberChannel = member.voice.channel;
    isSpeaking = !!speaking.bitfield;

    if (member.id == client.user.id) {
        return;
    }

    if (voiceConnection == null) {
        return;
    }

    if (memberChannel.id != currentTalkChannel.id) {
        return;
    }

    if (voiceConnection.status != 0) {
        return;
    }

    if (isSpeaking) {
        console.log("Recording Member " + member.displayName);

        //RECORD AUDIO
        let peth = path.join(__dirname, "user_audio", member.id);
        const audio = voiceConnection.receiver.createStream(member, { mode: "pcm" })
        audio.pipe(fs.createWriteStream(peth));

        //Save Member to Dict
        speaker_dict[member.id] = true;

        //Reset Auto Disconnect
        autoDisconnect();
    } else {
        if (speaker_dict[member.id] == true) {

            //SEND AUDIO
            worked = await getTextFromAudio(member);
            if (!worked) {
                console.log("Error while Sending Audio for Member " + member.displayName);
            } else {
                console.log("Stopped recording Member " + member.displayName);
            }

            //RESET MEMBER STATE
            speaker_dict[member.id] = false;
        }
    }
}

let timeout = null;
async function autoDisconnect() {
    if (timeout != null) {
        clearTimeout(timeout);
    }

    timeout = setTimeout(function () {
        leaveVoiceChat();
    }, 1000 * 60);
}

/*
    VOICE CHAT METHODS
*/
async function joinVoiceChat(channelID) {
    try {
        //JOIN CHANNEL
        currentTalkChannel = await getChannel(channelID);
        voiceConnection = await currentTalkChannel.join();

        console.log("Joined Voice Channel " + currentTalkChannel.name);

        //EVENT HANDLING
        voiceConnection.on("speaking", onSpeaking);
        voiceConnection.on("disconnect", async function() {
            console.log("Disconnected from Channel " + currentTalkChannel.name);
            voiceConnection = null;
            currentTalkChannel = null;
        })

        //ENABLE AUTO DISCONNECT
        autoDisconnect();
    } catch (e) {
        return false;
    }
    return true;
}

async function leaveVoiceChat() {
    try {
        await voiceConnection.disconnect()
        await currentTalkChannel.leave()
    } catch (e) {
        return false;
    }
    return true;
}

/*
    STARTUP
*/

client.once('ready', async () => {
    console.log('Bot Online!');
});


async function getChannel(id) {
    return await client.channels.fetch(id)
}

//START CLIENT
client.login(config.token)