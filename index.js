//////////////////////////////////////////
//////////////// LOGGING /////////////////
//////////////////////////////////////////
function getCurrentDateString() {
    return (new Date()).toISOString() + ' ::';
};
__originalLog = console.log;
console.log = function () {
    var args = [].slice.call(arguments);
    __originalLog.apply(console.log, [getCurrentDateString()].concat(args));
};
//////////////////////////////////////////
//////////////////////////////////////////

const testMode = false;

const clientIDS = [""];

const fs = require('fs');
const util = require('util');
const path = require('path');
const request = require('request');
const { Readable } = require('stream');

//////////////////////////////////////////
///////////////// VARIA //////////////////
//////////////////////////////////////////

function necessary_dirs() {
    if (!fs.existsSync('./data/')){
        fs.mkdirSync('./data/');
    }
}
necessary_dirs()

function shuffle(array) {
  var tmp, current, top = array.length;
  if(top) while(--top) {
    current = Math.floor(Math.random() * (top + 1));
    tmp = array[current];
    array[current] = array[top];
    array[top] = tmp;
  }
  return array;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function convert_audio(input) {
    try {
        // stereo to mono channel
        const data = new Int16Array(input)
        const ndata = new Int16Array(data.length/2)
        for (let i = 0, j = 0; i < data.length; i+=4) {
            ndata[j++] = data[i]
            ndata[j++] = data[i+1]
        }
        return Buffer.from(ndata);
    } catch (e) {
        console.log(e)
        console.log('convert_audio: ' + e)
        throw e;
    }
}
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////


//////////////////////////////////////////
//////////////// CONFIG //////////////////
//////////////////////////////////////////

const SETTINGS_FILE = 'settings.json';

let DISCORD_TOK = null;
let WITAPIKEY = null;
let SPOTIFY_TOKEN_ID = null;
let SPOTIFY_TOKEN_SECRET = null;
let MAX_TRESHOLD = null;
let PREFIX = ".";

function loadConfig() {
    if (fs.existsSync(SETTINGS_FILE)) {
        const CFG_DATA = JSON.parse( fs.readFileSync(SETTINGS_FILE, 'utf8') );
        DISCORD_TOK = CFG_DATA.discord_token;
        WITAPIKEY = CFG_DATA.wit_ai_token;
        SPOTIFY_TOKEN_ID = CFG_DATA.spotify_token_id;
        SPOTIFY_TOKEN_SECRET = CFG_DATA.spotify_token_secret;
        MAX_TRESHOLD = parseInt(CFG_DATA.volume_treshold);
        PREFIX = CFG_DATA.prefix;
    } else {
        DISCORD_TOK = process.env.DISCORD_TOK;
        WITAPIKEY = process.env.WITAPIKEY;
        SPOTIFY_TOKEN_ID = process.env.SPOTIFY_TOKEN_ID;
        SPOTIFY_TOKEN_SECRET = process.env.SPOTIFY_TOKEN_SECRET;
        MAX_TRESHOLD = parseInt(process.env.VOLUME_TRESHOLD);
    }
    if (!DISCORD_TOK || !WITAPIKEY)
        throw 'failed loading config #113 missing keys!'

}
loadConfig()

const https = require('https')
function listWitAIApps(cb) {
    const options = {
      hostname: 'api.wit.ai',
      port: 443,
      path: '/apps?offset=0&limit=100',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+WITAPIKEY,
      },
    }

    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      });
      res.on('end',function() {
        cb(JSON.parse(body))
      })
    })

    req.on('error', (error) => {
      console.error(error)
      cb(null)
    })
    req.end()
}
function updateWitAIAppLang(appID, lang, cb) {
    const options = {
      hostname: 'api.wit.ai',
      port: 443,
      path: '/apps/' + appID,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+WITAPIKEY,
      },
    }
    const data = JSON.stringify({
      lang
    })

    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      });
      res.on('end',function() {
        cb(JSON.parse(body))
      })
    })
    req.on('error', (error) => {
      console.error(error)
      cb(null)
    })
    req.write(data)
    req.end()
}

//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////

var welcomeChannel;
var rulechannel;
var acceptmsg;

const Discord = require('discord.js')
const DISCORD_MSG_LIMIT = 2000;
const discordClient = new Discord.Client()
discordClient.on('ready', () => {
  console.log(`Logged in as ${discordClient.user.tag}!`);
  var butler = new Butler(discordClient);
  discordClient.user.setActivity("by RedTech", {
    type: 'PLAYING'
  });
})
if (!testMode) {
  discordClient.login(DISCORD_TOK);
} else {
  discordClient.login("test-id");
}

var _CMD_HELP        = PREFIX + 'help';
var _CMD_JOIN        = PREFIX + 'join';
var _CMD_LEAVE       = PREFIX + 'leave';
var _CMD_PLAY        = PREFIX + 'play';
var _CMD_PAUSE       = PREFIX + 'pause';
var _CMD_RESUME      = PREFIX + 'resume';
var _CMD_SHUFFLE     = PREFIX + 'shuffle';
var _CMD_FAVORITE    = PREFIX + 'favorite';
var _CMD_UNFAVORITE  = PREFIX + 'unfavorite';
var _CMD_FAVORITES   = PREFIX + 'favorites';
var _CMD_GENRE       = PREFIX + 'genre';
var _CMD_GENRES      = PREFIX + 'genres';
var _CMD_CLEAR       = PREFIX + 'clear';
var _CMD_RANDOM      = PREFIX + 'random';
var _CMD_SKIP        = PREFIX + 'skip';
var _CMD_QUEUE       = PREFIX + 'list';
var _CMD_DEBUG       = PREFIX + 'debug';
var _CMD_TEST        = PREFIX + 'hello';
var _CMD_PREFIX      = PREFIX + 'prefix';
var _CMD_LANG        = PREFIX + 'lang';
var _CMD_QUEUE_REMOVE= PREFIX + 'remove';
var _CMD_NP          = PREFIX + 'np';
var _CMD_VOLUME      = PREFIX + 'volume';
var _CMD_LOOP        = PREFIX + 'loopqueue';
var _CMD_VOL_TRESHOLD= PREFIX + 'maxvol';
var _CMD_EXPORT      = PREFIX + 'export';
var _CMD_IMPORT      = PREFIX + 'import';
var _CMD_KAMAZ       = PREFIX + 'kamaz';
var PLAY_CMDS = [_CMD_PLAY, _CMD_PAUSE, _CMD_RESUME, _CMD_SHUFFLE, _CMD_SKIP, _CMD_GENRE, _CMD_GENRES, _CMD_RANDOM, _CMD_CLEAR, _CMD_QUEUE, _CMD_FAVORITE, _CMD_FAVORITES, _CMD_UNFAVORITE];

