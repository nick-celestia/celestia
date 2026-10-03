module.exports = {
  name: 'ping',
  aliases: [],
  description: 'Check bot latency.',
  async execute({ message }) {
    await message.reply(`Pong! ${message.client.ws.ping}ms`);
  }
};
