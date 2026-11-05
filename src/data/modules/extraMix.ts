import { Question } from '../../types';
import { match, multi, order } from '../questionKit';
import { J, tagged } from './kit';

// Drag-and-drop and select-all questions for modules whose banks were short of them, so every level can ask two of
// each (see LEVEL_MIX in lib/modules.ts). Junior questions are also drawn on by the higher levels.

export const EXTRA_MIX: Record<string, Question[]> = {
  'test-excel-02': tagged(
    'pivots',
    J,
    order('x-ex2-o1', 'Build the PivotTable', 'Put the steps to build a PivotTable of sales by region and month in order.', [
      'Format the data as a Table',
      'Insert a PivotTable from the Table',
      'Drag Region to Rows',
      'Drag Month to Columns',
      'Drag Sales to Values, summarised as Sum',
      'Refresh it when new rows are added',
    ])
  ),
  'test-sql-03': tagged(
    'windows',
    J,
    match('x-sq3-m1', 'Ranking Functions', 'Match each window function to what it returns.', [
      ['ROW_NUMBER()', 'A unique running number for each row, even on ties'],
      ['RANK()', 'The same rank for ties, with gaps after them'],
      ['DENSE_RANK()', 'The same rank for ties, with no gaps'],
      ['LAG(col)', 'The value from the previous row'],
    ])
  ),
  'test-pbi-02': tagged(
    'time',
    J,
    match('x-pb2-m1', 'Time Intelligence', 'Match each DAX function to what it does.', [
      ['TOTALYTD', 'A year-to-date total'],
      ['SAMEPERIODLASTYEAR', 'The same dates, one year earlier'],
      ['DATEADD', 'Shifts the dates by a set interval'],
      ['CALCULATE', 'Evaluates an expression with changed filters'],
    ])
  ),
  'test-tab-02': tagged(
    'lod',
    J,
    match('x-tb2-m1', 'LOD Expressions', 'Match each calculation to what it does.', [
      ['FIXED', 'Computes at the stated dimensions, whatever is in the view'],
      ['INCLUDE', 'Adds dimensions to the view’s level of detail'],
      ['EXCLUDE', 'Removes dimensions from the view’s level of detail'],
      ['WINDOW_SUM', 'A table calculation across the rows in the view'],
    ])
  ),
  'test-py-02': tagged(
    'time',
    J,
    match('x-py2-m1', 'Time Series in pandas', 'Match each line to what it gives you.', [
      ["df.resample('M').sum()", 'Monthly totals from daily rows'],
      ["df['sales'].rolling(7).mean()", 'A 7-day moving average'],
      ["df['sales'].pct_change()", 'The change from the previous row, as a fraction'],
      ["df['sales'].shift(1)", 'The previous row’s value'],
    ])
  ),
  'test-dash-02': tagged(
    'story',
    J,
    order('x-ds2-o1', 'A Findings Update', 'Put the parts of a findings update for a manager in order.', [
      'Lead with the answer',
      'Give the evidence, one chart per point',
      'Say what it means for the business',
      'Recommend the action',
      'Say what’s still uncertain and what you’ll check next',
    ])
  ),
  'test-sim-da-02': tagged(
    'scope',
    J,
    order('x-sd2-o1', 'Investigating Returns', 'Put the steps of the returns investigation in order.', [
      'Agree the question and the measure (return rate per order)',
      'Check the data: duplicates, missing reasons, test orders',
      'Break the return rate down by category and size',
      'Compare before and after the size guide, against a group without it',
      'Recommend, and size the impact',
    ])
  ),
  'test-stats-01': tagged(
    'infer',
    J,
    multi(
      'x-st-mu1',
      'A Confidence Interval',
      'Average basket value is £42 with a 95% confidence interval of £39 to £45. Which statements are true? Tick all that apply.',
      [
        'If we sampled again and again, about 95% of intervals made this way would contain the true average',
        'A bigger sample would usually make the interval narrower',
        'Any single customer has a 95% chance of spending between £39 and £45',
        'The interval is centred on the sample average',
        'It proves the true average is exactly £42',
      ],
      [0, 1, 3]
    ),
    multi(
      'x-st-mu2',
      'Skewed Salaries',
      'A team of 10 earns between £28k and £40k, and the director earns £400k. Which statements are true? Tick all that apply.',
      [
        'The mean is pulled up by the director’s salary',
        'The median is a fairer summary of a typical salary here',
        'The mean and median will be the same',
        'Leaving the director out would change the mean a lot but the median very little',
        'The range is the best single summary of a typical salary',
      ],
      [0, 1, 3]
    )
  ),
  'test-prog-01': [
    ...tagged(
      'basics',
      J,
      multi('x-pg-mu1', 'Falsy Values', 'Which of these values are falsy in JavaScript? Tick all that apply.', ['0', '"" (an empty string)', 'null', '"0"', '[] (an empty array)', 'NaN'], [0, 1, 2, 5])
    ),
    ...tagged(
      'functions',
      J,
      match('x-pg-m1', 'Array Methods', 'Match each array method to what it returns.', [
        ['map', 'A new array of the same length, each item transformed'],
        ['filter', 'A new array of the items that pass a test'],
        ['reduce', 'One value built up from all the items'],
        ['find', 'The first item that passes a test, or undefined'],
      ])
    ),
    ...tagged(
      'async',
      J,
      order(
        'x-pg-o1',
        'try, catch, finally',
        `What does this log, in order?

function run() {
  try { console.log('try'); throw new Error('x'); }
  catch (e) { console.log('catch'); }
  finally { console.log('finally'); }
  console.log('after');
}
run();`,
        ['try', 'catch', 'finally', 'after']
      )
    ),
  ],
  'test-debug-01': tagged(
    'read',
    J,
    match('x-db-m1', 'Errors and Causes', 'Match each error to its most likely cause.', [
      ['TypeError: x is not a function', 'Calling something that isn’t a function, e.g. a typo or a missing import'],
      ['ReferenceError: total is not defined', 'Using a variable that was never declared, or is out of scope'],
      ['SyntaxError: Unexpected token }', 'A missing or extra bracket'],
      ['RangeError: Maximum call stack size exceeded', 'Recursion that never stops'],
    ])
  ),
  'test-dsa-01': tagged(
    'complexity',
    J,
    multi(
      'x-ds-mu1',
      'Constant Time',
      'Which operations take constant time, O(1), on average? Tick all that apply.',
      ['Getting a value from a Map by key', 'Checking whether a Set has an item', 'Pushing onto the end of an array', 'Array includes', 'Removing the first item of an array with shift', 'Sorting an array'],
      [0, 1, 2]
    )
  ),
};