function reloadCommands() {
  _CMD_HELP        = PREFIX + 'help';
  _CMD_JOIN        = PREFIX + 'join';
  _CMD_LEAVE       = PREFIX + 'leave';
  _CMD_PLAY        = PREFIX + 'play';
  _CMD_PAUSE       = PREFIX + 'pause';
  _CMD_RESUME      = PREFIX + 'resume';
  _CMD_SHUFFLE     = PREFIX + 'shuffle';
  _CMD_FAVORITE    = PREFIX + 'favorite';
  _CMD_UNFAVORITE  = PREFIX + 'unfavorite';
  _CMD_FAVORITES   = PREFIX + 'favorites';
  _CMD_GENRE       = PREFIX + 'genre';
  _CMD_GENRES      = PREFIX + 'genres';
  _CMD_CLEAR       = PREFIX + 'clear';
  _CMD_RANDOM      = PREFIX + 'random';
  _CMD_SKIP        = PREFIX + 'skip';
  _CMD_QUEUE       = PREFIX + 'list';
  _CMD_DEBUG       = PREFIX + 'debug';
  _CMD_TEST        = PREFIX + 'hello';
  _CMD_PREFIX      = PREFIX + 'prefix';
  _CMD_LANG        = PREFIX + 'lang';
  _CMD_QUEUE_REMOVE= PREFIX + 'remove';
  _CMD_NP          = PREFIX + 'np';
  _CMD_VOLUME      = PREFIX + 'volume';
  _CMD_LOOP        = PREFIX + 'loopqueue';
  _CMD_VOL_TRESHOLD= PREFIX + 'maxvol';
  _CMD_EXPORT      = PREFIX + 'export';
  _CMD_IMPORT      = PREFIX + 'import';
  _CMD_KAMAZ       = PREFIX + 'kamaz';
  PLAY_CMDS = [_CMD_PLAY, _CMD_PAUSE, _CMD_RESUME, _CMD_SHUFFLE, _CMD_SKIP, _CMD_GENRE, _CMD_GENRES, _CMD_RANDOM, _CMD_CLEAR, _CMD_QUEUE, _CMD_FAVORITE, _CMD_FAVORITES, _CMD_UNFAVORITE];
}

const EMOJI_GREEN_CIRCLE = '✅';
const EMOJI_RED_CIRCLE = '❌';

const GENRES = {
    'hip-hop': ['hip-hop', 'hip hop', 'hiphop', 'rap'],
    'rock': ['rock'],
    'dance': ['dance'],
    'trance': ['techno'],
    'trance': ['trance'],
    'groove': ['groove'],
    'classical': ['classical'],
    'techno': ['techno'],

}

const guildMap = new Map();

