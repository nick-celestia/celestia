const { EmbedBuilder }    = require('discord.js');
const UserSpirit          = require('../../models/UserSpirit');
const { getOrCreateUser } = require('../../services/userService');
const { RARITIES }        = require('../../config/game');

const SELL_VALUES = {
  Common:3,Uncommon:8,Rare:25,Epic:75,Custom:150,Legendary:350,Mythic:1000,Celestial:3000,Ascended:9999
};

module.exports = {
  name:'sell',aliases:[],
  description:'Sell spirits by ID, rarity, or duplicates.',
  async execute({message,args,prefix}){
    const user=await getOrCreateUser(message.author.id);
    if(!args[0])return message.reply(`**Usage:**\n\`${prefix}sell <id>\` \`${prefix}sell duplicates\` \`${prefix}sell common\` \`${prefix}sell common uncommon\``);
    const sub=args[0].toLowerCase();
    const teamIds=[user.team.slot1,user.team.slot2,user.team.slot3].filter(Boolean);

    if(sub==='duplicates'||sub==='dupes'){
      const all=await UserSpirit.find({ownerId:message.author.id,locked:{$ne:true}}).populate('spirit').sort({createdAt:1});
      const seen=new Map(),toSell=[];
      for(const us of all){
        if(teamIds.includes(us.shortId))continue;
        const k=us.spirit._id.toString();
        if(seen.has(k))toSell.push(us); else seen.set(k,true);
      }
      if(!toSell.length)return message.reply('No duplicates to sell.');
      const total=toSell.reduce((s,us)=>s+(SELL_VALUES[us.spirit.tier]||3),0);
      await UserSpirit.deleteMany({_id:{$in:toSell.map(u=>u._id)}});
      user.mana+=total;await user.save();
      return message.reply({embeds:[new EmbedBuilder().setColor(0x2ECC71).setTitle('💰 Duplicates Sold').addFields({name:'Sold',value:`**${toSell.length}**`,inline:true},{name:'Mana',value:`**+${total}**`,inline:true},{name:'Total',value:`**${user.mana}**`,inline:true})]});
    }

    const rarityArgs=args.map(a=>RARITIES.find(r=>r.toLowerCase()===a.toLowerCase())).filter(Boolean);
    if(rarityArgs.length>0){
      const isConfirm=args[args.length-1]?.toLowerCase()==='confirm';
      const toSell=(await UserSpirit.find({ownerId:message.author.id,locked:{$ne:true},shortId:{$nin:teamIds}}).populate('spirit')).filter(us=>rarityArgs.includes(us.spirit.tier));
      if(!toSell.length)return message.reply(`No unlocked **${rarityArgs.join('/')}** spirits to sell.`);
      const total=toSell.reduce((s,us)=>s+(SELL_VALUES[us.spirit.tier]||3),0);
      const hasHigh=toSell.some(us=>['Legendary','Mythic','Celestial','Ascended'].includes(us.spirit.tier));
      if(hasHigh&&!isConfirm)return message.reply(`⚠️ Selling **${toSell.length}** spirit(s) for **${total} Mana** including high-tier spirits.\nAdd \`confirm\` to proceed: \`${prefix}sell ${args.join(' ')} confirm\``);
      await UserSpirit.deleteMany({_id:{$in:toSell.map(u=>u._id)}});
      user.mana+=total;await user.save();
      return message.reply({embeds:[new EmbedBuilder().setColor(0x2ECC71).setTitle(`💰 ${rarityArgs.join('+')} Sold`).addFields({name:'Sold',value:`**${toSell.length}**`,inline:true},{name:'Mana',value:`**+${total}**`,inline:true},{name:'Total',value:`**${user.mana}**`,inline:true})]});
    }

    const spiritId=args[0].toUpperCase();
    const owned=await UserSpirit.findOne({ownerId:message.author.id,shortId:spiritId}).populate('spirit');
    if(!owned)return message.reply(`You don't own \`${spiritId}\`.`);
    if(owned.locked)return message.reply(`\`${spiritId}\` is locked.`);
    if(teamIds.includes(spiritId))return message.reply(`\`${spiritId}\` is in your team. Remove it first.`);
    const value=SELL_VALUES[owned.spirit.tier]||3;
    await owned.deleteOne();user.mana+=value;await user.save();
    return message.reply({embeds:[new EmbedBuilder().setColor(0x2ECC71).setTitle('💰 Spirit Sold').setDescription(`${owned.spirit.emoji} **${owned.spirit.name}** \`${spiritId}\``).addFields({name:'Mana earned',value:`**${value}**`,inline:true},{name:'Total Mana',value:`**${user.mana}**`,inline:true})]});
  }
};
