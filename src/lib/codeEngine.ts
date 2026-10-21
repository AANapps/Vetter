import { TestCase } from '../types';

export interface CodeExecutionResult {
  allPassed: boolean;
  score: number; // 0 - 100
  testCaseResults: {
    id: string;
    description: string;
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
    executionMs: number;
    error?: string;
  }[];
  logs: string[];
  totalExecutionTimeMs: number;
}

// JSON with object keys sorted, so { a, b } and { b, a } compare equal
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v
  );

export function runJavaScriptCode(
  code: string,
  testCases: TestCase[],
  entryFunctionName: string = 'solution'
): CodeExecutionResult {
  const logs: string[] = [];
  const testCaseResults: CodeExecutionResult['testCaseResults'] = [];
  const startTime = performance.now();

  // Intercept console.log safely
  const customConsole = {
    log: (...args: any[]) => {
      logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    },
    warn: (...args: any[]) => {
      logs.push('[WARN] ' + args.join(' '));
    },
    error: (...args: any[]) => {
      logs.push('[ERROR] ' + args.join(' '));
    },
  };

  let fn: Function | null = null;
  try {
    // Sandboxed function constructor
    const factory = new Function('console', `${code}\n\nreturn typeof ${entryFunctionName} === 'function' ? ${entryFunctionName} : null;`);
    fn = factory(customConsole);

    if (!fn) {
      throw new Error(`Function "${entryFunctionName}" was not found or is not defined.`);
    }
  } catch (err: any) {
    return {
      allPassed: false,
      score: 0,
      testCaseResults: testCases.map((tc) => ({
        id: tc.id,
        description: tc.description,
        passed: false,
        input: tc.input,
        expected: tc.expectedOutput,
        actual: '',
        executionMs: 0,
        error: `Syntax or compilation error: ${err.message}`,
      })),
      logs,
      totalExecutionTimeMs: Math.round(performance.now() - startTime),
    };
  }

  let passedCount = 0;

  for (const tc of testCases) {
    const tcStart = performance.now();
    try {
      // Parse input
      let parsedInput: any;
      try {
        parsedInput = JSON.parse(tc.input);
      } catch {
        parsedInput = tc.input;
      }

      const rawResult = Array.isArray(parsedInput) ? fn(...parsedInput) : fn(parsedInput);
      const actualStr = JSON.stringify(rawResult);
      const expectedClean = tc.expectedOutput.trim();

      // Flexible check: JSON exact match or string equality
      let isMatch = false;
      try {
        const expectedParsed = JSON.parse(expectedClean);
        isMatch = canonical(rawResult) === canonical(expectedParsed);
      } catch {
        isMatch = String(rawResult).trim() === expectedClean;
      }

      if (isMatch) passedCount++;

      testCaseResults.push({
        id: tc.id,
        description: tc.description,
        passed: isMatch,
        input: tc.input,
        expected: tc.expectedOutput,
        actual: actualStr !== undefined ? actualStr : String(rawResult),
        executionMs: Math.max(1, Math.round(performance.now() - tcStart)),
      });
    } catch (err: any) {
      testCaseResults.push({
        id: tc.id,
        description: tc.description,
        passed: false,
        input: tc.input,
        expected: tc.expectedOutput,
        actual: 'Error thrown',
        executionMs: Math.round(performance.now() - tcStart),
        error: err.message,
      });
    }
  }

  const score = testCases.length > 0 ? Math.round((passedCount / testCases.length) * 100) : 100;

  return {
    allPassed: passedCount === testCases.length,
    score,
    testCaseResults,
    logs,
    totalExecutionTimeMs: Math.round(performance.now() - startTime),
  };
}