function Butler(discordClient) {

function chunk_string(msg, limit) {
  if (msg.length >= limit) {
    let loop = Math.ceil(msg.length / limit);
    console.log(loop);
    let chunks = [];

    for (let i = 0; i < loop; i++) {
      chunks.push('```' + msg.substr(i * limit, ((i + 1) * limit) - 1) + '```');
    }
    console.log(chunks);
    return chunks;
  }
  return ["```" + msg + "```"];
}

function getUserFromMention(mention) {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return client.users.cache.get(mention);
	}
}

  discordClient.on('message', async (msg) => {
      if (msg.content == "!exit butler") {
        var perms = msg.member.roles.cache.some(role => role.name === 'Botmanager');
    		if (perms) {
    			msg.delete();
    			discordClient.destroy();
    	    throw 'stop';
    		} else {
    			msg.channel.send("Dir fehlen leider die Berechtigungen <@" + msg.author.id + ">!");
    		}
      } else if (msg.content.startsWith("!unlock")) {
    		if (msg.member.hasPermission("ADMIN")) {
          var mentions = msg.mentions;
          if (!mentions) {} else {
            var member = mentions.members.first();
            console.log(member);
            var role = member.guild.roles.cache.find(role => role.name === 'everyone');
            member.roles.add(role);
            msg.delete();
          }
        } else {
          msg.author.send("Du hast nicht genügend Berechtigungen um das zu tun!");
          msg.delete();
        }
      }
      try {
          if (!('guild' in msg) || !msg.guild) return; // prevent private messages to bot
          const mapKey = msg.guild.id;
          if (msg.content.trim().toLowerCase() == _CMD_JOIN) {
              if (!msg.member.voice.channelID) {
                  msg.reply('Error: please join a voice channel first.')
              } else {
                  if (!guildMap.has(mapKey))
                      await connect(msg, mapKey)
                  else
                      msg.reply('Already connected')
              }
          } else if (msg.content.trim().toLowerCase() == _CMD_LEAVE) {
              if (guildMap.has(mapKey)) {
                  let val = guildMap.get(mapKey);
                  if (val.voice_Channel) val.voice_Channel.leave()
                  if (val.voice_Connection) val.voice_Connection.disconnect()
                  if (val.musicYTStream) val.musicYTStream.destroy()
                      guildMap.delete(mapKey)
                  msg.reply("Disconnected.")
              } else {
                  msg.reply("Cannot leave because not connected.")
              }
          }
          else if ( PLAY_CMDS.indexOf( msg.content.trim().toLowerCase().split('\n')[0].split(' ')[0] ) >= 0 ) {
              if (!msg.member.voice.channelID) {
                  msg.reply('Error: please join a voice channel first.')
              } else {
                  if (!guildMap.has(mapKey))
                      await connect(msg, mapKey)
                  music_message(msg, mapKey);
              }
          } else if (msg.content.trim().toLowerCase() == _CMD_HELP) {
              msg.reply(getHelpString());
          }
          else if (msg.content.trim().toLowerCase() == _CMD_DEBUG) {
              console.log('toggling debug mode')
              let val = guildMap.get(mapKey);
              if (val.debug)
                  val.debug = false;
              else
                  val.debug = true;
          }
          else if (msg.content.trim().toLowerCase() == _CMD_TEST) {
              msg.reply('hello back =)')
          }
          else if (msg.content.split('\n')[0].split(' ')[0].trim().toLowerCase() == _CMD_LANG) {
              const lang = msg.content.replace(_CMD_LANG, '').trim().toLowerCase()
              listWitAIApps(data => {
                if (!data.length)
                  return msg.reply('no apps found! :(')
                for (const x of data) {
                  updateWitAIAppLang(x.id, lang, data => {
                    if ('success' in data)
                      msg.reply('success!')
                    else if ('error' in data && data.error !== 'Access token does not match')
                      msg.reply('Error: ' + data.error)
                  })
                }
              })
          } else if (msg.content.split(' ')[0].trim().toLowerCase() == _CMD_QUEUE_REMOVE) {
            const args = msg.content.split(' ');
            if (parseInt(args[1]) != NaN) {
              let val = guildMap.get(mapKey);
              console.log(val.musicQueue + args[1]);
              var tmp = [];
              var song;
              val.musicQueue.forEach((item, i) => {
                if (i != args[1]) {
                  tmp.push(item);
                } else {
                  song = item;
                }
              });
              val.musicQueue = tmp;
              if (song.title != undefined) {
                msg.channel.send("Successfully removed **" + song.title + "**!");
                msg.react(EMOJI_GREEN_CIRCLE);
              } else {
                msg.channel.send("Position in queue not found!");
                msg.react(EMOJI_RED_CIRCLE);
              }
            } else {
              msg.channel.send("Error removing song **" + msg.content.split(' ')[1] + "** from list!");
              msg.react(EMOJI_RED_CIRCLE);
            }
          } else if (msg.content.trim().toLowerCase() == _CMD_NP) {
            let val = guildMap.get(mapKey);
            if (val.currentPlayingTitle != undefined) {
              msg.channel.send("Current playing: **" + val.currentPlayingTitle + "**");
              msg.react(EMOJI_GREEN_CIRCLE);
            } else {
              msg.channel.send("There's currently nothing playing!");
              msg.react(EMOJI_GREEN_CIRCLE);
            }
          } else if (msg.content.trim().toLowerCase() == _CMD_VOLUME + " up") {
            let val = guildMap.get(mapKey);
            val.volume = val.volume + 0.25;
            val.musicDispatcher.setVolume(val.volume);
            msg.channel.send("Set the volume to " + (val.volume * 100) + "%");
            msg.react(EMOJI_GREEN_CIRCLE);
          } else if (msg.content.trim().toLowerCase() == _CMD_VOLUME + " down") {
            let val = guildMap.get(mapKey);
            if (val.volume >= 0.25) {
              val.volume = val.volume - 0.25;
              val.musicDispatcher.setVolume(val.volume);
              msg.channel.send("Set the volume to " + (val.volume * 100) + "%");
              msg.react(EMOJI_GREEN_CIRCLE);
            } else {
              msg.react(EMOJI_RED_CIRCLE);
              msg.channel.send("cannot turn the volume down anymore");
            }
          } else if (msg.content.trim().toLowerCase().split(' ')[0] + " " + msg.content.trim().toLowerCase().split(' ')[1] == _CMD_VOLUME + " set") {
            var arg = msg.content.trim().toLowerCase().split(' ')[2];
            let val = guildMap.get(mapKey);
            val.volume = (arg / 100);
            val.musicDispatcher.setVolume(val.volume);
            msg.channel.send("Set volume to **" + (val.volume * 100) + "%**!");
            msg.react(EMOJI_GREEN_CIRCLE);
          } else if (msg.content.trim().toLowerCase() == _CMD_VOLUME) {
            let val = guildMap.get(mapKey);
            msg.channel.send("The colume is currently set to " + (val * 100) + "%.");
            msg.react(EMOJI_GREEN_CIRCLE);
          } else if (msg.content.trim().toLowerCase() == _CMD_LOOP) {
            let val = guildMap.get(mapKey);
            if (val.loop) {
              val.loop = false;
              msg.channel.send("Loopqueue **disabled**!");
              msg.react(EMOJI_GREEN_CIRCLE);
            } else {
              val.loop = true;
              msg.channel.send("Loopqueue **enabled**!");
              msg.react(EMOJI_GREEN_CIRCLE);
            }
          } else if (msg.content.trim().toLowerCase().split(" ")[0] == _CMD_VOL_TRESHOLD) {
            if (msg.content.trim().toLowerCase().split(" ").length > 1) {
              var args = msg.content.trim().toLowerCase().split(" ").slice(1, msg.content.trim().toLowerCase().split(" ").length);
              MAX_TRESHOLD = parseInt(args[0]);
              var settings;
              if (fs.existsSync('./settings.json')) {
                  const data = fs.readFileSync('./settings.json', 'utf8');
                  settings = JSON.parse(data);
              }
              settings.volume_treshold = args[0];
              var json = JSON.stringify(settings);
              fs.writeFile('./settings.json', json, 'utf8', (err)=>{
                  if (err) return console.log('SETTINGS_WRITE: ' + err);
              });
              msg.react(EMOJI_GREEN_CIRCLE);
              msg.channel.send("Set the maximum volume for users to: " + args[0]);
            } else {
              msg.react(EMOJI_GREEN_CIRCLE);
              msg.channel.send("The maximum volume is currently set to: " + MAX_TRESHOLD);
            }
          } else if (msg.content.toLowerCase().startsWith(_CMD_EXPORT)) {
            let val = guildMap.get(mapKey);
            var queueData = {};
            queueData.loop = val.loop;
            queueData.queue = val.musicQueue;
            queueData.np = val.currentPlayingId;
            let chunks = chunk_string(JSON.stringify(queueData), 1990);
            chunks.forEach((chunk, i) => {
              msg.channel.send(chunk);
            });
            console.log(val);
          } else if (msg.content.toLowerCase().startsWith(_CMD_IMPORT)) {
            let val = guildMap.get(mapKey);
          } else if (msg.content.toLowerCase().startsWith(_CMD_PREFIX)) {
            var args = msg.content.split(" ");
            if (args.length > 1) {
              PREFIX = args[1];

              var settings;
              if (fs.existsSync('./settings.json')) {
                  const data = fs.readFileSync('./settings.json', 'utf8');
                  settings = JSON.parse(data);
              }
              settings.prefix = PREFIX;
              var json = JSON.stringify(settings);
              fs.writeFile('./settings.json', json, 'utf8', (err)=>{
                  if (err) return console.log('SETTINGS_WRITE_PREFIX: ' + err);
              });
              reloadCommands();
              msg.react(EMOJI_GREEN_CIRCLE);
              msg.channel.send("Set prefix for commands to: " + PREFIX);
            }
          }
      } catch (e) {
          console.log('discordClient message: ' + e)
          msg.reply('Error#180: Something went wrong, try again or contact the developers if this keeps happening.');
      }
  });

  discordClient.on('voiceStateUpdate', (oldMember, newMember) => {
     let newUserChannel = newMember.channelID;
     let oldUserChannel = oldMember.channelID;

     //console.log(discordClient);

     if (newMember.id != discordClient.user.id) {
       /*var val = guildMap.get(mapKey);

       if (newUserChannel === val.voice_Channel && val.voice_Channel != undefined) {} else{
         const channels = message.guild.channels.filter(c => c.parentID === val.voice_Channel && c.type === 'voice');

         for (const [channelID, channel] of channels) {
           console.log(channel.members);
           for (const [memberID, member] of channel.members) {

           }
         }
       }*/
     }
  });

  return this;
}

