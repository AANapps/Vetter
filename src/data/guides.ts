/**
 * How-to guides: short, step-by-step pages on using Vetter, for companies and for candidates. Plain data, so the
 * build can also write each one as a static page for search engines (see seoPages.ts).
 */

export type GuideAudience = 'companies' | 'candidates';

export interface Guide {
  slug: string;
  title: string;
  // One line on the guides list and in search results
  summary: string;
  audience: GuideAudience;
  minutes: number;
  steps: { title: string; text: string }[];
  tips?: string[];
  // Other guides worth reading next
  next?: string[];
}

export const GUIDE_AUDIENCES: { id: GuideAudience; label: string; intro: string }[] = [
  { id: 'companies', label: 'For companies', intro: 'Set up, build tests, invite candidates and hire from the results.' },
  { id: 'candidates', label: 'For candidates', intro: 'Take tests, keep your verified scores and apply for jobs with them.' },
];

export const GUIDES: Guide[] = [
  {
    slug: 'get-started',
    title: 'Get started with Vetter',
    summary: 'Create a company account, tell Vetter about the role, and have your first test ready in minutes.',
    audience: 'companies',
    minutes: 3,
    steps: [
      { title: 'Create a company account', text: 'On Vetter’s home page, choose Hiring, then Join free. Sign up with your work email. No card is needed, and your first job is free.' },
      { title: 'Tell Vetter what you’re hiring for', text: 'Your home page is a chat. Type the job title or paste the job description, and Vetter suggests how to test the role: which skills matter, at what level, and which tests cover them.' },
      { title: 'Pick tests', text: 'Tick the ready-made tests from Vetter’s library that fit, add an AI-written test for anything they don’t cover, or both. Vetter then shows you a test plan to check.' },
      { title: 'Post the job', text: 'Once the tests are ready, Vetter offers to post a job with them attached. Every applicant takes the tests, and you see them ranked by score.' },
    ],
    tips: ['Start with one real role you’re hiring for now. It’s the quickest way to see whether the results match your own judgement.'],
    next: ['create-a-test-from-a-job-description', 'post-a-job-and-invite-candidates'],
  },
  {
    slug: 'create-a-test-from-a-job-description',
    title: 'Create a test from a job description',
    summary: 'Paste a job description and Vetter’s AI writes a test and a hands-on job simulation built around it.',
    audience: 'companies',
    minutes: 4,
    steps: [
      { title: 'Paste the job description into the chat', text: 'On your home page, paste the description or describe the role in a few lines. The more you say about the day-to-day work, the closer the test gets to it.' },
      { title: 'Choose the shape of the test', text: 'Tick the question types you want (multiple choice, written answers, coding, SQL, spreadsheet tasks, case studies, app simulations and more), how many questions, and the level. Leave anything unticked and Vetter decides.' },
      { title: 'Check the plan', text: 'Vetter shows a blueprint first: what a good hire needs and which questions test each part. Change anything before it writes.' },
      { title: 'Let Vetter write it', text: 'The test is written section by section and appears beside the chat as it goes. A typical AI test is about ten questions and 15 to 20 minutes long.' },
      { title: 'Save it', text: 'Save the test to your Tests page, or keep it as a draft and come back to it later.' },
    ],
    tips: [
      'AI test writing uses AI credit. The chat tells you what a test will cost before it writes.',
      'Hands-on tasks (a spreadsheet, a SQL workbench, a working app) say more about a candidate than a page of multiple choice.',
    ],
    next: ['edit-a-test', 'try-a-test-as-a-candidate'],
  },
  {
    slug: 'pick-tests-from-the-library',
    title: 'Pick tests from Vetter’s library',
    summary: 'Browse ready-made tests by industry and role, at four levels, and use them for free.',
    audience: 'companies',
    minutes: 2,
    steps: [
      { title: 'Open your Tests page', text: 'Your own tests and Vetter’s library are in one list. Browse by industry and role, as candidates do, or search.' },
      { title: 'Choose the level', text: 'Most library tests come at four levels, and each level covers everything in the ones below it. Pick the level the job needs, not the highest one.' },
      { title: 'Open a test to see it', text: 'Every test has its own page with what it covers, how long it takes and how people have scored on it.' },
      { title: 'Add it to a job', text: 'Add the test to a job from the job’s page (Add tests), or tick it in the home chat when you plan a role.' },
    ],
    tips: ['Library tests cost no AI credit. Use them for the common skills and save AI-written tests for what’s specific to you.'],
    next: ['post-a-job-and-invite-candidates', 'create-a-test-from-a-job-description'],
  },
  {
    slug: 'edit-a-test',
    title: 'Edit a test',
    summary: 'Change a test by asking Vetter, or edit a hand-made test yourself, question by question.',
    audience: 'companies',
    minutes: 3,
    steps: [
      { title: 'Open the test from your Tests page', text: 'Your own tests open in the test chat, with the test beside it.' },
      { title: 'Ask for what you want', text: 'Type the change: “make it harder”, “make it shorter”, “rewrite the weakest question”, “add a question on pivot tables”. Vetter changes the test and you see it update.' },
      { title: 'Set the time limit', text: 'Ask for a time limit, or for no limit at all. Candidates are told the limit before they start.' },
      { title: 'Change app simulations too', text: 'Open an app simulation beside the chat and say what to change, such as a missing button or a different data set.' },
      { title: 'Hand-made tests', text: 'A test you built yourself is edited by hand in the builder. Use Enhance with AI to move it to the test chat if you’d rather ask for changes.' },
    ],
    next: ['try-a-test-as-a-candidate'],
  },
  {
    slug: 'try-a-test-as-a-candidate',
    title: 'Try a test as a candidate',
    summary: 'Sit your own test before you send it, to check the questions, timing and marking.',
    audience: 'companies',
    minutes: 2,
    steps: [
      { title: 'Open the test', text: 'From the test builder, choose Try it as a candidate. Or open the test’s page and choose Try it.' },
      { title: 'Take it as they would', text: 'You see the same briefing, timer and questions a candidate sees, including spreadsheets, SQL workbenches and app simulations.' },
      { title: 'Check the marking', text: 'Submit and look at the result: the score, what each answer got and why. If a question marks unfairly, change it before anyone sits it.' },
    ],
    tips: ['Your team’s tries at a job’s tests are saved for the team, so colleagues can see how a test plays before it goes out.'],
    next: ['post-a-job-and-invite-candidates'],
  },
  {
    slug: 'post-a-job-and-invite-candidates',
    title: 'Post a job and invite candidates',
    summary: 'Publish a job with its tests, share one link anywhere, or invite people by email.',
    audience: 'companies',
    minutes: 3,
    steps: [
      { title: 'Create the job', text: 'From Jobs, add a job, or let the home chat post one for you. Add the title, location, salary and description.' },
      { title: 'Attach the tests', text: 'Choose Add tests on the job. Set a pass mark, whether every test is required, and how many attempts a candidate gets.' },
      { title: 'Share it', text: 'Your job is listed on your company page and Vetter’s job board, and given its own page that Google Jobs can list. Use Copy link to post it anywhere, or Email it to invite people directly.' },
      { title: 'Watch applications arrive', text: 'Every applicant takes the job’s tests before their application reaches you, so you only ever review people with a score.' },
    ],
    tips: ['Candidates use Vetter free, so nobody drops out at a paywall before showing what they can do.'],
    next: ['review-candidates-and-shortlist', 'anti-cheat-integrity-label'],
  },
  {
    slug: 'review-candidates-and-shortlist',
    title: 'Review candidates and build a shortlist',
    summary: 'Rank applicants by score, check the answers behind each one, and pick who to interview.',
    audience: 'companies',
    minutes: 3,
    steps: [
      { title: 'Open the job’s candidates', text: 'Applicants are ranked by overall score and split into tiers, so the strongest are at the top.' },
      { title: 'Filter', text: 'Show only people who meet every required skill score, or set a minimum score.' },
      { title: 'Look behind the score', text: 'Open a candidate to see each skill score, every answer they gave and how it was marked. Nothing is a black box.' },
      { title: 'Check the integrity label', text: 'Each application carries a label from green (clean) to red (highly suspicious). Open it to see exactly what was recorded.' },
      { title: 'Shortlist and export', text: 'Invite the top people to interview. Download the results as a CSV to share with the team or keep in your own system.' },
    ],
    next: ['anti-cheat-integrity-label'],
  },
  {
    slug: 'anti-cheat-integrity-label',
    title: 'How anti-cheat and the integrity label work',
    summary: 'What Vetter watches for during a test, how the label is worked out, and how to read it.',
    audience: 'companies',
    minutes: 4,
    steps: [
      { title: 'What’s recorded', text: 'While a candidate is in a test, Vetter records switching tab, switching to another window or app, time away from the test, resizing or narrowing the window to make room for something beside it, copying, pasting text from outside the test, right-clicking, screenshot keys and a change in connected screens.' },
      { title: 'What isn’t counted against them', text: 'Pasting something they copied inside the test, such as moving cells around a spreadsheet, is recorded but not treated as suspicious.' },
      { title: 'The label', text: 'Everything is weighed into one label: Clean, Low, Some, Suspicious or Highly suspicious. Where a candidate took several tests, the worst one counts as well as the total.' },
      { title: 'Read the detail', text: 'Open the label to see every count and a timeline showing which question was on screen when each thing happened.' },
      { title: 'Highly suspicious applications', text: 'An application labelled highly suspicious is set aside automatically, without telling the candidate. You can still open it.' },
    ],
    tips: [
      'The label is for a person to judge. A single tab switch is normal; a long paste into a coding answer is not.',
      'Drag-to-order items are shuffled, and AI-written tests are new for each role, so answers are harder to share.',
    ],
    next: ['review-candidates-and-shortlist'],
  },
  {
    slug: 'share-a-test-in-the-public-library',
    title: 'Share a test in the public library',
    summary: 'Offer one of your tests to every company and candidate on Vetter, once the Vetter team approves it.',
    audience: 'companies',
    minutes: 2,
    steps: [
      { title: 'Open the test’s page', text: 'From your Tests page, open the test you want to share.' },
      { title: 'Ask to share it', text: 'Choose Share in the public library. The Vetter team checks it for quality and fairness.' },
      { title: 'Once approved', text: 'The test appears in the library for other companies to use and candidates to practise on, and says which company it came from.' },
      { title: 'If it isn’t approved', text: 'The test page says so. Change the test and choose Ask again.' },
    ],
  },
  {
    slug: 'ai-credit',
    title: 'Pay for AI test writing with credit',
    summary: 'Top up AI credit, see what each test costs, and keep track of what it’s spent on.',
    audience: 'companies',
    minutes: 2,
    steps: [
      { title: 'See the cost first', text: 'Before Vetter writes or changes a test, the chat shows roughly what it will cost. Library tests are free.' },
      { title: 'Top up', text: 'When credit runs low, choose Top up and pay by card. Credit is added straight away.' },
      { title: 'Track usage', text: 'Your credit page lists what each test and change cost, so you can see where it went.' },
    ],
  },
  {
    slug: 'take-a-test',
    title: 'Take a test on Vetter',
    summary: 'What happens before, during and after a test, and how to give yourself the best chance.',
    audience: 'candidates',
    minutes: 3,
    steps: [
      { title: 'Read the briefing', text: 'Every test starts with a short briefing: how long it takes, the time limit, how many attempts you have and the rules.' },
      { title: 'Sign and begin', text: 'Your attempt only counts once you sign and press Begin. Make sure you have the time free first.' },
      { title: 'Stay in the test', text: 'Leaving the test means retaking it, and switching tabs or pasting from elsewhere is recorded. Close other apps before you start.' },
      { title: 'Work like you would at work', text: 'Hands-on tasks give you a real spreadsheet, SQL workbench or app. Use it as you would in the job; marking gives partial credit, and typos don’t cost marks.' },
      { title: 'See your result', text: 'You get your score straight away, broken down by skill.' },
    ],
    next: ['verified-scores-and-applying'],
  },
  {
    slug: 'verified-scores-and-applying',
    title: 'Use your verified scores to apply for jobs',
    summary: 'Keep your best scores on your profile and apply for jobs with them, free.',
    audience: 'candidates',
    minutes: 2,
    steps: [
      { title: 'Build your record', text: 'Every test you take is saved to your profile. Your scores show as verified skills companies can trust.' },
      { title: 'Find jobs that fit', text: 'Browse the job board. Each job lists the tests it asks for and the scores it needs.' },
      { title: 'Apply with your scores', text: 'Take the job’s tests (or use the ones you already have) and your verified scores go straight to the company.' },
      { title: 'Get found', text: 'Companies can search people who have already proved the skills they need, so a good score can bring jobs to you.' },
    ],
    tips: ['You can delete a test from your record if you’d rather it didn’t show.'],
  },
];

export const guideBySlug = (slug: string | null | undefined) => GUIDES.find((g) => g.slug === slug);

export const guidePath = (g: Guide) => `/guides/${g.slug}/`;

// /guides/<slug>/ → the slug
export const guideSlugFromPath = (pathname: string) => pathname.match(/^\/guides\/([^/]+)\/?$/)?.[1] ?? null;
export const isGuidesPath = (pathname: string) => /^\/guides(\/|$)/.test(pathname);
