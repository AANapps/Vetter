/**
 * Praxa's curveball library: proven ways a job simulation's day changes or goes wrong, by kind of job. The planner
 * picks one that fits the role and adapts it to the company, so curveballs are realistic and markable rather than
 * invented from scratch each time. Add to it as real customers' simulations show what works.
 */
export const CURVEBALLS: Record<string, string[]> = {
  'Data and analysis': [
    'a source file is corrected (a store\'s figures were double-counted) and the totals already sent must change',
    'the manager changes the question: same data, a different cut (by region instead of by product)',
    'a second extract arrives with a different column layout or date format that must be lined up',
    'a stakeholder disputes a number and the analyst must trace it back to the raw data',
  ],
  'Customer support': [
    'a known outage or bug starts and several tickets about it arrive at once',
    'a VIP or account-security ticket jumps the queue with an SLA about to breach',
    'a policy change lands mid-shift (a new refund limit) and open replies must follow it',
    'a customer replies angrily to an earlier answer and asks for a manager',
  ],
  'Sales and customer success': [
    'a big deal\'s champion leaves the customer and the next step must change',
    'a customer threatens to cancel at renewal over a missed promise',
    'pricing or a discount rule changes and a quote already sent must be fixed',
    'two meetings clash and one prospect must be moved without losing them',
  ],
  'Software and technical': [
    'a bug report from production lands that the code just changed may have caused',
    'a requirement changes after review (a new field, a different rule)',
    'a dependency or API starts returning errors or a new format',
    'a teammate\'s change conflicts with theirs',
  ],
  'Operations and admin': [
    'a supplier misses a delivery and the plan must be redone',
    'a booking or rota clash appears and someone must be moved',
    'an invoice or order figure turns out wrong after it was approved',
    'an urgent request from a senior manager cuts the time left',
  ],
};

export const curveballGuide = () =>
  Object.entries(CURVEBALLS)
    .map(([family, list]) => `  ${family}: ${list.join('; ')}.`)
    .join('\n');