function getHelpString() {
    let out = '**VOICE COMMANDS:**\n'
        out += '```'
        out += 'music help\n'
        out += 'music play [random, favorites, <genre> or query]\n'
        out += 'music skip\n'
        out += 'music pause/resume\n'
        out += 'music shuffle\n'
        out += 'music genres\n'
        out += 'music set favorite\n'
        out += 'music favorites\n'
        out += 'music list\n'
        out += 'music clear list\n';
        out += 'music now playing\n'
        out += 'music volume [up/down]\n';
        out += 'music loop\n';
        out += '```'

        out += '**TEXT COMMANDS:**\n'
        out += '```'
        out += _CMD_HELP + '\n'
        out += _CMD_JOIN + '/' + _CMD_LEAVE + '\n'
        out += _CMD_PLAY + ' [query]\n'
        out += _CMD_GENRE + ' [name]\n'
        out += _CMD_RANDOM + '\n'
        out += _CMD_PAUSE + '/' + _CMD_RESUME + '\n'
        out += _CMD_SKIP + '\n'
        out += _CMD_SHUFFLE + '\n'
        out += _CMD_FAVORITE + '\n'
        out += _CMD_UNFAVORITE + ' [name]\n'
        out += _CMD_FAVORITES + '\n'
        out += _CMD_GENRES + '\n'
        out += _CMD_QUEUE + '\n';
        out += _CMD_CLEAR + '\n';
        out += _CMD_QUEUE_REMOVE + ' [position]\n';
        out += _CMD_NP + '\n';
        out += _CMD_VOLUME + ' up/down/set\n';
        out += _CMD_PREFIX + '\n';
        out += _CMD_LOOP + '\n';
        out += _CMD_EXPORT + '\n';
        out += _CMD_IMPORT + '\n';
        out += '```'
    return out;
}

async function demute(user) {
  setTimeout(() => {
    user.voice.setMute(false);
  }, 5000);
}

async function connect(msg, mapKey) {
    try {
        let voice_Channel = await discordClient.channels.fetch(msg.member.voice.channelID);
        if (!voice_Channel) return msg.reply("Error: The voice channel does not exist!");
        let text_Channel = await discordClient.channels.fetch(msg.channel.id);
        if (!text_Channel) return msg.reply("Error: The text channel does not exist!");
        let voice_Connection = await voice_Channel.join();
        voice_Connection.play('sound.mp3', { volume: 0.5 });
        guildMap.set(mapKey, {
            'text_Channel': text_Channel,
            'voice_Channel': voice_Channel,
            'voice_Connection': voice_Connection,
            'channel': msg.channel,
            'colume': 1,
            'loop': false,
            'musicQueue': [],
            'musicDispatcher': null,
            'musicYTStream': null,
            'currentPlayingTitle': null,
            'currentPlayingQuery': null,
            'debug': false,
        });
        speak_impl(voice_Connection, mapKey)
        voice_Connection.on('disconnect', async(e) => {
            if (e) console.log(e);
            guildMap.delete(mapKey);
        })
        msg.reply('connected!')
    } catch (e) {
        console.log('connect: ' + e)
        msg.reply('Error: unable to join your voice channel.');
        throw e;
    }
}

function speak_impl(voice_Connection, mapKey) {
    voice_Connection.on('speaking', async (user, speaking) => {
        if (speaking.bitfield == 0 || user.bot) {
            return
        }
        console.log(`I'm listening to ${user.username}`)
        // this creates a 16-bit signed PCM, stereo 48KHz stream
        const audioStream = voice_Connection.receiver.createStream(user, { mode: 'pcm' })
        audioStream.on('error',  (e) => {
            console.log('audioStream: ' + e)
        });
        let buffer = [];
        audioStream.on('data', (data) => {
          /*var inputData = data;
          var inputDataLength = inputData.length;
          var total = 0;

          for (var i = 0; i < inputDataLength; i++) {
              total += Math.abs(inputData[i++]);
          }

          var rms = Math.sqrt(total / inputDataLength);
          if (rms*100 > MAX_TRESHOLD) {
            voice_Connection.channel.members.forEach((member, i) => {
              if (member.id == user.id) {
                member.voice.setMute(true);
                demute(member);
              }
            });
          }*/
          buffer.push(data);
        });
        audioStream.on('end', async () => {
            buffer = Buffer.concat(buffer)
            const duration = buffer.length / 48000 / 4;
            console.log("duration: " + duration)

            if (duration < 1.0 || duration > 19) { // 20 seconds max dur
                console.log("TOO SHORT / TOO LONG; SKPPING")
                return;
            }

            try {
                let new_buffer = await convert_audio(buffer)
                let out = await transcribe(new_buffer);
                if (out != null && out != "hey butler" && out != "music off") {
                  process_commands_query(out, mapKey, user.id);
                } else if (out == "hey butler") {
                  user.send("Hey, was geht? ;)");
                } else if (out == "music off") {
                  const val = guildMap.get(mapKey);
                  val.text_Channel.send(".pause")
                }
            } catch (e) {
                console.log('tmpraw rename: ' + e)
            }
        });
    })
}

function process_commands_query(query, mapKey, userid) {
    if (!query || !query.length)
        return;

    let out = null;

    const regex = /^music ([a-zA-Z]+)(.+?)?$/;
    const m = query.toLowerCase().match(regex);
    if (m && m.length) {
        const cmd = (m[1]||'').trim();
        const args = (m[2]||'').trim();

        switch(cmd) {
            case 'help':
                out = _CMD_HELP;
                break;
            case 'skip':
                out = _CMD_SKIP;
                break;
            case 'shuffle':
                out = _CMD_SHUFFLE;
                break;
            case 'genres':
                out = _CMD_GENRES;
                break;
            case 'pause':
                out = _CMD_PAUSE;
                break;
            case 'resume':
                out = _CMD_RESUME;
                break;
            case 'clear':
                if (args == 'list')
                    out = _CMD_CLEAR;
                break;
            case 'list':
                out = _CMD_QUEUE;
                break;
            case 'hello':
                out = 'hello back =)'
                break;
            case 'favorites':
                out = _CMD_FAVORITES;
                break;
            case 'set':
                switch (args) {
                    case 'favorite':
                    case 'favorites':
                        out = _CMD_FAVORITE;
                        break;
                }
                break;
            case 'now':
                if (args == 'playing') {
                  let val = guildMap.get(mapKey);
                  if (val.currentPlayingTitle != undefined) {
                    val.channel.send("Currently playing **" + val.currentPlayingTitle + "**", {tts: true});
                  } else {
                    val.channel.send("No song playing", {tts: true});
                  }
                  out = "";
                }
                break;
            case 'volume':
                if (args == 'down') {
                  out = _CMD_VOLUME + " down";
                } else if (args == 'up') {
                  out = _CMD_VOLUME + " up";
                } else {
                  let val = guildMap.get(mapKey);
                  out = "The volume is currently set to " + (val.volume * 100) + "%.";
                }
                break;
            case 'loop':
                out = _CMD_LOOP;
                break;
            case 'play':
            case 'player':
                switch(args) {
                    case 'random':
                        out = _CMD_RANDOM;
                        break;
                    case 'favorite':
                    case 'favorites':
                        out = _CMD_PLAY + ' ' + 'favorites';
                        break;
                    default:
                        for (let k of Object.keys(GENRES)) {
                            if (GENRES[k].includes(args)) {
                                out = _CMD_GENRE + ' ' + k;
                            }
                        }
                        if (out == null) {
                            out = _CMD_PLAY + ' ' + args;
                        }
                }
                break;
        }
        if (out == null)
            out = '<bad command: ' + query + '>';
    }
    if (out != null && out.length) {
        // out = '<@' + userid + '>, ' + out;
        console.log('text_Channel out: ' + out)
        const val = guildMap.get(mapKey);
        val.text_Channel.send(out)
    }
}

