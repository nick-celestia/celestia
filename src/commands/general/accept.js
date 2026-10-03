// Merged: terms_privacy_acceptance_patch + constellation_bond_sanctuary_patch
// Constellation version adds: URL validation guard + sanctuary/bond/constellation hints in reply

const { LEGAL, legalLinksText } = require('../../config/legal');
const { getOrCreateUser }        = require('../../services/userService');
const { logEvent }               = require('../../services/logService');

function validPublicUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

module.exports = {
  name: 'accept',
  aliases: ['agree'],
  noTermsRequired: true,
  description: 'Accept Celestia Terms and Privacy Policy.',

  async execute({ client, message, prefix }) {
    const user = await getOrCreateUser(message.author.id);

    user.legal.termsAcceptedAt       = new Date();
    user.legal.termsVersion          = LEGAL.termsVersion;
    user.legal.privacyVersion        = LEGAL.privacyVersion;
    user.legal.acceptedFromGuildId   = message.guild?.id   || null;
    user.legal.acceptedFromChannelId = message.channel?.id || null;
    await user.save();

    await logEvent(client, {
      type:    'legal_acceptance',
      userId:  message.author.id,
      guildId: message.guild?.id || null,
      message: `User accepted Celestia Terms ${LEGAL.termsVersion} and Privacy ${LEGAL.privacyVersion}.`,
      data:    { termsVersion: LEGAL.termsVersion, privacyVersion: LEGAL.privacyVersion }
    });

    const joinLines = validPublicUrl(LEGAL.supportUrl)
      ? [
          '',
          '🌌 **Join the Official Celestia Sanctuary**',
          'Get support, event announcements, patch notes, spirit reveals, and limited official rewards:',
          LEGAL.supportUrl
        ]
      : [
          '',
          '🌌 The Official Celestia Sanctuary invite will be announced soon.'
        ];

    return message.reply([
      '✅ You accepted Celestia Terms and Privacy Policy.',
      '',
      legalLinksText(),
      '',
      `Start your journey with **${prefix}daily**, then use **${prefix}s** to summon your first spirit.`,
      `Build your home with **${prefix}sanctuary**, **${prefix}constellation**, and **${prefix}bond**.`,
      ...joinLines
    ].join('\n'));
  }
};
