const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");


const client = new Discord.Client();

const queue = new Map();

//ID DO CANAL DE COMANDOS DO SERVIDOR
const canalComandos = '403287104710377487';

client.once("ready", () => {
  console.log("Bot online!");
  //client.channels.cache.get(canalComandos).send(versao);
});

client.once("reconnecting", () => {
  console.log("Bot reconectando!");
});

client.once("disconnect", () => {
  console.log("Bot desconectado!");
});

//EMBED COM A VERSAO DO BOT
const versao = new Discord.MessageEmbed()
  .setColor('0099ff')
  .setAuthor('Bot online!')
  .setTitle('Bot de musica')
  .setDescription('Versao do bot:')
  .addField("1.0.2")
//-------------------------------------------------------

//EMBED DE COMANDOS DO BOT
const comandos = new Discord.MessageEmbed()
  .setColor("0x11ff00")
  .setTitle("Comandos do bot de musica:")
  .addField("----------------------------------", "👇")
  .addFields({ name: "&play (URL)", value: "Comeca a tocar uma musica / adiciona uma musica na fila de producao (FUNCIONA APENAS COM LINKS)" })
  .addFields({ name: "&skip", value: "Pula a musica tocando no momento" })
  .addFields({ name: "&stop", value: "Para de tocar musica :(" })
  .addField("👆", "----------------------------------")
//---------------------------------------------------------

client.on("message", async message => {

  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  if (message.channel.id !== canalComandos) {
    message.channel.send("Voce nao pode digitar comandos nesse canal!");
    return;
  }

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}versao`)) {
    message.channel.send(versao);
  } else if (message.content.startsWith(`${prefix}comandos`)) {
    message.channel.send(comandos);
  } else {
    message.channel.send("Digitou o comando errado!");
  }
});

async function execute(message, serverQueue) {

  const args = message.content.split(" ");

  //VERIFICAR SE O LINK PASSADO EH VALIDO
  let validate = ytdl.validateURL(args[1]);
  if (!validate) return message.channel.send('Link Invalido!');
  //---------------------------------------

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "Precisa entrar em um canal de voz pra tocar a musica!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "Permission denied (publickey)!"
    );
  }

  const songInfo = await ytdl.getInfo(args[1]);

  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    }
    catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send("deu erro!" + err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} Foi adicionada a fila de reproducao!`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Precisa entrar em um canal de voz pra pular a musica bobao!"
    );
  if (!serverQueue)
    return message.channel.send("Nao tem nenhuma musica pra pular!");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Precisa entrar em um canal de voz pra parar a musica bobao!"
    );

  if (!serverQueue)
    return message.channel.send("Nao tem nenhuma musica pra parar!");

  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Tocando agora: **${song.title}**`);
}

client.login(token);