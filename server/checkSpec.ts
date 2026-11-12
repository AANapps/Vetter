import Anthropic from '@anthropic-ai/sdk';
import { meter } from './meter.js';
import { MAX_PROMPT, PRICES, apiFailure } from './generateTest.js';

/**
 * Checks an app simulation's spec against how the job is really done, before its page is built (server/buildApp.ts).
 * The reviewer reads it as someone who does the job for a living would: a task from another role, a step in the wrong
 * order, a made-up term or a value no one would see is fixed in the spec, so the page is built right the first time.
 */

export interface CheckSpecRequest {
  job?: string;
  jobTitle?: string;
  // What the company has said in the conversation
  brief?: string;
  research?: string;
  // The job simulation the task sits in
  setting?: string;
  question: { title: string; prompt: string; appHtml: string; testCases: { description: string; input: string; expectedOutput: string }[] };
  // The other questions about this task, which must still fit it
  related?: { title: string; prompt: string }[];
}

const MAX_TEXT = 16000;

const testCase = {
  type: 'object',
  properties: { description: { type: 'string' }, input: { type: 'string' }, expectedOutput: { type: 'string' } },
  required: ['description', 'input', 'expectedOutput'],
  additionalProperties: false,
};
const schema = {
  type: 'object',
  properties: {
    // What was wrong, one a line, or none
    problems: { type: 'array', items: { type: 'string' } },
    prompt: { type: 'string' },
    appHtml: { type: 'string' },
    testCases: { type: 'array', items: testCase },
  },
  required: ['problems', 'prompt', 'appHtml', 'testCases'],
  additionalProperties: false,
};

const instructions = (req: CheckSpecRequest) => `You are an experienced ${req.jobTitle || 'professional in this job'} reviewing an interactive simulation written for a
skills test, before it's built. Candidates will be judged on it, so it must be exact: someone who does this job for a living must
recognise every task and find nothing wrong.

You get the task as the candidate reads it (prompt), the spec the page is built from (appHtml: a description of the page,
not code) and the checks run on the page's state (testCases). Read them as that professional would and look for:
- tasks that aren't this job's at this level, or belong to another role (e.g. spreadsheet or office-software work for
  a trade, clinical or floor job, whose tasks must be the hands-on fundamentals of the job itself)
- tools, instruments or parts that aren't named on the page or wouldn't be recognised: the spec must say each is drawn
  as its classic outline with its name written beside it
- steps, procedures or workflows that aren't how they're really done, or are in the wrong order
- terms, abbreviations, notation, codes, forms or software screens that are wrong or invented
- values, quantities, times and situations no one in the job would see
- rules, standards or safety steps that are missing or wrong
- checks that reward the wrong answer, or a "correct" answer a professional would disagree with
- a task that can't be done from what the page gives the candidate
A task titled "Skills game: ..." (one a company asked for by name) is a gamified test of general abilities (multitasking, attention to detail, verbal
reasoning...) and deliberately needn't relate to the job: don't make it about the job. Check instead that each round
really measures the ability it names, is fair and the same for everyone, has exactly one right answer per item, and that
the checks match those answers.
Use the RESEARCH and your own knowledge of the job; where they disagree, trust what is current practice where the company is
(the UK if unclear).

If nothing is wrong, send problems [] and the prompt, appHtml and testCases back exactly as they are. Otherwise list each
problem in a line, and send them back fixed: change only what's needed, keep the same scope, length, names, people and
everything else the RELATED QUESTIONS rely on, and keep the checks' paths and format so the builder can use them.
${req.research ? `\nRESEARCH on the job and what the simulation copies:\n${req.research.slice(0, MAX_TEXT)}` : ''}`;

export async function checkSpec(body: unknown, apiKey: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = body as CheckSpecRequest;
  if (!req?.question?.appHtml) return { status: 400, json: { error: 'Nothing to check.' } };
  if (!apiKey) return { status: 503, json: { error: 'not-configured' } };

  const content = [
    req.job ? `THE JOB:\n${req.job.slice(0, MAX_PROMPT)}` : '',
    req.brief ? `WHAT THE COMPANY SAID:\n${req.brief.slice(0, 8000)}` : '',
    req.setting ? `THE JOB SIMULATION:\n${req.setting.slice(0, 4000)}` : '',
    `THE TASK: ${req.question.title}\n\nprompt:\n${req.question.prompt}\n\nappHtml (the spec):\n${req.question.appHtml.slice(0, 30000)}\n\ntestCases:\n${JSON.stringify(req.question.testCases ?? [])}`,
    req.related?.length ? `RELATED QUESTIONS (about this task):\n${req.related.map((q) => `- ${q.title}: ${q.prompt}`).join('\n').slice(0, 8000)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const client = new Anthropic({ apiKey });
  try {
    const message = await client.beta.messages
      .stream({
        model,
        max_tokens: 32000,
        // Medium: the thinking is the point of the check, and it writes back no more than the spec
        output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
        ...(!model.includes('haiku') && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
        system: instructions(req),
        messages: [{ role: 'user', content }],
      })
      .finalMessage();
    meter(model, message.usage);
    const price = PRICES[model];
    const { input_tokens, output_tokens } = message.usage;
    if (price) console.log(`[check-spec] ${input_tokens} in, ${output_tokens} out: $${((input_tokens * price.input + output_tokens * price.output) / 1e6).toFixed(3)}`);
    if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') return { status: 502, json: { error: 'The check came back incomplete.' } };
    const out = JSON.parse(message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join(''));
    if (out.problems?.length) console.log(`[check-spec] ${req.question.title}: fixed ${out.problems.length}: ${out.problems.join(' | ')}`);
    return { status: 200, json: out };
  } catch (err) {
    return apiFailure('check-spec', err);
  }
}
