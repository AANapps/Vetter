/**
 * Corprax's legal pages: privacy policy, terms of service and the candidate-data terms for companies. Written for the UK
 * (UK GDPR, Data Protection Act 2018) and Australia (Privacy Act 1988 and the Australian Privacy Principles, Australian
 * Consumer Law). Turned into plain pages at /privacy/, /terms/ and /candidate-data/ by seoPages.ts.
 *
 * DRAFT: needs a lawyer's review before relying on it. Fill in LEGAL_DETAILS first. Keep it true to what the product
 * does: when a feature changes what's collected, who sees it or where it goes, change these pages in the same commit.
 */

export const LEGAL_DETAILS = {
  // The company that runs Corprax, as registered
  entity: '[Company legal name]',
  address: '[Registered address]',
  companyNumber: '[Company number]',
  icoNumber: '[ICO registration number]',
  // Where privacy questions and requests go
  email: '[privacy contact email]',
};

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

export interface LegalPage {
  path: string;
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
}

const D = LEGAL_DETAILS;
const UPDATED = '2026-11-25';

export const PRIVACY: LegalPage = {
  path: '/privacy/',
  title: 'Privacy policy',
  description: 'What personal information Corprax collects, why, who sees it, where it goes and your rights, for candidates, companies and visitors.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Who we are',
      paragraphs: [
        `Corprax is run by ${D.entity}, ${D.address} (company number ${D.companyNumber}), registered with the UK Information Commissioner's Office (${D.icoNumber}). In this policy "Corprax", "we" and "us" mean ${D.entity}.`,
        `We decide how your personal information is used on Corprax (we are the "controller"). When a company uses Corprax to hire or train people, that company also decides how it uses what it receives: see "Companies you apply to or work with". Questions and requests: ${D.email}.`,
      ],
    },
    {
      heading: 'What we collect',
      list: [
        'Account details: your name, email address and whether you are a candidate or a company. Passwords are handled by Google Firebase Authentication; we never see them. If you sign in with Google, we receive your name and email from Google.',
        'Your profile: what you add, such as your location, headline, work history, education, certifications, links and the job you are after. Your picture is drawn from your initials; we do not store photos.',
        'CV import: if you upload a CV or paste text from one, it is sent to our AI provider to read. We keep only the details you check and save to your profile, not the file.',
        'Test work and results: your answers, the work you do in tests and job simulations (spreadsheets, code, emails, tickets and so on), time taken, scores, a breakdown by skill, and your messages with the AI assistant where a test has one.',
        'Integrity monitoring during tests: whether you leave the test tab or window, leave full screen, copy, cut or paste, right-click, press screenshot keys, resize the window or change screens, how long you are inactive, and how many characters you type compared with what you paste. We do not use your camera or microphone, record your screen, or record what you type outside the test.',
        'Applications and hiring: the jobs you apply to or are invited to, the stage a company moves you to, notes a company adds, and, if you are hired, the company\'s answers to check-ins 30 and 90 days later (a rating of how you are doing, whether you are still employed, and an optional note).',
        'Company accounts: your company\'s name and details, your work email, job ads, tests you make, people you invite to your team, and billing details. Card details are held by Stripe; we never see your full card number.',
        'Your device: your browser keeps your sign-in session, your settings, and a test you took before signing up (for up to 24 hours, so it can be added to your new account). We do not use advertising or analytics cookies.',
      ],
    },
    {
      heading: 'Why we use it, and our legal basis',
      list: [
        'To run your account and Corprax itself: to provide the service you signed up for (contract).',
        'To mark your tests and show your results and work to companies you apply to, or that invite you: to provide the service (contract).',
        'To show your public profile and your place on leaderboards, so companies can find you: our legitimate interest in helping candidates be found. You can hide individual test results from your public profile.',
        'Integrity monitoring: our legitimate interest, and companies\', in fair tests and results that can be trusted.',
        'Check-ins after a hire: our legitimate interest in showing whether Corprax\'s scores predict how people do in the job, and improving our tests. We use these in summary across many hires.',
        'Payments and tax records: to provide paid plans (contract) and to meet tax law (legal obligation).',
        'Emails about your account, such as verifying your address: to provide the service (contract). We do not send marketing emails without your consent.',
      ],
    },
    {
      heading: 'Automated marking and integrity flags',
      paragraphs: [
        'Tests are marked automatically. Some written answers are marked by AI against a marking guide. Companies see your score and your work, and decide who to take forward.',
        'Integrity monitoring gives each attempt a label from "clean" to "highly suspicious". An application labelled highly suspicious is set aside automatically and the company sees why. You have the right to ask for a person to review any decision made this way, to give your side, and to challenge it: email us and we will review it and tell the company the outcome.',
      ],
    },
    {
      heading: 'Who can see your information',
      list: [
        'Anyone, including people not signed in: your public profile (name, location, headline, work history, education, test scores, skills proven in tests, and leaderboard places). Never your email address.',
        'Companies you apply to, or that invite you to a test: your profile, every result including ones you hid from your public profile, your answers and work, the integrity report, and suggested interview questions drawn from your work.',
        'A company whose team you join: the tests, simulations and training it gives you, and how you did.',
        'The Corprax team: to run, support and improve Corprax, and to check tests are fair.',
        'Our service providers, only to run Corprax for us: Google (Firebase sign-in and database, and web fonts, which means your browser\'s IP address reaches Google), Vercel (hosting), Anthropic (the AI that marks written answers, reads CVs, powers the AI assistant in tests and builds tests), Stripe (payments) and Judge0 via RapidAPI (running code you write in coding tests).',
        'Authorities, when the law requires it.',
      ],
      paragraphs: ['We do not sell your personal information.'],
    },
    {
      heading: 'Where your information goes',
      paragraphs: [
        'Some of our service providers store or process information in the United States and other countries where they operate (Google, Vercel, Anthropic, Stripe and RapidAPI). When information leaves the UK we rely on the UK–US data bridge where the provider is certified, or on the UK\'s approved data transfer agreements. You can ask us for details.',
      ],
    },
    {
      heading: 'How long we keep it',
      list: [
        'Your account, profile and results: while your account is open. When you ask us to delete your account, we delete it within 30 days.',
        'Applications and work a company received: while the company uses Corprax, until you ask us to delete them, or until the company deletes them.',
        'Billing records: six years, as tax law requires.',
        'A test taken before signing up: on your own device for up to 24 hours.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        `You can ask to see the personal information we hold about you, correct it, delete it, limit how we use it, object to how we use it, or receive a copy to take elsewhere. You can also ask for a person to review an automated decision (see above). Email ${D.email}. We reply within one month and do not charge for this.`,
        'If you are unhappy with how we handled your information, please tell us first. You can also complain to the Information Commissioner\'s Office: ico.org.uk, 0303 123 1113.',
      ],
    },
    {
      heading: 'If you are in Australia',
      paragraphs: [
        'We handle your personal information in line with the Australian Privacy Principles in the Privacy Act 1988 (Cth). Everything in this policy applies to you, and in addition:',
      ],
      list: [
        'We collect personal information directly from you, or from companies that invite you to a test or add you to their team.',
        'Your information is disclosed overseas: it is stored and processed in the United Kingdom, the United States and other countries where the providers above operate.',
        'You can ask to access or correct your information at any time, as above. If we refuse, we will tell you why in writing.',
        `To complain about a breach of the Australian Privacy Principles, email ${D.email}. We aim to respond within 30 days. If you are not satisfied, you can complain to the Office of the Australian Information Commissioner: oaic.gov.au, 1300 363 992.`,
        'You may use a pseudonym on your public profile, but companies you apply to will need your real name.',
      ],
    },
    {
      heading: 'Age',
      paragraphs: ['Corprax is for people aged 16 and over. If you are under 16, please do not create an account.'],
    },
    {
      heading: 'Security',
      paragraphs: [
        'Information is sent over encrypted connections and stored with Google Firebase, with access rules limiting who can read what. No system is perfectly secure; if a breach puts you at risk, we will tell you and the regulator as the law requires.',
      ],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: ['If we change this policy in a way that matters, we will tell you by email or in Corprax before it takes effect. The date at the top shows when it last changed.'],
    },
  ],
};

