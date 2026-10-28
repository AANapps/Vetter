// Free and personal email providers. Companies sign up with a work address; these go to manual review instead.
// firestore.rules keeps its own copy of this list: change both together.
export const FREE_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'live.co.uk', 'msn.com',
  'yahoo.com', 'yahoo.co.uk', 'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com',
  'gmx.com', 'gmx.co.uk', 'mail.com', 'zoho.com', 'yandex.com', 'btinternet.com', 'sky.com', 'virginmedia.com',
  'talktalk.net', 'qq.com', '163.com',
];

export const domainOf = (email: string) => email.trim().toLowerCase().split('@')[1] ?? '';
export const isFreeEmail = (email: string) => FREE_EMAIL_DOMAINS.includes(domainOf(email));

// "https://www.prismascale.io/about" -> "prismascale.io"
export const websiteDomain = (url: string) =>
  url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];

// A company's email domain fits its website when one is the other or a subdomain of it (mail.acme.com and acme.com)
export const domainsMatch = (emailDomain: string, site: string) => {
  const w = websiteDomain(site);
  return !!w && (emailDomain === w || emailDomain.endsWith(`.${w}`) || w.endsWith(`.${emailDomain}`));
};
