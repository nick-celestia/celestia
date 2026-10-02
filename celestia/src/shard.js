const { ShardingManager } = require('discord.js');
const env = require('./config/env');

const manager = new ShardingManager('./src/index.js', {
  token: env.token,
  totalShards: 'auto'
});

manager.on('shardCreate', (shard) => console.log(`Launched shard ${shard.id}`));
manager.spawn();