async function music_message(message, mapKey) {
    let replymsgs = [];
    const messes = message.content.split('\n');
    for (let mess of messes) {
        const args = mess.split(' ');

        if (args[0] == _CMD_PLAY && args.length) {
            const qry = args.slice(1).join(' ');
            if (qry == 'favorites') {
                // play guild's favorites
                if (mapKey in GUILD_FAVORITES) {
                    let arr = GUILD_FAVORITES[mapKey];
                    arr = shuffle(arr);
                    if (arr.length) {
                        for (let item of arr) {
                          if (item in YT_CACHE) {
                            const val = YT_CACHE[item];
                            let now = Math.floor(new Date());
                            const dt = now - val.created;
                            if (dt < 1000*60*60*24*14) { // 14 days ttl
                              console.log('cache hit: ' + item)
                              addToQueue({title: val.title, id: val.id}, mapKey);
                            } else {
                              console.log('cache expired: ' + item);
                              var tmp = await getByID(item);
                              var data = {title: tmp.title, id: item};
                              addToQueue(data, mapKey);
                            }
                          } else {
                            var tmp = await getByID(item);
                            var data = {title: tmp.title, id: item};
                            addToQueue(data, mapKey);
                          }
                        }
                        message.channel.send("Added successfully **" + arr.length + "** songs to this queue!");
                        message.react(EMOJI_GREEN_CIRCLE)
                    } else {
                        message.channel.send('No favorites yet.')
                        message.react(EMOJI_RED_CIRCLE);
                    }
                } else {
                    message.channel.send('No favorites yet.')
                    message.react(EMOJI_RED_CIRCLE);
                }
            } else if (isSpotify(qry)) {
                try {
                    message.channel.send("Processing spotify playlist...");
                    var start = new Date();
                    const arr = await spotify_tracks_from_playlist(qry);
                    message.channel.send("...Finished! (" + (new Date().getTime() - start.getTime()) + "ms) Adding to queue...");
                    console.log(arr.length + ' spotify items from playlist')
                    for (let item of arr)
                        addToQueue(item, mapKey);
                    message.channel.send("...added Songs to queue.");
                    message.react(EMOJI_GREEN_CIRCLE)
                } catch(e) {
                    console.log('music_message 464:' + e)
                    message.channel.send('Failed processing spotify link: ' + qry);
                }
            } else {
                if (isYoutube(qry) && isYoutubePlaylist(qry)) {
                    try {
                        await youtube_tracks_from_playlist(qry, false, (arr) => {
                          message.channel.send("Searching Videos..");
                          arr.forEach((item, i) => {
                            console.log("arr", item);
                            getByID(item).then((data) => {
                              console.log(data);
                              if (guildMap.get(mapKey).currentPlayingId != null) {
                                //getVideoDurationInSeconds('https://www.youtube.com/watch?v=' + data.id).then((duration) => {
                                  /*var embed = new Discord.MessageEmbed();
                                  embed.setTitle(data.title);
                                  embed.setURL("https://www.youtube.com/watch?v=" + data.id);
                                  embed.setAuthor('Added to queue', message.author.avatarUrl, 'https://discord.com/channels/' + message.author.id);
                                  message.channel.send(embed);*/
                                  message.channel.send("**" + data.title + "** - added to queue");
                              //  });
                              }
                              addToQueue(data, mapKey);
                              queueTryPlayNext(mapKey, (title) => {message.channel.send("Now playing: **" + title + "**")});
                              message.react(EMOJI_GREEN_CIRCLE);
                            });
                          });
                        });
                    } catch (e) {
                        console.log('music_message 476:' + e)
                        message.channel.send('Failed to process playlist: ' + qry);
                        message.react(EMOJI_RED_CIRCLE);
                    }
                } else {
                    try {
                        message.channel.send("Searching..");
                        getYoutubeVideoData(qry).then((data) => {
                          if (guildMap.get(mapKey).currentPlayingId != null) {
                            //getVideoDurationInSeconds('https://www.youtube.com/watch?v=' + data.id).then((duration) => {
                              /*var embed = new Discord.MessageEmbed();
                              embed.setTitle(data.title);
                              embed.setURL("https://www.youtube.com/watch?v=" + data.id);
                              embed.setAuthor('Added to queue', message.author.avatarUrl, 'https://discord.com/channels/' + message.author.id);
                              message.channel.send(embed);*/
                              message.channel.send("**" + data.title + "** - added to queue");
                          //  });
                          }
                          addToQueue(data, mapKey);
                          queueTryPlayNext(mapKey, (title) => {message.channel.send("Now playing: **" + title + "**")});
                          message.react(EMOJI_GREEN_CIRCLE)
                        });
                    } catch (e) {
                        console.log('music_message 484:' + e)
                        message.react(EMOJI_RED_CIRCLE);
                        message.channel.send('Failed to find video for (try again): ' + qry);
                    }
                }
            }
        } else if (args[0] == _CMD_KAMAZ) {
          message.channel.send(".play kamaz dj blyatman");
          message.react(EMOJI_GREEN_CIRCLE);
        } else if (args[0] == _CMD_SKIP) {

            skipMusic(mapKey, ()=>{
                message.react(EMOJI_GREEN_CIRCLE)
            }, (msg)=>{
                if (msg && msg.length) message.channel.send(msg);
            })

        } else if (args[0] == _CMD_PAUSE) {

            pauseMusic(mapKey, ()=>{
                message.react(EMOJI_GREEN_CIRCLE)
            }, (msg)=>{
                if (msg && msg.length) message.channel.send(msg);
            })

        } else if (args[0] == _CMD_RESUME) {

            resumeMusic(mapKey, ()=>{
                message.react(EMOJI_GREEN_CIRCLE)
            }, (msg)=>{
                if (msg && msg.length) message.channel.send(msg);
            })

        } else if (args[0] == _CMD_SHUFFLE) {

            shuffleMusic(mapKey, ()=>{
                message.react(EMOJI_GREEN_CIRCLE)
            }, (msg)=>{
                if (msg && msg.length) message.channel.send(msg);
            })

        } else if (args[0] == _CMD_CLEAR) {

            clearQueue(mapKey, ()=>{
                message.react(EMOJI_GREEN_CIRCLE)
            }, (msg)=>{
                if (msg && msg.length) message.channel.send(msg);
            })

        } else if (args[0] == _CMD_QUEUE) {

            const chunks = message_chunking(getQueueString(mapKey), DISCORD_MSG_LIMIT);
            for (let chunk of chunks) {
                console.log(chunk.length)
                message.channel.send(chunk);
            }
            message.react(EMOJI_GREEN_CIRCLE)

        } else if (args[0] == _CMD_RANDOM) {

            let arr = await spotify_new_releases();
            if (arr.length) {
                arr = shuffle(arr);
                // let item = arr[Math.floor(Math.random() * arr.length)];
                for (let item of arr)
                    addToQueue(item, mapKey);
                message.react(EMOJI_GREEN_CIRCLE)
            } else {
                message.channel.send('no results for random');
            }

        } else if (args[0] == _CMD_GENRES) {

            let out = "------------ genres ------------\n";
            for (let g of Object.keys(GENRES)) {
                out += g + '\n'
            }
            out += "--------------------------------\n";
            const chunks = message_chunking(out, DISCORD_MSG_LIMIT);
            for (let chunk of chunks)
                message.channel.send(chunk);

        } else if (args[0] == _CMD_GENRE) {

            const genre = args.slice(1).join(' ').trim();
            let arr = await spotify_recommended(genre);
            if (arr.length) {
                arr = shuffle(arr);
                // let item = arr[Math.floor(Math.random() * arr.length)];
                for (let item of arr)
                    addToQueue(item, mapKey);
                message.react(EMOJI_GREEN_CIRCLE)
            } else {
                message.channel.send('no results for genre: ' + genre);
            }

        } else if (args[0] == _CMD_FAVORITES) {
            const favs = await getFavoritesString(mapKey);
            if (!(mapKey in GUILD_FAVORITES) || !GUILD_FAVORITES[mapKey].length)
                message.channel.send('No favorites to play.')
            else {
                const chunks = message_chunking(favs, DISCORD_MSG_LIMIT);
                for (let chunk of chunks) {
                  message.channel.send(chunk);
                  console.log(chunk);
                }
                message.react(EMOJI_GREEN_CIRCLE)
            }

        } else if (args[0] == _CMD_FAVORITE) {

            setAsFavorite(mapKey, ()=>{
                message.react(EMOJI_GREEN_CIRCLE)
            }, (msg)=> {
                if (msg && msg.length) message.channel.send(msg);
            })

        } else if (args[0] == _CMD_UNFAVORITE) {
            let val = guildMap.get(mapKey);
            if (val.currentPlayingId != undefined) {
              if (GUILD_FAVORITES[mapKey].includes(val.currentPlayingId)) {
                var tmp = [];
                GUILD_FAVORITES[mapKey].forEach((fav, i) => {
                  if (fav != val.currentPlayingId) {
                    tmp.push(fav);
                  }
                });
                GUILD_FAVORITES[mapKey] = tmp;
                message.channel.send("Removed **" + val.currentPlayingTitle + "** from your favorites!");
                message.react(EMOJI_GREEN_CIRCLE);
              } else {
                message.channel.send("The current song isn't a favorite.");
                message.reatc(EMOJI_RED_CIRCLE);
              }
            } else {
              message.channel.send("There's no song playing currently!");
              message.react(EMOJI_RED_CIRCLE);
            }
        }
    }

    queueTryPlayNext(mapKey, (title)=>{
        message.react(EMOJI_GREEN_CIRCLE);
        message.channel.send('Now playing: **' + title + '**')
    }, (msg)=>{
        if (msg && msg.length) message.channel.send(msg);
    });
}

