import fs from 'fs/promises';
import path from 'path';
import { Plugin, runnerImport } from 'vite';
import type { Business, JobPosting } from './src/types';
import type * as JobSeo from './src/lib/jobSeo';
import type * as Guides from './src/data/guides';
import type * as Articles from './src/data/articles';
import type { AssessmentTest } from './src/types';
import type * as Plans from './server/plans';

/**
 * After a build, writes a real HTML page for every job (dist/jobs/<slug>/index.html) and a jobs index,
 * each with its own title, description, canonical address and schema.org JobPosting, plus
 * sitemap.xml, robots.txt and llms.txt. Search engines and AI crawlers that don't run JavaScript
 * read the listing straight from the page; the app takes over once it loads.
 */
// Firestore's REST values, as plain values
type FirestoreValue = Record<string, unknown>;
const plain = (v: FirestoreValue): unknown => {
  if ('arrayValue' in v) return ((v.arrayValue as { values?: FirestoreValue[] }).values ?? []).map(plain);
  if ('mapValue' in v) return fields((v.mapValue as { fields?: Record<string, FirestoreValue> }).fields);
  if ('integerValue' in v) return Number(v.integerValue);
  if ('nullValue' in v) return null;
  return Object.values(v)[0];
};
const fields = (f: Record<string, FirestoreValue> = {}) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, plain(v)]));

