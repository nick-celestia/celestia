const { LEGAL, legalLinksText } = require('../../config/legal');

module.exports = {
  name: 'policies',
  aliases: ['policy', 'terms', 'privacy'],
  noTermsRequired: true,
  description: 'Show Celestia Terms and Privacy Policy links.',
  async execute({ message, prefix }) {
    return message.reply(
      [
        '📜 **Celestia Policies**',
        '',
        legalLinksText(),
        '',
        `To accept and start playing, type **${prefix}accept**.`,
        '',
        `Current Terms version: \`${LEGAL.termsVersion}\``,
        `Current Privacy version: \`${LEGAL.privacyVersion}\``
      ].join('\n')
    );
  }
};
