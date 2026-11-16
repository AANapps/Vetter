import { AssessmentTest, Question, TestRole, TestScenario } from '../../types';

/**
 * Shared pieces for the module tests built like the Data Analyst ones: a coding task in which one program answers four
 * numbered questions, and the module test itself (question sets first, practical tasks last, 20 minutes, marks out of
 * 100).
 *
 * A program task's input is the question (q1 to q4) on its first line, then the data; each question is run on two data
 * sets and marked on its own. The expected output is hidden, since printing it is the task.
 */

export const TASK_WEIGHT = 30;
export const TASK_MINUTES = 5;

export const programTask = (cfg: {
  id: string;
  title: string;
  language: string;
  prompt: string;
  // One line per question, shown in the starter's branches
  questions: string[];
  // Two (or more) data sets, each as the text after the question line
  data: [name: string, input: string][];
  // The right output for each question, from the data
  expected: ((input: string) => string)[];
  solution: string;
  // The code the candidate starts from; by default a skeleton with a branch per question
  starter?: string;
}): Question => ({
  id: cfg.id,
  title: cfg.title,
  type: 'code',
  language: cfg.language,
  prompt: cfg.prompt,
  starterCode: cfg.starter ?? jsStarter(cfg.questions),
  solutionCode: cfg.solution,
  testCases: cfg.expected.flatMap((_, q) =>
    cfg.data.map(([name, input], f) => ({
      id: `tc-${cfg.id}-${q + 1}-${f + 1}`,
      description: `Q${q + 1} · ${name}`,
      input: `q${q + 1}\n${input}`,
      expectedOutput: cfg.expected[q](input),
      isHidden: true,
    }))
  ),
  timeLimitMinutes: TASK_MINUTES,
  weight: TASK_WEIGHT,
});

export const jsStarter = (questions: string[]) => `const [question, ...rest] = require('fs').readFileSync(0, 'utf8').split('\\n');
const data = JSON.parse(rest.join('\\n'));

${questions.map((q, i) => `${i ? 'else if' : 'if'} (question === 'q${i + 1}') {\n  // Q${i + 1}: ${q}\n}`).join('\n')}
`;

// A module test made for a field: the question sets first, then the practical tasks, marks scaled to 100
export const fieldModule = (cfg: {
  id: string;
  skill: string;
  field: string;
  category: AssessmentTest['category'];
  roles: TestRole[];
  description: string;
  skillsTested: string[];
  scenario: TestScenario;
  sets: Question[];
  tasks: Question[];
}): AssessmentTest => {
  const raw = [...cfg.sets, ...cfg.tasks];
  const total = raw.reduce((n, q) => n + q.weight, 0) || 1;
  const questions = raw.map((q) => ({ ...q, weight: Math.round((q.weight / total) * 100) }));
  const drift = 100 - questions.reduce((n, q) => n + q.weight, 0);
  if (drift) questions.reduce((a, b) => (b.weight > a.weight ? b : a)).weight += drift;
  return {
    id: cfg.id,
    title: `${cfg.skill} for ${cfg.field}`,
    module: { skill: cfg.skill, field: cfg.field },
    description: cfg.description,
    skillsTested: cfg.skillsTested,
    roles: cfg.roles,
    type: 'standard',
    category: cfg.category,
    difficulty: 'Professional',
    passingScore: 70,
    scenario: cfg.scenario,
    questions,
    totalQuestions: questions.filter((q) => q.type !== 'case').length,
    estimatedMinutes: 20,
  };
};