let GUILD_FAVORITES = {};
const GUILD_FAVORITES_FILE = './data/guild_favorites.json';
setInterval(()=>{
    var json = JSON.stringify(GUILD_FAVORITES);
    fs.writeFile(GUILD_FAVORITES_FILE, json, 'utf8', (err)=>{
        if (err) return console.log('GUILD_FAVORITES_FILE:' + err);
    });
}, 1000);
function load_guild_favorites() {
    if (fs.existsSync(GUILD_FAVORITES_FILE)) {
        const data = fs.readFileSync(GUILD_FAVORITES_FILE, 'utf8');
        console.log(typeof data);
        GUILD_FAVORITES = JSON.parse(data);
    }
}
load_guild_favorites();

function setAsFavorite(mapKey, cbok, cberr) {
    let val = guildMap.get(mapKey);
    if (!val.currentPlayingTitle || !val.currentPlayingId)
        cberr('Nothing playing at the moment.')
    else {
        if (!(mapKey in GUILD_FAVORITES)) {
            GUILD_FAVORITES[mapKey] = [];
        }
        if (!GUILD_FAVORITES[mapKey].includes(val.currentPlayingId)) {
          GUILD_FAVORITES[mapKey].push(val.currentPlayingId)
          console.log("added" + GUILD_FAVORITES[mapKey]);
        }
        cbok()
    }
}
function unFavorite(qry, mapKey, cbok, cberr) {
    let val = guildMap.get(mapKey);
    qry = val.currentPlayingId;
    if (!qry || !qry.length)
        cberr('Invalid query.');
    else {
        if (!(mapKey in GUILD_FAVORITES)) {
            cberr('No favorites.');
        } else {
            if (GUILD_FAVORITES[mapKey].includes(qry)) {
                GUILD_FAVORITES[mapKey] = GUILD_FAVORITES[mapKey].filter(e => e !== qry);
                cbok()
            } else {
                cberr('Favorite not found.');
            }
        }
    }
}

async function getFavoritesString(mapKey) {
    let out = "------------ favorites ------------\n";
    if (mapKey in GUILD_FAVORITES) {
        let arr = GUILD_FAVORITES[mapKey];
        if (arr.length) {
            for (let item of arr) {
                const data = await getByID(item);
                out += "[" + i + "] " + data.title + '\n';
            }
        } else {
            out += '(empty)\n'
        }
    } else {
        out += '(empty)\n'
    }
    out += "-----------------------------------\n";
    return out;
}

function message_chunking(msg, MAXL) {
    const msgs = msg.split('\n');
    const chunks = [];

    let outmsg = '';
    while (msgs.length) {
        let a = msgs.shift() + '\n';
        if (a.length > MAXL) {
            console.log(a)
            throw new Error('error#418: max single msg limit');
        }

        if ((outmsg + a + 6).length <= MAXL) {
            outmsg += a;
        } else {
            chunks.push('```' + outmsg + '```')
            outmsg = ''
        }
    }
    if (outmsg.length) {
        chunks.push('```' + outmsg + '```')
    }
    return chunks;
}

