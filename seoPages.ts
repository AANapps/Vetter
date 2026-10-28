import fs from 'fs/promises';
import path from 'path';
import { Plugin, runnerImport } from 'vite';
import type { Business, JobPosting } from './src/types';
import type * as JobSeo from './src/lib/jobSeo';

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
              `<nav><a href="/">Vetter</a> &rsaquo; <a href="/jobs/">Jobs</a></nav><main><article>` +
              `<h1>${esc(job.title)}</h1><p class="seo-company">${esc(job.companyName)}${job.department ? ` &middot; ${esc(job.department)}` : ''}</p>` +
              `<p>${facts.join(' &middot; ')}</p>` +
              `<p>Posted ${esc(job.postedDate)}${job.closingDate ? ` &middot; Closes ${esc(job.closingDate)}` : ''}${job.startDate ? ` &middot; Starts ${esc(job.startDate)}` : ''}</p>` +
              (open ? '' : '<p><strong>This job is no longer taking applications.</strong></p>') +
              seo.jobDescriptionHtml(job) +
              (open ? `<p><a class="seo-apply" href="${seo.jobPath(job)}">Apply on Vetter</a></p>` : '') +
              `</article>${others.length ? `<aside><h2>More jobs on Vetter</h2><ul>${others.map(jobCard).join('')}</ul></aside>` : ''}</main>`,
          })
        );
      }

      await write(
        'jobs/index.html',
        page({
          path: '/jobs/',
          title: `${listable.length} tech jobs hiring now: apply with a verified skills test | Vetter`,
          description: `Browse ${listable.length} open engineering, data and analyst jobs at ${[...new Set(listable.map((j) => j.companyName))].join(', ')}. Prove your skills with one test and apply on Vetter.`,
          head: crumbs([{ name: 'Jobs', path: '/jobs/' }]),
          body:
            `<nav><a href="/">Vetter</a> &rsaquo; Jobs</nav><main><h1>Jobs on Vetter</h1>` +
            `<p>Every job on Vetter is filled on skill: take the job's test, and your verified score goes straight to the company.</p>` +
            `<ul>${listable.map(jobCard).join('')}</ul></main>`,
        })
      );

      // The home page names itself and the site for search engines
      await write(
        'index.html',
        template.replace(
          '</head>',
          `<link rel="canonical" href="${siteUrl}/" />\n<meta property="og:url" content="${siteUrl}/" />\n` +
            `${seo.jsonLdScript({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Vetter', url: `${siteUrl}/` })}\n` +
            `${seo.jsonLdScript({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Vetter', url: `${siteUrl}/` })}\n</head>`
        )
      );

      const urls = [
        { loc: '/', lastmod: undefined as string | undefined },
        { loc: '/jobs/', lastmod: listable.map((j) => j.postedDate).sort().at(-1) },
        ...listable.map((j) => ({ loc: seo.jobPath(j), lastmod: j.postedDate })),
      ];
      await write(
        'sitemap.xml',
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls.map((u) => `  <url><loc>${siteUrl}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n') +
          `\n</urlset>\n`
      );

      // Every crawler is welcome, AI ones included
      await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);

      // https://llmstxt.org: a plain summary AI assistants can read in one go
      await write(
        'llms.txt',
        `# Vetter\n\n> Skills-based hiring: candidates take standardised skills tests, and companies hire on verified scores instead of CVs.\n\n` +
          `## Open jobs\n\n` +
          listable
            .map((j) => `- [${j.title} at ${j.companyName}](${siteUrl}${seo.jobPath(j)}): ${j.location}, ${j.workType}, ${j.employmentType ?? ''}, ${j.salaryRange}. ${j.description}`)
            .join('\n') +
          `\n\n## Pages\n\n- [All jobs](${siteUrl}/jobs/)\n- [Sitemap](${siteUrl}/sitemap.xml)\n`
      );
    },
  };
}

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