export const TERMS: LegalPage = {
  path: '/terms/',
  title: 'Terms of service',
  description: 'The terms for using Corprax, for candidates and for companies.',
  updated: UPDATED,
  sections: [
    {
      heading: 'About these terms',
      paragraphs: [
        `These terms are an agreement between you and ${D.entity} (${D.address}, company number ${D.companyNumber}), which runs Corprax. By creating an account or using Corprax you agree to them, to our privacy policy, and, if you use Corprax for a company, to the candidate data terms. If you use Corprax for a company, you confirm you may agree on its behalf, and "you" includes the company.`,
        'You must be 16 or over to use Corprax.',
      ],
    },
    {
      heading: 'Your account',
      list: [
        'Give accurate details and keep them up to date.',
        'One account per person. Keep your sign-in details to yourself; you are responsible for what happens on your account.',
        'Tell us straight away if you think someone else has used it.',
      ],
    },
    {
      heading: 'Taking tests',
      list: [
        'Do every test yourself, using only what the test allows. Where a test gives you an AI assistant, you may use it; otherwise, no outside help from people or AI.',
        'Do not copy, share or publish questions, tasks, answers or test data.',
        'Starting a test counts as an attempt, and retakes are limited, as each test explains before you begin.',
        'Your results stay on your account; you can hide them from your public profile, but companies you apply to still see them.',
        'Integrity monitoring runs during tests, as our privacy policy explains. We may remove results, set applications aside or close accounts where we reasonably believe someone cheated. You can ask for a person to review this.',
      ],
    },
    {
      heading: 'Using Corprax to hire or train',
      list: [
        'Corprax\'s scores and reports help you decide; they do not decide for you. You are responsible for your hiring decisions and for making them lawfully and fairly, including under equality and anti-discrimination law.',
        'Make reasonable adjustments for candidates who need them, such as more time. Contact us if you need help doing so.',
        'You must follow the candidate data terms when you use candidates\' information.',
        'You keep ownership of what you add (job ads, your own tests, company details) and let us host, show and process it to run Corprax for you. Do not add anything you do not have the right to use, or other people\'s confidential information.',
      ],
    },
    {
      heading: 'AI features',
      paragraphs: [
        'Corprax uses AI to build tests, mark written answers, read CVs and help in some tests. AI can make mistakes: check what it produces before relying on it. AI use on company plans counts against your plan\'s allowance and then your prepaid credit.',
      ],
    },
    {
      heading: 'Plans and payment',
      list: [
        'Prices are on our pricing page. VAT or GST is added where it applies.',
        'Subscriptions renew each month or year until cancelled. You can cancel at any time in Plan and billing; you keep the plan until the end of the period you paid for.',
        'A job pass is a one-off payment for one job.',
        'Prepaid AI credit is not refundable, except where the law says otherwise.',
        'We may change prices with at least 30 days\' notice; changes apply from your next renewal.',
      ],
    },
    {
      heading: 'What you must not do',
      list: [
        'Copy, scrape or download tests, answers, profiles or other content in bulk, or try to get at answers or other people\'s information.',
        'Reverse engineer, overload or interfere with Corprax, or get around its limits or security.',
        'Upload anything unlawful, harmful or misleading, or pretend to be someone else.',
        'Use candidates\' information for anything other than hiring or training, as the candidate data terms set out.',
      ],
    },
    {
      heading: 'Corprax\'s content',
      paragraphs: ['Corprax\'s software, tests, job simulations and other content belong to us or our licensors. You may use them only through Corprax, as these terms allow.'],
    },
    {
      heading: 'Availability and changes',
      paragraphs: [
        'We work to keep Corprax running but cannot promise it will always be available or free of errors. Features marked beta may change or be removed. We may change Corprax and these terms; if a change to the terms matters, we will tell you before it takes effect.',
      ],
    },
    {
      heading: 'Our liability',
      list: [
        'Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or anything else the law does not allow us to limit.',
        'If you use Corprax as a consumer, you keep your legal rights. In Australia, nothing in these terms excludes the guarantees you have under the Australian Consumer Law.',
        'For companies: we are not liable for lost profits, lost business or indirect losses, or for hiring decisions you make, and our total liability in any 12 months is limited to what you paid us in those 12 months.',
      ],
    },
    {
      heading: 'Ending your use',
      paragraphs: [
        `You can stop using Corprax at any time and ask us to delete your account at ${D.email}. We may suspend or close an account that breaks these terms, telling you why unless the law or safety prevents it.`,
      ],
    },
    {
      heading: 'Law',
      paragraphs: [
        'These terms are governed by the law of England and Wales, and its courts deal with any dispute. If you are a consumer living elsewhere, such as Scotland, Northern Ireland or Australia, you keep the protection of your local law and may bring a claim in your local courts.',
      ],
    },
  ],
};