function getQueueString(mapKey) {
    let val = guildMap.get(mapKey);
    let _message = "------------ queue ------------\n";
    if (val.currentPlayingTitle != null)
        _message += '[X] ' + val.currentPlayingTitle + '\n';
    for (let i = 0; i < val.musicQueue.length; i++) {
        _message += '['+i+'] ' + val.musicQueue[i].title + '\n';
    }
    if (val.currentPlayingTitle == null && val.musicQueue.length == 0)
        _message += '(empty)\n'
    _message += "---------------------------------\n";
    return _message;
}

async function queueTryPlayNext(mapKey, cbok, cberr) {
    try {
        let val = guildMap.get(mapKey);
        if (!val) {
            console.log('mapKey: ' + mapKey + ' no longer in guildMap')
            return
        }

        if (val.musicQueue.length == 0)
            return;
        if (val.currentPlayingTitle)
            return;

        const tmp = val.currentPlayingVid;
        const data = val.musicQueue.shift();
        if (val.loop) val.musicQueue.push(tmp);
        //const data = await getYoutubeVideoData(qry)
        const ytid = data.id;
        const title = data.title;

        // lag or stuttering? try this first!
        // https://groovy.zendesk.com/hc/en-us/articles/360023031772-Laggy-Glitchy-Distorted-No-Audio
        val.currentPlayingVid = data;
        val.currentPlayingTitle = title;
        val.currentPlayingId = ytid;
        val.volume = 1;
        //val.currentPlayingQuery = qry;
        val.musicYTStream = ytdl('https://www.youtube.com/watch?v=' + ytid, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1024*1024*10, // 10mb
            requestOptions: {
              headers: {
                "Cookie": "ID=" + new Date().getTime()
              }
            }
        }, {highWaterMark: 1})
        val.musicDispatcher = val.voice_Connection.play(val.musicYTStream);
        val.musicDispatcher.on('finish', () => {
            val.currentPlayingTitle = val.currentPlayingId = null;
            queueTryPlayNext(mapKey, cbok, cberr);
        });
        val.musicDispatcher.on('error', (err) => {
            if (err) console.log('musicDispatcher error: ' + err);
            console.log(err)
            cberr('Error playing <'+title+'>, try again?')
            val.currentPlayingTitle = val.currentPlayingQuery = null;
            queueTryPlayNext(mapKey, cbok, cberr);
        });
        val.musicDispatcher.on('start', () => {
            cbok(title)
        });

    } catch (e) {
        console.log('queueTryPlayNext: ' + e)
        cberr('Error playing, try again?')
        if (typeof val !== 'undefined') {
            val.currentPlayingTitle = val.currentPlayingQuery = null;
            if (val.musicDispatcher) val.musicDispatcher.end();
        }
    }

}

function addToQueue(data, mapKey) {
    let val = guildMap.get(mapKey);
    if (val.currentPlayingTitle == data.title || val.currentPlayingQuery == data.title || val.musicQueue.includes(data.title)) {
      val.musicQueue.push(data);
        console.log('Warning: Duplicate');
    } else {
        val.musicQueue.push(data);
    }
}


function skipMusic(mapKey, cbok, cberr) {
    let val = guildMap.get(mapKey);
    if (!val.currentPlayingTitle) {
        cberr('Nothing to skip');
    } else {
        if (val.musicDispatcher) val.musicDispatcher.end();
        cbok()
    }
}

function pauseMusic(mapKey, cbok, cberr) {
    let val = guildMap.get(mapKey);
    if (!val.currentPlayingTitle) {
        cberr('Nothing to pause');
    } else {
        if (val.musicDispatcher) val.musicDispatcher.pause();
        cbok()
    }
}

function resumeMusic(mapKey, cbok, cberr) {
    let val = guildMap.get(mapKey);
    if (!val.currentPlayingTitle) {
        cberr('Nothing to resume');
    } else {
        if (val.musicDispatcher) {
          val.musicDispatcher.resume(); // because of a node.js bug: https://stackoverflow.com/questions/65908430/problem-with-broadcast-dispatcher-resume-function-discord-js-v12
          val.musicDispatcher.pause();
          val.musicDispatcher.resume();
        }
        cbok()
    }
}

function clearQueue(mapKey, cbok, cberr) {
    let val = guildMap.get(mapKey);
    val.musicQueue = [];
    if (val.musicDispatcher) val.musicDispatcher.end();
    cbok()
}

function shuffleMusic(mapKey, cbok, cberr) {
    let val = guildMap.get(mapKey);
    val.musicQueue = shuffle(val.musicQueue);
    cbok()
}

//////////////////////////////////////////
//////////////// SPEECH //////////////////
//////////////////////////////////////////
async function transcribe(buffer) {
  return transcribe_witai(buffer)
  //return transcribe_deepspeech(buffer);
  // return transcribe_gspeech(buffer)
}

// WitAI
let witAI_lastcallTS = null;
const witClient = require('node-witai-speech');
async function transcribe_witai(buffer) {
    try {
        // ensure we do not send more than one request per second
        if (witAI_lastcallTS != null) {
            let now = Math.floor(new Date());
            while (now - witAI_lastcallTS < 1000) {
                console.log('sleep')
                await sleep(100);
                now = Math.floor(new Date());
            }
        }
    } catch (e) {
        console.log('transcribe_witai 837:' + e)
    }

    try {
        console.log('transcribe_witai')
        const extractSpeechIntent = util.promisify(witClient.extractSpeechIntent);
        var stream = Readable.from(buffer);
        const contenttype = "audio/raw;encoding=signed-integer;bits=16;rate=48k;endian=little"
        var output = await extractSpeechIntent(WITAPIKEY, stream, contenttype)
        witAI_lastcallTS = Math.floor(new Date());
        if (!output.split) return "Nothing understood"
        output = JSON.parse("{" + output.split("}\r\n{")[output.split("}\r\n{").length - 1]);
        console.log(output)
        stream.destroy()
        if (output && '_text' in output && output._text.length)
            return output._text
        if (output && 'text' in output && output.text.length)
            return output.text
        return output;
    } catch (e) { console.log('transcribe_witai 851:' + e); console.log(e) }
}

const isUrlSafe = (char) => {
  return /[a-zA-Z0-9\-_~.]+/.test(char)
}

const urlEncodeBytes = (buf) => {
  let encoded = ''
  for (let i = 0; i < buf.length; i++) {
    const charBuf = Buffer.from('00', 'hex')
    charBuf.writeUInt8(buf[i])
    const char = charBuf.toString()
    // if the character is safe, then just print it, otherwise encode
    if (isUrlSafe(char)) {
      encoded += char
    } else {
      encoded += `%${charBuf.toString('hex').toUpperCase()}`
    }
  }
  return encoded
}

const urlDecodeBytes = (encoded) => {
  let decoded = Buffer.from('')
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === '%') {
      const charBuf = Buffer.from(`${encoded[i + 1]}${encoded[i + 2]}`, 'hex')
      decoded = Buffer.concat([decoded, charBuf])
      i += 2
    } else {
      const charBuf = Buffer.from(encoded[i])
      decoded = Buffer.concat([decoded, charBuf])
    }
  }
  return decoded
}
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////


