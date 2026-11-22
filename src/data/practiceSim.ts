import { AssessmentTest } from '../types';
import { DesktopConfig } from '../lib/desktop';
import { workbookStarter } from '../lib/spreadsheet';
import { tc } from './simulationKit';

/**
 * A 3-minute practice on the job simulation desktop, offered before the real one: the same desktop and timed parts,
 * dummy data, one tiny task and an email that lands mid-way. Never scored or saved, and not in the library (so never
 * on a profile or a leaderboard). It's there so a first-timer isn't marked on learning the screen.
 */

const ME = 'you@practice.example';
const ALEX = 'alex@practice.example';

const desktop: DesktopConfig = {
  user: { name: 'You', email: ME, role: 'Practice' },
  company: 'Practice Co',
  time: 'Mon 09:00',
  apps: ['mail', 'sheet', 'files'],
  contacts: [{ name: 'Alex Green', role: 'Your manager', email: ALEX }],
  workbook: workbookStarter([
    {
      name: 'Orders',
      rows: [
        ['Day', 'Orders'],
        ['Mon', 12],
        ['Tue', 9],
        ['Wed', 15],
        ['Total', ''],
      ],
    },
  ]),
  workbookName: 'practice_orders',
  inbox: [
    {
      id: 'p-start',
      from: `Alex Green <${ALEX}>`,
      to: [ME],
      date: 'Mon 08:55',
      subject: 'Your practice task',
      body: 'Hi,\n\nOpen the Spreadsheet and put the total of the orders in B5. A formula like =SUM(B2:B4) is best.\n\nWhen you’re done, press “Move on to A new email” at the top, or wait for the clock.\n\nAlex',
    },
    {
      id: 'p-curveball',
      phase: 'email',
      from: `Alex Green <${ALEX}>`,
      to: [ME],
      date: 'Mon 09:02',
      subject: 'Quick one',
      body: 'Thanks! Could you reply to this email with the total? One line is fine. Then press Submit.\n\nAlex',
    },
  ],
  replies: [{ id: 'p-thanks', to: ALEX, reply: { from: `Alex Green <${ALEX}>`, subject: 'Re: Quick one', body: 'Got it, thanks. That’s the practice done: press Submit.\n\nAlex' } }],
  phases: [
    {
      id: 'try',
      title: 'Try the desktop',
      minutes: 2,
      scored: true,
      brief: 'Read Alex’s email in Mail, then put the total of the orders in B5 of the Spreadsheet.',
    },
    {
      id: 'email',
      title: 'A new email',
      minutes: 1,
      scored: true,
      brief: 'A new email has just landed, as they do in the real day. Reply to Alex with the total.',
    },
  ],
};

export const PRACTICE_SIM_ID = 'practice-job-sim';

export const PRACTICE_SIM: AssessmentTest = {
  id: PRACTICE_SIM_ID,
  title: 'Job simulation practice',
  description: 'A 3-minute practice on the job simulation desktop. Not scored or saved.',
  skillsTested: [],
  type: 'standard',
  category: 'Data Analysis',
  difficulty: 'Junior',
  passingScore: 0,
  questions: [
    {
      id: 'practice-day',
      title: 'Practice: a tiny day at Practice Co',
      type: 'desktop',
      prompt:
        'This is a practice: nothing is scored or saved. It works like the real job simulation, only shorter: two timed parts, each with its task at the top of the desktop. A new email lands when the second part starts.',
      starterCode: '',
      desktop,
      testCases: [
        { ...tc('tc-practice-1', 'The total is in B5', 'sheet:=Orders!B5', '36') },
        // Checked without the AI, so the practice costs nothing to mark
        { ...tc('tc-practice-2', 'You replied to Alex', `sent:${ALEX}`, 'true') },
      ],
      timeLimitMinutes: 4,
      weight: 100,
    },
  ],
  totalQuestions: 1,
  estimatedMinutes: 3,
};
