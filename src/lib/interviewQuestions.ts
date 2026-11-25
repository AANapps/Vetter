/**
 * Interview questions drawn from what the candidate actually did on a test or job simulation, with no AI: what they
 * missed, how they approached their best task, how they used the AI assistant. Asked in the interview, they show
 * whether the work was theirs and whether they understand it.
 */
import { AnswerRecord } from './submissions';

const short = (s: string, n = 80) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function interviewQuestions(answers: AnswerRecord[], max = 5): string[] {
  const tasks = answers.filter((a) => a.type !== 'case');
  const out: string[] = [];

  // What they missed: one failed check from each of the two weakest tasks
  const missed = tasks
    .flatMap((a) => (a.checks ?? []).filter((c) => !c.passed).slice(0, 1).map((c) => ({ a, c })))
    .sort((x, y) => x.a.score - y.a.score)
    .slice(0, 2);
  for (const { a, c } of missed)
    out.push(`In “${short(a.title)}”, this check wasn't met: ${short(c.description, 120)}. Talk me through what you did there and how you'd check it now.`);

  // Their best piece of work: how they did it, so it's clear the work was theirs
  const best = [...tasks].filter((a) => a.score >= 70 && a.type !== 'choice' && a.type !== 'multi').sort((x, y) => y.score * y.weight - x.score * x.weight)[0];
  if (best) out.push(`You did well on “${short(best.title)}”. Walk me through how you approached it, step by step. What would you do with another hour?`);

  // The AI assistant: what they checked before trusting it
  const withAi = tasks.find((a) => a.answer.includes('--- Used the AI assistant'));
  if (withAi) out.push(`You used the AI assistant on “${short(withAi.title)}”. What did you ask it, and what did you check before using its answer?`);

  // A written answer that fell short: what they'd change
  const written = tasks.filter((a) => ['written', 'email', 'text', 'scenario'].includes(a.type) && a.score < 70).sort((x, y) => x.score - y.score)[0];
  if (written) out.push(`Looking back at your answer to “${short(written.title)}”, what would you change before sending it?`);

  // A choice they got wrong: the reasoning behind it
  const wrongChoice = tasks.find((a) => (a.type === 'choice' || a.type === 'multi') && a.score < 50);
  if (wrongChoice) out.push(`On “${short(wrongChoice.title)}” you chose “${short(wrongChoice.answer, 60)}”. Why that one?`);

  if (!out.length) out.push('Pick the task you found hardest and walk me through how you worked through it.');
  return out.slice(0, max);
}