//////////////////////////////////////////
//////////////// YOUTUBE /////////////////
//////////////////////////////////////////
let YT_CACHE = {};
const ytdl = require('ytdl-core');
const getYoutubeID = require('get-youtube-id');
var ytlist = require('youtube-playlist');
const yts = util.promisify(require('yt-search'))
const { getVideoDurationInSeconds } = require('get-video-duration');

const YT_API_KEY = "AIzaSyAmLg5XEztg9uw4nKNinTZtqZYcpcdvCx4";

const { google } = require('googleapis');
const youtube = google.youtube('v3');

ytlist = async (url, callback) => {
  let id = url.replace(/(.+?(playlist\?list=))/gi, "");
  console.log(id);
  youtube.playlistItems.list({
    key: YT_API_KEY,
    part: 'id,snippet',
    playlistId: id,
    maxResults: 50,
  }, (err, results) => {
    callback({err: err, res: results});
  });
}

async function searchYoutubeVideo(query) {
  if (query.match(/(\?v=)(.*)/gi)) {
    const r = await yts({ videoId: query.match(/(\?v=)(.*)/gi)[0].replace("?v=", "") });
    try {
        const videos = r.videos
        if (!videos.length) {
            console.log(query)
            throw new Error('videos empty array')
        }
        const playlists = r.playlists || r.lists
        const channels = r.channels || r.accounts
        return {id:videos[0].videoId, title:videos[0].title};
    } catch (e) {
        console.log(r)
        console.log('searchYoutubeVideo: ' + e)
        throw e;
    }
  } else {
    const r = await yts(query);
    try {
        const videos = r.videos
        if (!videos.length) {
            console.log(query)
            throw new Error('videos empty array')
        }
        const playlists = r.playlists || r.lists
        const channels = r.channels || r.accounts
        return {id:videos[0].videoId, title:videos[0].title};
    } catch (e) {
        console.log(r)
        console.log('searchYoutubeVideo: ' + e)
        throw e;
    }
  }
}

function isYoutube(str) {
    return str.toLowerCase().indexOf('youtube.com') > -1;
}
function isYoutubePlaylist(str) {
    return str.toLowerCase().indexOf('?list=') > -1 || str.toLowerCase().indexOf('&list=') > -1;
}

async function youtube_tracks_from_playlist(url, isretry=false, callback) {
    ytlist(url, (data) => {
      if (!data.err) {
        var arr = [];
        data.res.data.items.forEach((item, i) => {
          arr.push(item.snippet.resourceId.videoId);
        });
        callback(arr);
      } else if (!isretry) {
        console.log("retrying...");
        youtube_tracks_from_playlist(url, true, callback);
      }
    });
}

async function getYoutubeVideoData(str, isretry=false) {
    try {
        if (str in YT_CACHE) {
            const val = YT_CACHE[str];
            let now = Math.floor(new Date());
            const dt = now - val.created;
            if (dt < 1000*60*60*24*14) { // 14 days ttl
                console.log('cache hit: ' + str)
                return {id:val.id, title:val.title};
            } else {
                console.log('cache expired: ' + str)
            }
        } else {
            console.log('cache miss: ' + str)
        }

        let qry = str;
        if (isYoutube(str))
            qry = getYoutubeID(str);

        const data = await searchYoutubeVideo(qry);
        if (data && 'id' in data && 'title' in data) {
            YT_CACHE[str] = {id:data.id, title:data.title, created: Math.floor(new Date())};
        }
        return data;
    } catch (e) {
        if (!isretry) {
            console.log('2nd attempt')
            return getYoutubeVideoData(str, true);
        } else {
            console.log('getYoutubeVideoData: ' + e)
            throw new Error('unable to obtain video data');
        }
    }
}
async function getByID(id) {
  const video = await yts({videoId: id});
  return {id:video.videoId, title:video.title};
}

const YT_CACHE_FILE = './data/yt_cache.json';
setInterval(()=>{
    var json = JSON.stringify(YT_CACHE);
    fs.writeFile(YT_CACHE_FILE, json, 'utf8', (err)=>{
        if (err) return console.log('YT_CACHE_FILE: ' + err);
    });
},1000);
function load_yt_cache() {
    if (fs.existsSync(YT_CACHE_FILE)) {
        const data = fs.readFileSync(YT_CACHE_FILE, 'utf8');
        YT_CACHE = JSON.parse(data);
    }
}
load_yt_cache();
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////


//////////////////////////////////////////
//////////////// SPOTIFY /////////////////
//////////////////////////////////////////
const Spotify = require('node-spotify-api');
const spotifyClient = new Spotify({
    id: SPOTIFY_TOKEN_ID,
    secret: SPOTIFY_TOKEN_SECRET
});

function isSpotify(str) {
    return str.toLowerCase().indexOf('spotify.com') > -1;
}

function spotify_extract_trackname(item) {
    if ('artists' in item) {
        let name = '';
        for (let artist of item.artists) {
            name += ' ' + artist.name;
        }

        let title = item.name;
        let track = title + ' ' + name
        return track;
    } else if ('track' in item && 'artists' in item.track) {
        return spotify_extract_trackname(item.track);
    }
}

async function spotify_new_releases() {

    let arr = await spotifyClient
        .request('https://api.spotify.com/v1/browse/new-releases')
        .then(function(data) {
            let arr = [];
            if ('albums' in data) {
                for (let item of data.albums.items) {
                    let track = spotify_extract_trackname(item)
                    arr.push(track)
                }
            }
            return arr;
        })
        .catch(function(err) {
            console.error('spotify_new_releases: ' + err);
        });

    return arr;
}

async function spotify_recommended(genre) {

    let arr = await spotifyClient
        .request('https://api.spotify.com/v1/recommendations?seed_genres=' + genre)
        .then(function(data) {
            let arr = [];
            if ('tracks' in data) {
                for (let item of data.tracks) {
                    let track = spotify_extract_trackname(item)
                    arr.push(track)
                }
            }
            return arr;
        })
        .catch(function(err) {
            console.error('spotify_recommended: ' + err);
        });

    return arr;
}

async function spotify_tracks_from_playlist(spotifyurl) {
    const regex = /\/playlist\/(.+?)(\?.+)?$/;
    const found = spotifyurl.match(regex);
    const url = 'https://api.spotify.com/v1/playlists/' + found[1] + '/tracks';
    console.log(url)
    let arr = await spotifyClient
        .request(url)
        .then(async function(data) {
            let arr = [];
            if ('items' in data) {
                for (let item of data.items) {
                    let track = spotify_extract_trackname(item);
                    var data = await getYoutubeVideoData(track);
                    arr.push(data)
                }
            }
            return arr;
        })
        .catch(function(err) {
            console.error('spotify_tracks_from_playlist: ' + err);
        });

    return arr;
}
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////
