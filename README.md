# Gunther-Voice
## Voice Bot for usage with Gunther Discord AI

Please visit [this Repo](https://github.com/SteffTek/Gunther-Bot) for Gunther AI Bot.

**THIS APPLICATION DOESN'T WORK WITHOUT THE OTHER BOT!**

___

## Prerequisites
| Programm        | Version           |
| --------------- |:-----------------:|
| Node JS           | 14.15.4 |
| NPM               | 6.14.11 |
___
## Installation
```
    npm install
```
Rename ```default.config.json``` to config.json and fill out the missing information.

```json
{
    "token": "",
    "prefix":"!cb",
    "tts-lang":"de-DE",
    "command_channel":"",
    "websocket":"ws://localhost:8765",
    "lang": {
        "not_in_voice":"You are currently not in any voice channel!",
        "already_in_voice":"I'm already in a voice channel!",
        "on_my_way":"Alright! On my way fellow kids!"
    }
}
```

Afterwards you can start Gunther Voice with
```
    npm start
```