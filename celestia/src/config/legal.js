const LEGAL = {
  termsVersion: process.env.TERMS_VERSION || '2026-07-12',
  privacyVersion: process.env.PRIVACY_VERSION || '2026-07-12',

  // Add public links after uploading TERMS.md and PRIVACY.md somewhere public.
  termsUrl: process.env.TERMS_URL || '[SET_TERMS_URL_IN_HOSTING_ENV]',
  privacyUrl: process.env.PRIVACY_URL || '[SET_PRIVACY_URL_IN_HOSTING_ENV]',
  supportUrl: process.env.SUPPORT_SERVER_URL || '[SET_SUPPORT_SERVER_URL_IN_HOSTING_ENV]'
};

function legalLinksText() {
  return [
    `Terms: ${LEGAL.termsUrl}`,
    `Privacy: ${LEGAL.privacyUrl}`,
    `Support: ${LEGAL.supportUrl}`
  ].join('\n');
}

module.exports = { LEGAL, legalLinksText };