// With accounts on, the jobs and companies are the real ones in Firebase (both public); otherwise the demo's examples
async function loadListings(root: string, firebase?: { projectId: string; apiKey: string }) {
  if (!firebase) {
    const { INITIAL_JOBS, INITIAL_BUSINESSES } = (
      await runnerImport<{ INITIAL_JOBS: JobPosting[]; INITIAL_BUSINESSES: Business[] }>(path.join(root, 'src/data/mockData.ts'), { configFile: false, root })
    ).module;
    return { jobs: INITIAL_JOBS, businesses: INITIAL_BUSINESSES };
  }
  const base = `https://firestore.googleapis.com/v1/projects/${firebase.projectId}/databases/(default)/documents`;
  const jobs: JobPosting[] = [];
  let pageToken = '';
  do {
    const res = await fetch(`${base}/jobs?key=${firebase.apiKey}&pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`);
    if (!res.ok) throw new Error(`Loading jobs from Firebase failed: ${res.status} ${await res.text()}`);
    const page = (await res.json()) as { documents?: { name: string; fields: Record<string, FirestoreValue> }[]; nextPageToken?: string };
    for (const d of page.documents ?? []) jobs.push({ invitations: [], ...fields(d.fields), id: d.name.split('/').pop() } as unknown as JobPosting);
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);
  const res = await fetch(`${base}:runQuery?key=${firebase.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: 'companies' }], where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } } } },
    }),
  });
  if (!res.ok) throw new Error(`Loading companies from Firebase failed: ${res.status} ${await res.text()}`);
  const rows = (await res.json()) as { document?: { name: string; fields: Record<string, FirestoreValue> } }[];
  const businesses = rows.flatMap((r) => {
    if (!r.document) return [];
    const c = fields(r.document.fields) as Partial<Business> & { name: string; website?: string };
    return [{ industry: '', headquarters: '', companySize: '', description: '', techStack: [], logo: '', ...c, websiteUrl: c.website ?? '', id: r.document.name.split('/').pop()! }];
  });
  return { jobs, businesses };
}

export function seoPages(siteUrl: string, firebase?: { projectId: string; apiKey: string }): Plugin {
  let outDir = 'dist';
  let root = process.cwd();
  return {
    name: 'vetter-seo-pages',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const load = async <T,>(file: string) => (await runnerImport<T>(path.join(root, file), { configFile: false, root })).module;
      // A deploy shouldn't fail because Firebase couldn't be reached: the site works without the static job pages
      const { jobs, businesses } = await loadListings(root, firebase).catch((err) => {
        console.warn(`\nNo job pages written. ${err instanceof Error ? err.message : err}`);
        return { jobs: [] as JobPosting[], businesses: [] as Business[] };
      });
      const seo = await load<typeof JobSeo>('src/lib/jobSeo.ts');
      const { escapeHtml: esc } = seo;

      const template = await fs.readFile(path.join(outDir, 'index.html'), 'utf8');
      const listable = jobs.filter((j) => seo.isListable(j));
      const businessOf = (job: JobPosting) => businesses.find((b) => b.id === job.businessId);

      const page = (p: { path: string; title: string; description: string; head?: string; body: string; noindex?: boolean }) =>
        template
          .replace(/<title>.*?<\/title>/, `<title>${esc(p.title)}</title>`)
          .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(p.description)}`)
          .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(p.title)}`)
          .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(p.description)}`)
          .replace(
            '</head>',
            `<link rel="canonical" href="${siteUrl}${p.path}" />\n<meta property="og:url" content="${siteUrl}${p.path}" />\n` +
              `${p.noindex ? '<meta name="robots" content="noindex" />\n' : ''}${p.head ?? ''}${STATIC_STYLE}</head>`
          )
          .replace('<div id="root"></div>', `<div id="root"><div class="seo-page">${p.body}</div></div>`);

      const write = async (file: string, content: string) => {
        await fs.mkdir(path.dirname(path.join(outDir, file)), { recursive: true });
        await fs.writeFile(path.join(outDir, file), content);
      };

      const crumbs = (items: { name: string; path: string }[]) =>
        seo.jsonLdScript({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${siteUrl}${c.path}` })),
        });

      const jobCard = (job: JobPosting) =>
        `<li><a href="${seo.jobPath(job)}">${esc(job.title)}</a> at ${esc(job.companyName)}: ${esc(job.location)}, ${esc(job.workType)}, ${esc(job.salaryRange)}</li>`;

      for (const job of jobs) {
        // Invite-only jobs get no page of their own: the app serves their link, for the people sent it
        if (job.visibility === 'invite' || job.status === 'draft') continue;
        const open = seo.isListable(job);
        const others = listable.filter((j) => j.id !== job.id);
        const facts = [job.location, job.workType, job.employmentType, job.salaryRange, job.experienceLevel].filter(Boolean).map((f) => esc(f!));
        await write(
          `jobs/${seo.jobSlug(job)}/index.html`,
          page({
            path: seo.jobPath(job),
            title: seo.jobPageTitle(job),
            description: seo.jobMetaDescription(job),
            // Closed jobs keep their page for old links, but leave search results
            noindex: !open,
            head:
              (open ? `${seo.jsonLdScript(seo.jobPostingJsonLd(job, siteUrl, businessOf(job)))}\n` : '') +
              `${crumbs([{ name: 'Jobs', path: '/jobs/' }, { name: job.title, path: seo.jobPath(job) }])}\n`,
            body:
              `<nav><a href="/">Praxa</a> &rsaquo; <a href="/jobs/">Jobs</a></nav><main><article>` +
              `<h1>${esc(job.title)}</h1><p class="seo-company">${esc(job.companyName)}${job.department ? ` &middot; ${esc(job.department)}` : ''}</p>` +
              `<p>${facts.join(' &middot; ')}</p>` +
              `<p>Posted ${esc(job.postedDate)}${job.closingDate ? ` &middot; Closes ${esc(job.closingDate)}` : ''}${job.startDate ? ` &middot; Starts ${esc(job.startDate)}` : ''}</p>` +
              (open ? '' : '<p><strong>This job is no longer taking applications.</strong></p>') +
              seo.jobDescriptionHtml(job) +
              (open ? `<p><a class="seo-apply" href="${seo.jobPath(job)}">Apply on Praxa</a></p>` : '') +
              `</article>${others.length ? `<aside><h2>More jobs on Praxa</h2><ul>${others.map(jobCard).join('')}</ul></aside>` : ''}</main>`,
          })
        );
      }

      await write(
        'jobs/index.html',
        page({
          path: '/jobs/',
          title: `${listable.length} tech jobs hiring now: apply with a verified skills test | Praxa`,
          description: `Browse ${listable.length} open engineering, data and analyst jobs at ${[...new Set(listable.map((j) => j.companyName))].join(', ')}. Prove your skills with one test and apply on Praxa.`,
          head: crumbs([{ name: 'Jobs', path: '/jobs/' }]),
          body:
            `<nav><a href="/">Praxa</a> &rsaquo; Jobs</nav><main><h1>Jobs on Praxa</h1>` +
            `<p>Every job on Praxa is filled on skill: take the job's test, and your verified score goes straight to the company.</p>` +
            `<ul>${listable.map(jobCard).join('')}</ul></main>`,
        })
      );

      // How-to guides: a static page each, with HowTo data so search engines can show the steps
      const { GUIDES, GUIDE_AUDIENCES, guidePath } = await load<typeof Guides>('src/data/guides.ts');
      for (const g of GUIDES) {
        await write(
          `guides/${g.slug}/index.html`,
          page({
            path: guidePath(g),
            title: `${g.title} | Praxa Guides`,
            description: g.summary,
            head:
              `${seo.jsonLdScript({
                '@context': 'https://schema.org',
                '@type': 'HowTo',
                name: g.title,
                description: g.summary,
                totalTime: `PT${g.minutes}M`,
                step: g.steps.map((st, i) => ({ '@type': 'HowToStep', position: i + 1, name: st.title, text: st.text })),
              })}\n` + `${crumbs([{ name: 'Guides', path: '/guides/' }, { name: g.title, path: guidePath(g) }])}\n`,
            body:
              `<nav><a href="/">Praxa</a> &rsaquo; <a href="/guides/">Guides</a></nav><main><article>` +
              `<h1>${esc(g.title)}</h1><p>${esc(g.summary)}</p><ol>` +
              g.steps.map((st) => `<li><strong>${esc(st.title)}.</strong> ${esc(st.text)}</li>`).join('') +
              `</ol>${g.tips ? `<h2>Tips</h2><ul>${g.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</article></main>`,
          })
        );
      }
      await write(
        'guides/index.html',
        page({
          path: '/guides/',
          title: 'How-to guides | Praxa',
          description: 'Step-by-step guides to hiring on skills with Praxa: build tests, invite candidates, read results and anti-cheat, and take tests as a candidate.',
          head: crumbs([{ name: 'Guides', path: '/guides/' }]),
          body:
            `<nav><a href="/">Praxa</a> &rsaquo; Guides</nav><main><h1>How to use Praxa</h1>` +
            GUIDE_AUDIENCES.map(
              (a) =>
                `<h2>${esc(a.label)}</h2><ul>` +
                GUIDES.filter((g) => g.audience === a.id)
                  .map((g) => `<li><a href="${guidePath(g)}">${esc(g.title)}</a>: ${esc(g.summary)}</li>`)
                  .join('') +
                `</ul>`
            ).join('') +
            `</main>`,
        })
      );

      // ---------- Pages for search engines and AI assistants: plain HTML, no app ----------
      // Praxa's name always comes with what it does, the same words everywhere, so the name can't be confused
      const ORG = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Praxa',
        url: `${siteUrl}/`,
        description: PRAXA_DESCRIPTION,
        logo: `${siteUrl}/praxa-logo.svg`,
      };
      const APP = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Praxa',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web browser',
        url: `${siteUrl}/`,
        description: PRAXA_DESCRIPTION,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP', description: 'Free plan: one open job' },
        publisher: { '@type': 'Organization', name: 'Praxa', url: `${siteUrl}/` },
      };
      await write('praxa-logo.svg', LOGO_SVG);
      const site = (p: { path: string; title: string; description: string; head?: string; body: string; type?: string }) =>
        `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />` +
        `<title>${esc(p.title)}</title><meta name="description" content="${esc(p.description)}" />` +
        `<link rel="canonical" href="${siteUrl}${p.path}" /><meta property="og:url" content="${siteUrl}${p.path}" />` +
        `<meta property="og:title" content="${esc(p.title)}" /><meta property="og:description" content="${esc(p.description)}" /><meta property="og:type" content="${p.type ?? 'website'}" /><meta property="og:site_name" content="Praxa" />` +
        `<link rel="icon" type="image/svg+xml" href="/praxa-logo.svg" />${p.head ?? ''}${SITE_STYLE}</head><body>` +
        `<header class="top"><a class="brand" href="/"><img src="/praxa-logo.svg" alt="" width="26" height="26" />Praxa</a><nav>` +
        `<a href="/tests/">Tests</a><a href="/resources/">Resources</a><a href="/pricing/">Pricing</a><a href="/about/">About</a><a href="/guides/">Guides</a>` +
        `<a class="cta" href="/">Start free</a></nav></header><main class="wrap">${p.body}</main>` +
        `<footer class="foot"><div class="wrap"><p><strong>Praxa</strong>: ${esc(PRAXA_DESCRIPTION)}</p>` +
        `<p><a href="/tests/">Test library</a> &middot; <a href="/resources/">Resources</a> &middot; <a href="/pricing/">Pricing</a> &middot; <a href="/about/">About</a> &middot; <a href="/guides/">Guides</a> &middot; <a href="/jobs/">Jobs</a> &middot; <a href="/llms.txt">llms.txt</a></p></div></footer></body></html>`;

      // Articles
      const { ARTICLES, articlePath } = await load<typeof Articles>('src/data/articles.ts');
      const sectionHtml = (sec: Articles.ArticleSection) =>
        `<h2>${esc(sec.heading)}</h2>` +
        (sec.paragraphs ?? []).map((t) => `<p>${esc(t)}</p>`).join('') +
        (sec.list ? `<${sec.numbered ? 'ol' : 'ul'}>${sec.list.map((t) => `<li>${esc(t)}</li>`).join('')}</${sec.numbered ? 'ol' : 'ul'}>` : '') +
        (sec.table
          ? `<div class="table"><table><thead><tr>${sec.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${sec.table.rows
              .map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`)
              .join('')}</tbody></table></div>`
          : '');
      for (const a of ARTICLES) {
        await write(
          `resources/${a.slug}/index.html`,
          site({
            path: articlePath(a),
            title: `${a.title} | Praxa`,
            description: a.description,
            type: 'article',
            head:
              seo.jsonLdScript({
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: a.title,
                description: a.description,
                dateModified: a.updated,
                datePublished: a.updated,
                author: { '@type': 'Organization', name: 'Praxa', url: `${siteUrl}/` },
                publisher: { '@type': 'Organization', name: 'Praxa', url: `${siteUrl}/`, logo: { '@type': 'ImageObject', url: `${siteUrl}/praxa-logo.svg` } },
                mainEntityOfPage: `${siteUrl}${articlePath(a)}`,
              }) +
              seo.jsonLdScript({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: a.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
              }) +
              crumbs([{ name: 'Resources', path: '/resources/' }, { name: a.title, path: articlePath(a) }]),
            body:
              `<nav class="crumbs"><a href="/">Praxa</a> &rsaquo; <a href="/resources/">Resources</a></nav><article>` +
              `<h1>${esc(a.title)}</h1><p class="meta">Last updated <time datetime="${a.updated}">${esc(niceDate(a.updated))}</time> &middot; by the Praxa team</p>` +
              `<p class="answer">${esc(a.answer)}</p>` +
              a.sections.map(sectionHtml).join('') +
              `<h2>Frequently asked questions</h2><dl class="faq">${a.faqs.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join('')}</dl>` +
              `<div class="cta-box"><p><strong>Try it on a real role.</strong> Praxa's free plan includes one open job and the library of skills tests.</p><a class="button" href="/">Start free</a></div>` +
              `<h2>Read next</h2><ul>${a.related
                .map((slug) => ARTICLES.find((x) => x.slug === slug))
                .filter((x): x is Articles.Article => !!x)
                .map((x) => `<li><a href="${articlePath(x)}">${esc(x.title)}</a></li>`)
                .join('')}</ul></article>`,
          })
        );
      }
      await write(
        'resources/index.html',
        site({
          path: '/resources/',
          title: 'Skills-based hiring resources: tests, job simulations and AI | Praxa',
          description: 'Practical articles on testing candidates before hiring, job simulations, skills tests, and hiring when CVs are written by AI.',
          head: crumbs([{ name: 'Resources', path: '/resources/' }]),
          body:
            `<h1>Resources for hiring on skills</h1><p class="answer">Practical, honest answers to the questions hiring teams ask about testing candidates, job simulations and AI. Each article starts with the answer.</p>` +
            `<ul class="cards">${ARTICLES.map((a) => `<li><a href="${articlePath(a)}"><strong>${esc(a.title)}</strong></a><span>${esc(a.description)}</span></li>`).join('')}</ul>`,
        })
      );

      // The test library: one page per Praxa test, describing the tasks (never the answers)
      const { STANDARD_ASSESSMENTS } = await load<{ STANDARD_ASSESSMENTS: AssessmentTest[] }>('src/data/mockData.ts');
      const LISTED = /^test-(da-(?!01$)|sd-|fe-dom|fe-react|cs-(comms|refunds|troubleshoot)|support-triage|sim-support|sim-dev|sim-fe)/;
      const libTests = STANDARD_ASSESSMENTS.filter((t) => LISTED.test(t.id) && !t.familyId && t.purpose !== 'training');
      const isSimTask = (q: AssessmentTest['questions'][number]) => ['sheet', 'database', 'app', 'desktop', 'code', 'sql'].includes(q.type);
      const testSlug = (t: AssessmentTest) => t.id.replace(/^test-/, '');
      const testPath = (t: AssessmentTest) => `/tests/${testSlug(t)}/`;
      const isDay = (t: AssessmentTest) => t.questions.some((q) => q.type === 'desktop' && q.desktop?.phases?.length);
      const testRole = (t: AssessmentTest) => t.roles?.[0] ?? t.category;
      for (const t of libTests) {
        const tasks = t.questions.filter(isSimTask);
        const simShare = Math.round(tasks.reduce((n, q) => n + q.weight, 0));
        const parts = isDay(t) ? (tasks[0].desktop?.phases ?? []).map((ph) => `${ph.title} (${ph.minutes} min)`) : tasks.map((q) => q.title);
        await write(
          `tests/${testSlug(t)}/index.html`,
          site({
            path: testPath(t),
            title: `${t.title}: ${isDay(t) ? 'job simulation' : 'skills test'} for ${testRole(t)} hiring | Praxa`,
            description: `${t.estimatedMinutes}-minute ${isDay(t) ? 'job simulation' : 'skills test'} for ${testRole(t)} candidates. ${t.description}`.slice(0, 300),
            head: crumbs([{ name: 'Tests', path: '/tests/' }, { name: t.title, path: testPath(t) }]),
            body:
              `<nav class="crumbs"><a href="/">Praxa</a> &rsaquo; <a href="/tests/">Tests</a></nav><article><h1>${esc(t.title)}</h1>` +
              `<p class="meta">${esc(isDay(t) ? 'Job simulation' : 'Skills test')} &middot; ${esc(testRole(t))} &middot; ${t.estimatedMinutes} minutes &middot; ${simShare}% of the marks on hands-on tasks</p>` +
              `<p class="answer">${esc(t.description)}</p>` +
              `<h2>${isDay(t) ? 'How the day runs' : 'The tasks'}</h2><ol>${parts.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` +
              `<h2>Skills covered</h2><p>${t.skillsTested.map(esc).join(', ')}</p>` +
              `<h2>How it works</h2><ul><li>Candidates work in realistic tools on a desktop (${esc([...new Set(tasks.map((q) => TOOL[q.type] ?? q.type))].join(', '))}), not a quiz.</li>` +
              `<li>Every candidate gets the same tasks, marked automatically on the work they leave behind, so scores are comparable.</li>` +
              `<li>You see each candidate's score, how each part went, and their work itself.</li></ul>` +
              `<div class="cta-box"><p><strong>Use this test for a job.</strong> Add it to a job on Praxa and every applicant takes it before you shortlist.</p><a class="button" href="/">Start free</a></div></article>`,
          })
        );
      }
      const byRole = [...new Set(libTests.map(testRole))];
      await write(
        'tests/index.html',
        site({
          path: '/tests/',
          title: 'Skills tests and job simulations for hiring: the Praxa library',
          description: `Ready-made, simulation-based skills tests and job simulations for ${byRole.join(', ')} roles. Candidates do the real work in realistic tools; you compare them on the same tasks.`,
          head: crumbs([{ name: 'Tests', path: '/tests/' }]),
          body:
            `<h1>Praxa's test library</h1><p class="answer">Ready-made skills tests (about 20 minutes each) and job simulations (about 40 minutes) where candidates do real work in realistic tools: spreadsheets, databases, help desks, code editors and more.</p>` +
            byRole
              .map(
                (role) =>
                  `<h2>${esc(role)}</h2><ul class="cards">${libTests
                    .filter((t) => testRole(t) === role)
                    .map((t) => `<li><a href="${testPath(t)}"><strong>${esc(t.title)}</strong></a><span>${isDay(t) ? 'Job simulation' : 'Skills test'}, ${t.estimatedMinutes} min. ${esc(t.description.slice(0, 180))}${t.description.length > 180 ? '…' : ''}</span></li>`)
                    .join('')}</ul>`
              )
              .join(''),
        })
      );

      // Pricing, from the same list Stripe charges from
      const { PLANS } = await load<typeof Plans>('server/plans.ts');
      const lim = (n: number, word: string) => (Number.isFinite(n) ? `${n} ${word}` : `Unlimited ${word}`);
      const tiers = (['free', 'starter', 'growth', 'scale'] as const).map((id) => PLANS[id]);
      await write(
        'pricing/index.html',
        site({
          path: '/pricing/',
          title: 'Pricing | Praxa',
          description: `Praxa pricing: Free for one job, then from £${PLANS.starter.monthly} a month. Or £${PLANS['per-job'].monthly} for a single job. Skills tests and job simulations for hiring.`,
          head:
            crumbs([{ name: 'Pricing', path: '/pricing/' }]) +
            seo.jsonLdScript({
              ...APP,
              offers: tiers.map((p) => ({ '@type': 'Offer', name: p.name, price: String(p.monthly), priceCurrency: 'GBP', description: `${lim(p.jobs, 'open jobs')}, ${lim(p.seats, 'seats')}` })),
            }),
          body:
            `<h1>Pricing</h1><p class="answer">Start free with one open job. Paid plans start at £${PLANS.starter.monthly} a month; a single job is £${PLANS['per-job'].monthly}. Prices exclude VAT.</p>` +
            `<div class="table"><table><thead><tr><th></th>${tiers.map((p) => `<th>${esc(p.name)}</th>`).join('')}</tr></thead><tbody>` +
            `<tr><th scope="row">Price</th>${tiers.map((p) => `<td>${p.monthly ? `£${p.monthly}/month` : 'Free'}</td>`).join('')}</tr>` +
            `<tr><th scope="row">Open jobs</th>${tiers.map((p) => `<td>${Number.isFinite(p.jobs) ? p.jobs : 'Unlimited'}</td>`).join('')}</tr>` +
            `<tr><th scope="row">Candidates per job</th>${tiers.map((p) => `<td>${Number.isFinite(p.applicantsPerJob) ? `First ${p.applicantsPerJob}` : 'Unlimited'}</td>`).join('')}</tr>` +
            `<tr><th scope="row">Team seats</th>${tiers.map((p) => `<td>${Number.isFinite(p.seats) ? p.seats : 'Unlimited'}</td>`).join('')}</tr>` +
            `<tr><th scope="row">AI test building each month</th>${tiers.map((p) => `<td>£${p.aiAllowance / 100}${p.id === 'free' ? ' to try' : ''}</td>`).join('')}</tr>` +
            `<tr><th scope="row">Ready-made job simulations</th>${tiers.map((p) => `<td>${p.features.includes('library-job-sims') ? 'Yes' : '—'}</td>`).join('')}</tr>` +
            `<tr><th scope="row">Search and invite tested candidates</th>${tiers.map((p) => `<td>${p.features.includes('pool-search') ? 'Yes' : '—'}</td>`).join('')}</tr>` +
            `</tbody></table></div><p>Annual billing is ten months' price for twelve. See the full comparison and sign up in the app.</p><p><a class="button" href="/">Start free</a></p>`,
        })
      );

      // About: what Praxa is, in the same words as everywhere else
      await write(
        'about/index.html',
        site({
          path: '/about/',
          title: 'About Praxa: job simulations and skills tests for hiring',
          description: PRAXA_DESCRIPTION,
          head: seo.jsonLdScript(ORG) + seo.jsonLdScript(APP) + crumbs([{ name: 'About', path: '/about/' }]),
          body:
            `<h1>About Praxa</h1><p class="answer">${esc(PRAXA_DESCRIPTION)}</p>` +
            `<h2>What Praxa does</h2><ul>` +
            `<li><strong>For companies:</strong> add ready-made skills tests and job simulations to a job, or describe a role and have Praxa build one. Every applicant does the same realistic tasks, and you see them ranked by score with their work.</li>` +
            `<li><strong>For candidates:</strong> take tests once, keep the scores on your profile, and apply to jobs with them. Your profile lists only skills you have proven in a test.</li></ul>` +
            `<h2>How Praxa tests</h2><ul><li>Hands-on tasks in realistic tools on a desktop: spreadsheet, SQL workbench, code editor, help desk, CRM, chat, documents and more.</li>` +
            `<li>Skills modules take about 20 minutes; job simulations take about 40 minutes in five timed parts: briefing, core task, curveball, juggling, report back.</li>` +
            `<li>Companies choose whether candidates can use an AI assistant in job simulations, and see how they used it.</li></ul>` +
            `<h2>The name</h2><p>Praxa comes from praxis: knowledge put into practice. It is a hiring product, not related to other organisations that share the name.</p>` +
            `<p><a href="/tests/">Browse the test library</a> &middot; <a href="/resources/">Read the resources</a> &middot; <a href="/pricing/">See pricing</a></p>`,
        })
      );

      // The home page: the app, with a plain description inside it for crawlers that don't run JavaScript
      await write(
        'index.html',
        template
          .replace(/<title>.*?<\/title>/, `<title>Praxa: job simulations and skills tests for hiring</title>`)
          .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(PRAXA_DESCRIPTION)}`)
          .replace(/(<meta property="og:title" content=")[^"]*/, `$1Praxa: job simulations and skills tests for hiring`)
          .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(PRAXA_DESCRIPTION)}`)
          .replace(
            '</head>',
            `<link rel="canonical" href="${siteUrl}/" />\n<meta property="og:url" content="${siteUrl}/" />\n` +
              `${seo.jsonLdScript({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Praxa', url: `${siteUrl}/`, description: PRAXA_DESCRIPTION })}\n` +
              `${seo.jsonLdScript(ORG)}\n${seo.jsonLdScript(APP)}\n${STATIC_STYLE}</head>`
          )
          .replace(
            '<div id="root"></div>',
            `<div id="root"><div class="seo-page"><h1>Praxa: job simulations and skills tests for hiring</h1><p>${esc(PRAXA_DESCRIPTION)}</p>` +
              `<h2>How it works</h2><ol><li>Pick ready-made tests for the role, or describe the job and Praxa builds a test or job simulation.</li><li>Every applicant does the same realistic tasks in working tools: spreadsheets, databases, help desks, code editors.</li><li>You see candidates ranked by score, with their work, before you interview.</li></ol>` +
              `<p><a href="/tests/">Test library</a> &middot; <a href="/resources/">Resources</a> &middot; <a href="/pricing/">Pricing</a> &middot; <a href="/about/">About</a> &middot; <a href="/jobs/">Jobs</a> &middot; <a href="/guides/">Guides</a></p></div></div>`
          )
      );

      const urls = [
        { loc: '/', lastmod: undefined as string | undefined },
        { loc: '/jobs/', lastmod: listable.map((j) => j.postedDate).sort().at(-1) },
        ...listable.map((j) => ({ loc: seo.jobPath(j), lastmod: j.postedDate })),
        { loc: '/guides/', lastmod: undefined },
        ...GUIDES.map((g) => ({ loc: guidePath(g), lastmod: undefined })),
        { loc: '/resources/', lastmod: ARTICLES.map((a) => a.updated).sort().at(-1) },
        ...ARTICLES.map((a) => ({ loc: articlePath(a), lastmod: a.updated })),
        { loc: '/tests/', lastmod: undefined },
        ...libTests.map((t) => ({ loc: testPath(t), lastmod: undefined })),
        { loc: '/pricing/', lastmod: undefined },
        { loc: '/about/', lastmod: undefined },
      ];
      await write(
        'sitemap.xml',
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls.map((u) => `  <url><loc>${siteUrl}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n') +
          `\n</urlset>\n`
      );

      // Every crawler is welcome, AI ones named so it's plain they're allowed; the app's private areas are left out
      const bots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bingbot', 'Googlebot'];
      await write(
        'robots.txt',
        `${bots.map((b) => `User-agent: ${b}\nAllow: /\n`).join('\n')}\nUser-agent: *\nAllow: /\nDisallow: /business/\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`
      );

      // https://llmstxt.org: a plain summary AI assistants can read in one go
      await write(
        'llms.txt',
        `# Praxa\n\n> ${PRAXA_DESCRIPTION}\n\n` +
          `Praxa is for hiring teams that want to see what candidates can do before interviewing them. Skills tests take about 20 minutes and are mostly hands-on tasks in realistic tools (spreadsheet, SQL workbench, code editor, help desk, CRM); job simulations take about 40 minutes on a realistic desktop in five timed parts. Companies choose whether candidates can use an AI assistant in job simulations. Pricing: free for one open job; paid plans from £${PLANS.starter.monthly} a month; £${PLANS['per-job'].monthly} for a single job.\n\n` +
          `## Key pages\n\n- [About Praxa](${siteUrl}/about/)\n- [Test library](${siteUrl}/tests/)\n- [Pricing](${siteUrl}/pricing/)\n- [Resources](${siteUrl}/resources/)\n\n` +
          `## Resources\n\n` +
          ARTICLES.map((a) => `- [${a.title}](${siteUrl}${articlePath(a)}): ${a.answer}`).join('\n') +
          `\n\n## Test library\n\n` +
          libTests.map((t) => `- [${t.title}](${siteUrl}${testPath(t)}): ${isDay(t) ? 'job simulation' : 'skills test'}, ${t.estimatedMinutes} min, for ${testRole(t)}. ${t.description}`).join('\n') +
          `\n\n## Open jobs\n\n` +
          listable
            .map((j) => `- [${j.title} at ${j.companyName}](${siteUrl}${seo.jobPath(j)}): ${j.location}, ${j.workType}, ${j.employmentType ?? ''}, ${j.salaryRange}. ${j.description}`)
            .join('\n') +
          `\n\n## Guides\n\n` +
          GUIDES.map((g) => `- [${g.title}](${siteUrl}${guidePath(g)}): ${g.summary}`).join('\n') +
          `\n\n## Pages\n\n- [All jobs](${siteUrl}/jobs/)\n- [All guides](${siteUrl}/guides/)\n- [Sitemap](${siteUrl}/sitemap.xml)\n`
      );

      // The full text of the resources, for assistants that read one file
      await write(
        'llms-full.txt',
        `# Praxa: resources in full\n\n> ${PRAXA_DESCRIPTION}\n\n` +
          ARTICLES.map(
            (a) =>
              `## ${a.title}\n\nSource: ${siteUrl}${articlePath(a)} (updated ${a.updated})\n\n${a.answer}\n\n` +
              a.sections
                .map(
                  (sec) =>
                    `### ${sec.heading}\n\n` +
                    (sec.paragraphs ?? []).join('\n\n') +
                    (sec.list ? `\n${sec.list.map((t, i) => `${sec.numbered ? `${i + 1}.` : '-'} ${t}`).join('\n')}` : '') +
                    (sec.table ? `\n| ${sec.table.head.join(' | ')} |\n|${sec.table.head.map(() => '---').join('|')}|\n${sec.table.rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}` : '')
                )
                .join('\n\n') +
              `\n\n### FAQ\n\n${a.faqs.map((f) => `**${f.q}** ${f.a}`).join('\n\n')}`
          ).join('\n\n---\n\n') +
          '\n'
      );
    },
  };
}

// What Praxa is, in the same words on every page, directory and listing
const PRAXA_DESCRIPTION =
  'Praxa is a job simulation and skills testing platform for hiring. Candidates do realistic, hands-on work in the tools the job uses, and companies compare them on the same tasks before interviewing.';

const niceDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const TOOL: Record<string, string> = { sheet: 'spreadsheet', database: 'SQL workbench', sql: 'SQL', code: 'code editor', app: 'app simulation', desktop: 'full work desktop' };

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="g" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3b6fe0"/><stop offset=".55" stop-color="#8b5cf6"/><stop offset="1" stop-color="#db5a9e"/></linearGradient></defs><rect x="1" y="1" width="22" height="22" rx="6.5" fill="url(#g)"/><path fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" d="M4.6 4.6 7.7 7.7M16 9.6A6.4 6.4 0 0 1 9.6 16M14.13 14.13 19.4 19.4"/><g fill="#fff"><circle cx="9.6" cy="9.6" r="3"/><circle cx="13.92" cy="11.17" r=".95"/><circle cx="12.85" cy="12.85" r=".95"/><circle cx="11.17" cy="13.92" r=".95"/></g></svg>`;

// The static pages' look: readable on any screen, light and quick
const SITE_STYLE = `<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#0f172a;background:#fff}
a{color:#4338ca}.wrap{max-width:780px;margin:0 auto;padding:0 20px}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:14px 24px;border-bottom:1px solid #e2e8f0}
.brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:18px;color:#0f172a;text-decoration:none}
.top nav{display:flex;gap:16px;align-items:center;flex-wrap:wrap;font-size:15px}.top nav a{color:#334155;text-decoration:none}.top nav a:hover{color:#4338ca}
.top .cta,.button{display:inline-block;padding:8px 16px;border-radius:10px;background:#4338ca;color:#fff!important;text-decoration:none;font-weight:600}
main.wrap{padding-top:28px;padding-bottom:48px}h1{font-size:34px;line-height:1.2;margin:8px 0 8px;letter-spacing:-.02em}h2{font-size:22px;margin:32px 0 10px}
.crumbs{font-size:14px;color:#64748b}.meta{color:#64748b;font-size:14px;margin:0 0 16px}
.answer{font-size:19px;color:#1e293b;background:#f8fafc;border-left:4px solid #4338ca;padding:14px 18px;border-radius:0 10px 10px 0}
.table{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:15px;margin:8px 0}th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:left;vertical-align:top}thead th{background:#f1f5f9}tbody th{background:#fafafa;font-weight:600}
.faq dt{font-weight:700;margin-top:14px}.faq dd{margin:4px 0 0}
.cards{list-style:none;padding:0}.cards li{border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:10px 0}.cards li span{display:block;color:#475569;font-size:15px;margin-top:4px}.cards a{text-decoration:none}
.cta-box{margin:32px 0;padding:18px 20px;border-radius:14px;background:#eef2ff}.cta-box p{margin:0 0 10px}
.foot{border-top:1px solid #e2e8f0;padding:20px 0;font-size:14px;color:#475569}
</style>
`;

// The static listing shows for a moment before the app loads, and to crawlers that never run it
const STATIC_STYLE = `<style>
.seo-page{max-width:760px;margin:0 auto;padding:24px 16px;font-family:'Source Sans 3',system-ui,sans-serif;line-height:1.55;color:#0f172a}
.seo-page nav{font-size:14px;color:#64748b;margin-bottom:16px}
.seo-page a{color:#4338ca}
.seo-page h1{font-size:28px;font-weight:700;margin:0 0 4px}
.seo-page h2{font-size:18px;font-weight:700;margin:24px 0 8px}
.seo-page ul{padding-left:20px;list-style:disc}
.seo-page p{margin:8px 0}
.seo-company{font-weight:600;color:#334155}
.seo-apply{display:inline-block;margin-top:12px;padding:10px 18px;border-radius:10px;background:#4338ca;color:#fff!important;text-decoration:none;font-weight:600}
</style>
`;