export const CANDIDATE_DATA: LegalPage = {
  path: '/candidate-data/',
  title: 'Candidate data terms for companies',
  description: 'How companies may use the candidate information they receive through Corprax, and how Corprax handles it for them.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Who is responsible for what',
      list: [
        'Corprax is responsible (the controller) for candidates\' accounts, profiles and results on Corprax.',
        'When candidates apply to your job or take a test you sent, you are responsible (an independent controller) for how you use what you receive for your hiring.',
        'For your own team on Corprax (people you invite, the work and training you give them, and their results), we handle that information on your behalf (as your processor), under the section "When we handle data for you" below.',
      ],
    },
    {
      heading: 'How you may use candidate information',
      list: [
        'Only to recruit for the role the candidate applied to or was invited for, or for training your own team.',
        'Share it only with people in your organisation, or advisers, who need it for that decision.',
        'Do not sell it, use it for unrelated marketing, or copy candidates\' profiles or results out of Corprax in bulk.',
        'Keep it only as long as you need it for hiring, and delete copies you made outside Corprax when you no longer need them.',
        'Tell candidates how you use their information, as the law requires, for example in your own recruitment privacy notice.',
      ],
    },
    {
      heading: 'Fair decisions',
      list: [
        'Use scores and reports as one part of your decision, alongside your own judgement.',
        'Integrity labels flag things for a person to look at. Review any application set aside for suspected cheating before you reject it, and consider the candidate\'s side if they give it.',
        'Make reasonable adjustments for candidates who need them, and make decisions in line with equality and anti-discrimination law where you hire.',
      ],
    },
    {
      heading: 'Check-ins after a hire',
      paragraphs: [
        'If you mark a candidate as hired, Corprax asks you 30 and 90 days later how they are doing. Answer only with what you would be comfortable telling them, and make sure your own notices to staff cover sharing this with Corprax. We use the answers, in summary across many hires, to check our tests predict how people do in the job.',
      ],
    },
    {
      heading: 'When we handle data for you',
      list: [
        'We process it only to provide Corprax to you and on your instructions, which these terms and your use of Corprax set out.',
        'Our staff and providers are bound to keep it confidential.',
        'We protect it with appropriate security, and tell you without undue delay if a breach affects it.',
        'We use the service providers named in our privacy policy, under contracts that protect the information, and tell you before adding new ones.',
        'We help you answer people\'s requests about their information and meet your other legal duties, where we reasonably can.',
        'When you close your company account, we delete the information we hold for you within 30 days unless the law requires us to keep it, and on request give you a copy first.',
      ],
    },
    {
      heading: 'Requests and problems',
      paragraphs: [
        `If a candidate asks you about information Corprax holds, or you suspect information has been misused, contact us at ${D.email}. If either of us becomes aware of a breach involving the other's candidate information, we will tell each other without undue delay.`,
      ],
    },
  ],
};

export const LEGAL_PAGES = [PRIVACY, TERMS, CANDIDATE_DATA];
