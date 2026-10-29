import { User, AssessmentTest, JobPosting, Business } from '../types';
import CANDIDATE_AVATAR from '../assets/images/candidate_avatar_dev_1792329815461.jpg';
import RECRUITER_AVATAR from '../assets/images/recruiter_avatar_tech_1792329815454.jpg';
import { ROLE_ASSESSMENTS } from './roleTests';
import { INDUSTRY_TESTS } from './industryTests';
import { SIMULATION_TESTS } from './simulationTests';
import { ANALYSIS_SIMULATIONS } from './analysisSimulations';
import { withLevelVersions } from './levelVersions';
import { SEED_INVITATIONS } from './seedInvitations';

// Seed each candidate's test history from the tests behind their verified skills
const withTestResults = (user: Omit<User, 'testResults'>): User => ({
  ...user,
  testResults: user.verifiedSkills.map((s) => ({ testId: s.testId, score: s.score, completedAt: s.verifiedAt })),
});

export const INITIAL_CANDIDATE: User = withTestResults({
  id: 'cand-001',
  name: 'Elena Rostova',
  email: 'elena.rostova@engineer.dev',
  role: 'candidate',
  avatarUrl: CANDIDATE_AVATAR,
  title: 'Senior Full-Stack & Data Engineer',
  location: 'San Francisco, CA',
  yearsExperience: 6,
  workPreference: 'Remote',
  bio: 'Specialized in distributed data ingestion, PostgreSQL tuning, and resilient React architectures. Proven track record scaling real-time web applications to 50M+ requests/day.',
  verifiedSkills: [
    {
      skillId: 'skill-sql',
      skillName: 'SQL & Databases',
      category: 'Databases',
      score: 96,
      percentile: 99.2,
      verifiedAt: '2026-09-14',
      testId: 'test-sql-01',
      level: 'Staff / Lead',
      history: [
        { date: '2026-08-10', score: 86, testName: 'SQL Foundations' },
        { date: '2026-09-14', score: 96, testName: 'Advanced SQL & Analytics Engineering' },
      ],
    },
    {
      skillId: 'skill-frontend',
      skillName: 'Frontend Engineering',
      category: 'Frontend',
      score: 89,
      percentile: 92.4,
      verifiedAt: '2026-09-22',
      testId: 'test-fe-01',
      level: 'Senior',
      history: [
        { date: '2026-09-22', score: 89, testName: 'Modern Frontend & State Architecture' },
      ],
    },
    {
      skillId: 'skill-backend',
      skillName: 'Backend APIs',
      category: 'Backend APIs',
      score: 82,
      percentile: 85.0,
      verifiedAt: '2026-10-02',
      testId: 'test-be-01',
      level: 'Mid',
      history: [
        { date: '2026-10-02', score: 82, testName: 'Robust REST & gRPC API Design' },
      ],
    },
  ],
  appliedJobIds: ['job-001'],
  jobProfiles: [
    {
      id: 'profile-data',
      name: 'Data',
      title: 'Data Engineer',
      bio: 'Distributed data ingestion and PostgreSQL tuning. I build pipelines and warehouses that analysts can trust.',
      skillIds: ['skill-sql', 'skill-backend'],
    },
    {
      id: 'profile-software',
      name: 'Software engineering',
      title: 'Senior Full-Stack Engineer',
      bio: 'Resilient React architectures and the APIs behind them. Scaled real-time web applications to 50M+ requests/day.',
      skillIds: ['skill-frontend', 'skill-backend', 'skill-sql'],
    },
  ],
  activeProfileId: 'profile-data',
  applicationProfiles: { 'job-001': 'profile-data' },
});

export const OTHER_CANDIDATES: User[] = ([
  {
    id: 'cand-002',
    name: 'Marcus Chen',
    email: 'marcus.chen@sys.io',
    role: 'candidate',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    title: 'Staff Distributed Systems Engineer',
    location: 'Seattle, WA',
    yearsExperience: 8,
    workPreference: 'Remote',
    bio: 'Consensus protocols, Raft implementations, low-latency key-value stores in Go and Rust.',
    verifiedSkills: [
      {
        skillId: 'skill-sys',
        skillName: 'System Architecture',
        category: 'System Architecture',
        score: 97,
        percentile: 99,
        verifiedAt: '2026-10-01',
        testId: 'test-sys-01',
        level: 'Staff / Lead',
        history: [{ date: '2026-10-01', score: 97, testName: 'Distributed Systems & Concurrency' }],
      },
      {
        skillId: 'skill-backend',
        skillName: 'Backend APIs',
        category: 'Backend APIs',
        score: 91,
        percentile: 95,
        verifiedAt: '2026-09-28',
        testId: 'test-be-01',
        level: 'Senior',
        history: [{ date: '2026-09-28', score: 91, testName: 'Robust REST & gRPC API Design' }],
      },
      {
        skillId: 'skill-sql',
        skillName: 'SQL & Databases',
        category: 'Databases',
        score: 88,
        percentile: 91,
        verifiedAt: '2026-09-15',
        testId: 'test-sql-01',
        level: 'Senior',
        history: [{ date: '2026-09-15', score: 88, testName: 'Advanced SQL & Analytics Engineering' }],
      },
    ],
    appliedJobIds: ['job-002'],
  },
  {
    id: 'cand-003',
    name: 'Chloe Dubois',
    email: 'chloe.dubois@datacraft.fr',
    role: 'candidate',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    title: 'Lead Data Infrastructure Architect',
    location: 'New York, NY',
    yearsExperience: 7,
    workPreference: 'Hybrid',
    bio: 'Data mesh architecture, Apache Spark/Flink, dimensional modeling, automated lineage tracking.',
    verifiedSkills: [
      {
        skillId: 'skill-sql',
        skillName: 'SQL & Databases',
        category: 'Databases',
        score: 96,
        percentile: 99,
        verifiedAt: '2026-09-10',
        testId: 'test-sql-01',
        level: 'Staff / Lead',
        history: [{ date: '2026-09-10', score: 96, testName: 'Advanced SQL & Analytics Engineering' }],
      },
      {
        skillId: 'skill-sys',
        skillName: 'System Architecture',
        category: 'System Architecture',
        score: 85,
        percentile: 89,
        verifiedAt: '2026-09-18',
        testId: 'test-sys-01',
        level: 'Senior',
        history: [{ date: '2026-09-18', score: 85, testName: 'Distributed Systems & Concurrency' }],
      },
    ],
    appliedJobIds: ['job-001', 'job-003'],
  },
  {
    id: 'cand-004',
    name: 'Liam O’Connor',
    email: 'liam.oc@reactui.dev',
    role: 'candidate',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    title: 'Senior Frontend Architect',
    location: 'Austin, TX',
    yearsExperience: 5,
    workPreference: 'Remote',
    bio: 'Micro-frontends, WebGL rendering loops, complex design system tokens, WCAG AAA accessibility.',
    verifiedSkills: [
      {
        skillId: 'skill-frontend',
        skillName: 'Frontend Engineering',
        category: 'Frontend',
        score: 95,
        percentile: 99,
        verifiedAt: '2026-09-30',
        testId: 'test-fe-01',
        level: 'Senior',
        history: [{ date: '2026-09-30', score: 95, testName: 'Modern Frontend & State Architecture' }],
      },
      {
        skillId: 'skill-backend',
        skillName: 'Backend APIs',
        category: 'Backend APIs',
        score: 78,
        percentile: 79,
        verifiedAt: '2026-09-11',
        testId: 'test-be-01',
        level: 'Mid',
        history: [{ date: '2026-09-11', score: 78, testName: 'Robust REST & gRPC API Design' }],
      },
    ],
    appliedJobIds: ['job-003'],
  },
] satisfies Omit<User, 'testResults'>[]).map(withTestResults);

export const INITIAL_RECRUITER: User = {
  id: 'rec-001',
  name: 'Sarah Vance',
  email: 'sarah.vance@prismascale.io',
  role: 'recruiter',
  avatarUrl: RECRUITER_AVATAR,
  title: 'Head of Technical Talent',
  businessId: 'biz-001',
  location: 'San Francisco, CA',
  yearsExperience: 9,
  workPreference: 'Hybrid',
  bio: 'Building the core engineering infrastructure team behind next-generation enterprise inference engines.',
  verifiedSkills: [],
  testResults: [],
  appliedJobIds: [],
};

// Vetter-made tests, each followed by its versions at other levels
export const STANDARD_ASSESSMENTS: AssessmentTest[] = withLevelVersions([
  {
    id: 'test-sql-01',
    title: 'SQL Queries: Joins, Aggregations & Window Functions',
    category: 'Databases',
    difficulty: 'Junior',
    type: 'standard',
    description: 'Write the queries a backend runs every day: filtering, grouped totals, joins across tables and ranking with window functions, on a company database.',
    estimatedMinutes: 20,
    passingScore: 75,
    totalQuestions: 4,
    skillsTested: ['SQL & Databases', 'Joins', 'Data Aggregation', 'Window Functions'],
    roles: ['Backend Engineer', 'Full Stack Engineer', 'Data Engineer'],
    questions: [
      {
        id: 'q-sql-1',
        title: 'Top Revenue Generating Clients with Fulfilled Orders',
        type: 'sql',
        prompt: `Write a SQL query against the 'orders' table to find all clients who have at least one fulfilled order (fulfilled = 1) and have spent a total amount greater than 10,000 across their orders. Order the results by total_amount descending.

Target columns: client_name, total_amount`,
        contextData: `Table: orders (id INT, client_id INT, client_name VARCHAR, amount INT, region VARCHAR, fulfilled INT)`,
        starterCode: `-- Write your query here
SELECT
FROM orders;`,
        solutionCode: `SELECT client_name, SUM(amount) AS total_amount
FROM orders
WHERE fulfilled = 1
GROUP BY client_name
HAVING total_amount > 10000
ORDER BY total_amount DESC;`,
        testCases: [
          {
            id: 'tc-sql-1',
            description: 'Returns clients exceeding $10,000 threshold',
            input: 'SELECT client_name, SUM(amount) AS total_amount FROM orders WHERE fulfilled = 1 GROUP BY client_name HAVING total_amount > 10000 ORDER BY total_amount DESC;',
            expectedOutput: JSON.stringify([{ client_name: 'Stripe Global', total_amount: 27900 }]),
          },
        ],
        timeLimitMinutes: 5,
        weight: 25,
      },
      {
        id: 'q-sql-2',
        title: 'High-Earning Senior Engineers',
        type: 'sql',
        prompt: `Query the 'employees' table for all individuals in the 'Engineering' department earning a salary of 150,000 or greater, with a performance rating of 4.8 or higher. Sort by salary descending.

Target columns: name, salary, rating`,
        contextData: `Table: employees (id INT, name VARCHAR, department VARCHAR, salary INT, rating FLOAT, hire_year INT)`,
        starterCode: `-- Write your query here
SELECT
FROM employees;`,
        solutionCode: `SELECT name, salary, rating
FROM employees
WHERE department = 'Engineering' AND salary >= 150000 AND rating >= 4.8
ORDER BY salary DESC;`,
        testCases: [
          {
            id: 'tc-sql-2',
            description: 'Returns top engineering staff matching rating and salary cutoff',
            input: 'SELECT name, salary, rating FROM employees WHERE department = "Engineering" AND salary >= 150000 AND rating >= 4.8 ORDER BY salary DESC;',
            expectedOutput: JSON.stringify([
              { name: 'Rajesh Patel', salary: 175000, rating: 4.9 },
              { name: 'Marcus Chen', salary: 160000, rating: 4.9 },
            ]),
          },
        ],
        timeLimitMinutes: 4,
        weight: 25,
      },
      {
        id: 'q-sql-3',
        title: 'Department Headcount Against the Cap',
        type: 'sql',
        prompt: `Join 'departments' to 'employees' (employees.department matches departments.dept_name). For every department, return how many people it employs, their average salary rounded to a whole number, and how many open seats are left under its headcount cap.

Order by open_seats descending.

Target columns: dept_name, headcount, avg_salary, open_seats`,
        contextData: `Table: departments (id INT, dept_name VARCHAR, quarterly_budget INT, headcount_cap INT)
Table: employees (id INT, name VARCHAR, department VARCHAR, salary INT, rating FLOAT, hire_year INT)`,
        starterCode: `-- Write your query here
SELECT
FROM departments d
JOIN employees e ON ...;`,
        solutionCode: `SELECT d.dept_name, COUNT(e.id) AS headcount, ROUND(AVG(e.salary)) AS avg_salary, d.headcount_cap - COUNT(e.id) AS open_seats
FROM departments d
LEFT JOIN employees e ON e.department = d.dept_name
GROUP BY d.id
ORDER BY open_seats DESC;`,
        testCases: [{ id: 'tc-sql-3', description: 'One row per department with headcount, average salary and open seats', input: '', expectedOutput: '' }],
        timeLimitMinutes: 5,
        weight: 25,
      },
      {
        id: 'q-sql-4',
        title: 'Top Earner in Each Department',
        type: 'sql',
        prompt: `Use a window function to find the highest-paid employee in each department.

Order by department alphabetically.

Target columns: department, name, salary`,
        contextData: `Table: employees (id INT, name VARCHAR, department VARCHAR, salary INT, rating FLOAT, hire_year INT)`,
        starterCode: `-- Hint: RANK() OVER (PARTITION BY ... ORDER BY ...)
SELECT
FROM employees;`,
        solutionCode: `SELECT department, name, salary
FROM (
  SELECT department, name, salary, RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS salary_rank
  FROM employees
)
WHERE salary_rank = 1
ORDER BY department;`,
        testCases: [{ id: 'tc-sql-4', description: 'One top earner per department, in department order', input: '', expectedOutput: '' }],
        timeLimitMinutes: 6,
        weight: 25,
      },
    ],
  },
  {
    id: 'test-sys-01',
    title: 'Distributed Systems & Concurrency',
    category: 'System Architecture',
    difficulty: 'Senior',
    type: 'standard',
    description: 'Solve real-world scale challenges: distributed consensus, cache stamps, token bucket rate limiters, and idempotency key patterns.',
    estimatedMinutes: 25,
    passingScore: 80,
    totalQuestions: 2,
    skillsTested: ['System Architecture', 'Distributed Systems', 'Fault Tolerance'],
    roles: ['Backend Engineer', 'Platform & DevOps', 'Data Engineer'],
    questions: [
      {
        id: 'q-sys-1',
        title: 'Rate Limiter Token Bucket Implementation',
        type: 'code',
        prompt: `Implement a token bucket rate limiter function:
'function solution(requests, capacity, refillRatePerSec)'

Arguments:
- requests: array of timestamps in milliseconds [1000, 1200, 1500, ...]
- capacity: max tokens the bucket can hold
- refillRatePerSec: tokens added per second

Returns an array of booleans indicating whether each request was ALLOWED (true) or REJECTED (false). At t=0, the bucket starts full with tokens = capacity. Each request consumes 1 token.`,
        starterCode: `function solution(requests, capacity, refillRatePerSec) {
  // Your code here
}`,
        solutionCode: `function solution(requests, capacity, refillRatePerSec) {
  let tokens = capacity;
  let lastTimestamp = requests[0] || 0;
  const results = [];

  for (let i = 0; i < requests.length; i++) {
    const current = requests[i];
    const elapsedSec = (current - lastTimestamp) / 1000;
    
    // Refill tokens based on elapsed time
    tokens = Math.min(capacity, tokens + elapsedSec * refillRatePerSec);
    lastTimestamp = current;

    if (tokens >= 1) {
      tokens -= 1;
      results.push(true);
    } else {
      results.push(false);
    }
  }

  return results;
}`,
        testCases: [
          {
            id: 'tc-sys-1',
            description: 'Allows burst up to capacity then rate limits',
            input: '[[1000, 1100, 1200, 1300], 2, 1]',
            expectedOutput: '[true, true, false, false]',
          },
          {
            id: 'tc-sys-2',
            description: 'Refills tokens after time delay',
            input: '[[1000, 1050, 3050], 1, 1]',
            expectedOutput: '[true, false, true]',
          },
        ],
        timeLimitMinutes: 12,
        weight: 50,
      },
      {
        id: 'q-sys-2',
        title: 'Sliding Window Maximum Latency Peak',
        type: 'code',
        prompt: `Given an array of server latency measurements (in ms) and a window size k, find the maximum latency for each sliding window of size k moving from left to right.

Input: 'nums' (number[]), 'k' (number)
Output: number[] of window maximums.`,
        starterCode: `function solution(nums, k) {
  // Your code here
}`,
        solutionCode: `function solution(nums, k) {
  if (!nums || nums.length === 0 || k <= 0) return [];
  const result = [];
  
  for (let i = 0; i <= nums.length - k; i++) {
    let max = nums[i];
    for (let j = 1; j < k; j++) {
      if (nums[i + j] > max) {
        max = nums[i + j];
      }
    }
    result.push(max);
  }
  
  return result;
}`,
        testCases: [
          {
            id: 'tc-sys-3',
            description: 'Computes maximum latency peaks in 3-slot window',
            input: '[[130, 350, 210, 480, 190, 600], 3]',
            expectedOutput: '[350, 480, 480, 600]',
          },
          {
            id: 'tc-sys-4',
            description: 'Handles window size equal to 1',
            input: '[[45, 90, 32], 1]',
            expectedOutput: '[45, 90, 32]',
          },
        ],
        timeLimitMinutes: 13,
        weight: 50,
      },
    ],
  },
  {
    id: 'test-fe-01',
    title: 'Modern Frontend & State Architecture',
    category: 'Frontend',
    difficulty: 'Senior',
    type: 'standard',
    description: 'Test your mastery of state normalization, optimistic UI reconciliations, performance optimization, and custom event dispatching.',
    estimatedMinutes: 20,
    passingScore: 75,
    totalQuestions: 1,
    skillsTested: ['Frontend Engineering', 'State Machines', 'Performance'],
    roles: ['Frontend Engineer', 'Full Stack Engineer'],
    questions: [
      {
        id: 'q-fe-1',
        title: 'Optimistic Mutation Reconciler',
        type: 'code',
        prompt: `Write a state reconciler function:
'function solution(serverState, optimisticPatches, rollbackIds)'

Apply optimistic patches to server entities (by id). If an id is in rollbackIds, revert that item back to the original serverState. Return the final sorted items array by id.`,
        starterCode: `function solution(serverState, optimisticPatches, rollbackIds) {
  // Your code here
}`,
        solutionCode: `function solution(serverState, optimisticPatches, rollbackIds) {
  const map = new Map();
  serverState.forEach(item => map.set(item.id, { ...item }));

  const rollbackSet = new Set(rollbackIds || []);

  optimisticPatches.forEach(patch => {
    if (!rollbackSet.has(patch.id)) {
      const existing = map.get(patch.id) || { id: patch.id };
      map.set(patch.id, { ...existing, ...patch });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.id - b.id);
}`,
        testCases: [
          {
            id: 'tc-fe-1',
            description: 'Applies patch and respects rollback IDs',
            input: '[[{"id": 1, "title": "Draft"}, {"id": 2, "title": "Published"}], [{"id": 1, "title": "Reviewed"}, {"id": 2, "title": "Archived"}], [1]]',
            expectedOutput: '[{"id":1,"title":"Draft"},{"id":2,"title":"Archived"}]',
          },
        ],
        timeLimitMinutes: 15,
        weight: 100,
      },
    ],
  },
  {
    id: 'test-be-01',
    title: 'API Resilience & Routing',
    category: 'Backend APIs',
    difficulty: 'Professional',
    type: 'standard',
    description: 'Core building blocks of production APIs: retry schedules for flaky upstreams and path routing with parameters.',
    estimatedMinutes: 20,
    passingScore: 75,
    totalQuestions: 2,
    skillsTested: ['Backend APIs', 'Resilience', 'HTTP Routing'],
    roles: ['Backend Engineer', 'Full Stack Engineer'],
    questions: [
      {
        id: 'q-be-1',
        title: 'Exponential Backoff Schedule',
        type: 'code',
        prompt: `Write 'function solution(attempts, baseMs, maxMs)'.

Return the delay before each retry attempt, in order. The delay doubles each attempt starting at baseMs, and never exceeds maxMs.

Example: solution(4, 100, 500) returns [100, 200, 400, 500].`,
        starterCode: `function solution(attempts, baseMs, maxMs) {
  // Your code here
}`,
        solutionCode: `function solution(attempts, baseMs, maxMs) {
  const delays = [];
  for (let i = 0; i < attempts; i++) delays.push(Math.min(maxMs, baseMs * 2 ** i));
  return delays;
}`,
        testCases: [
          { id: 'tc-be-1', description: 'Caps delays at maxMs', input: '[5, 100, 1000]', expectedOutput: '[100,200,400,800,1000]' },
          { id: 'tc-be-2', description: 'Doubles from the base delay', input: '[3, 250, 10000]', expectedOutput: '[250,500,1000]' },
          { id: 'tc-be-3', description: 'No attempts means no delays', input: '[0, 100, 1000]', expectedOutput: '[]' },
        ],
        timeLimitMinutes: 8,
        weight: 40,
      },
      {
        id: 'q-be-2',
        title: 'Path Router with Parameters',
        type: 'code',
        prompt: `Write 'function solution(routes, path)'.

'routes' is an array of patterns such as "/users/:id/orders". Segments starting with ':' match any value and are captured as params.

Return the first matching route as { route, params }, or null if nothing matches.

Example: solution(["/users/:id"], "/users/7") returns { route: "/users/:id", params: { id: "7" } }.`,
        starterCode: `function solution(routes, path) {
  // Your code here
}`,
        solutionCode: `function solution(routes, path) {
  const parts = path.split('/').filter(Boolean);
  for (const r of routes) {
    const segs = r.split('/').filter(Boolean);
    if (segs.length !== parts.length) continue;
    const params = {};
    if (segs.every((s, i) => (s.startsWith(':') ? ((params[s.slice(1)] = parts[i]), true) : s === parts[i]))) {
      return { route: r, params };
    }
  }
  return null;
}`,
        testCases: [
          {
            id: 'tc-be-4',
            description: 'Captures a parameter in a nested route',
            input: '[["/users/:id", "/users/:id/orders", "/health"], "/users/42/orders"]',
            expectedOutput: '{"route":"/users/:id/orders","params":{"id":"42"}}',
          },
          {
            id: 'tc-be-5',
            description: 'Matches a static route',
            input: '[["/users/:id", "/users/:id/orders", "/health"], "/health"]',
            expectedOutput: '{"route":"/health","params":{}}',
          },
          {
            id: 'tc-be-6',
            description: 'Returns null when nothing matches',
            input: '[["/users/:id", "/users/:id/orders", "/health"], "/orders/1"]',
            expectedOutput: 'null',
          },
        ],
        timeLimitMinutes: 12,
        weight: 60,
      },
    ],
  },
  {
    id: 'test-cs-01',
    title: 'Case Interview & Business Problem Solving',
    category: 'Consulting',
    difficulty: 'Junior',
    type: 'standard',
    description: 'The core of a consulting case: diagnosing profit problems, break-even maths, market sizing, structuring a problem and prioritising options.',
    estimatedMinutes: 20,
    passingScore: 75,
    totalQuestions: 5,
    skillsTested: ['Business Problem Solving', 'Market Sizing', 'Structured Thinking'],
    roles: ['Consultant', 'Business Analyst'],
    questions: [
      {
        id: 'q-cs-1',
        title: 'Profit Decline',
        type: 'choice',
        prompt: `A retail client’s profits fell 20% this year while revenue stayed flat.

Where should you look first?`,
        starterCode: '',
        options: [
          'Costs: which fixed or variable costs rose',
          'A new marketing campaign to grow revenue',
          'Raising prices across the range',
          'Competitors’ revenue growth',
        ],
        correctOption: 0,
        testCases: [],
        timeLimitMinutes: 4,
        weight: 20,
      },
      {
        id: 'q-cs-2',
        title: 'Break-even Volume',
        type: 'choice',
        prompt: `A product sells for $50 a unit and costs $30 a unit to make. Fixed costs are $600,000 a year.

How many units must the client sell each year to break even?`,
        starterCode: '',
        options: [
          '12,000',
          '20,000',
          '30,000',
          '60,000',
        ],
        correctOption: 2,
        testCases: [],
        timeLimitMinutes: 4,
        weight: 20,
      },
      {
        id: 'q-cs-3',
        title: 'Market Sizing',
        type: 'choice',
        prompt: `A city has 2 million people, with 2.5 people per household on average. 30% of households own a dog, and each of those households buys 12 bags of dog food a year.

How many bags of dog food does the city buy each year?`,
        starterCode: '',
        options: [
          '2.88 million',
          '7.2 million',
          '1.2 million',
          '960,000',
        ],
        correctOption: 0,
        testCases: [],
        timeLimitMinutes: 5,
        weight: 20,
      },
      {
        id: 'q-cs-4',
        title: 'Structuring the Problem',
        type: 'choice',
        prompt: `A client asks why sales are falling. Which way of splitting the problem is mutually exclusive and collectively exhaustive (MECE)?`,
        starterCode: '',
        options: [
          'Fewer customers buying, or each customer spending less',
          'Marketing, competitors and the economy',
          'Online sales, sales to new customers and discounted sales',
          'Product quality, customer service and marketing',
        ],
        correctOption: 0,
        testCases: [],
        timeLimitMinutes: 4,
        weight: 20,
      },
      {
        id: 'q-cs-5',
        title: 'Prioritising Initiatives',
        type: 'choice',
        prompt: `The client can fund one initiative this quarter:

A: $2.0M impact, 8 weeks of effort
B: $1.5M impact, 2 weeks
C: $0.5M impact, 1 week
D: $3.0M impact, 20 weeks

Which gives the most impact per week of effort?`,
        starterCode: '',
        options: [
          'A',
          'B',
          'C',
          'D',
        ],
        correctOption: 1,
        testCases: [],
        timeLimitMinutes: 3,
        weight: 20,
      },
    ],
  },
  ...ROLE_ASSESSMENTS,
  ...INDUSTRY_TESTS,
  ...ANALYSIS_SIMULATIONS,
  ...SIMULATION_TESTS,
]);

// Company-made tests, written by a business for its own jobs
export const COMPANY_ASSESSMENTS: AssessmentTest[] = [
  {
    id: 'test-custom-01',
    title: 'Idempotent Message Ingestion',
    category: 'Backend APIs',
    difficulty: 'Professional',
    type: 'custom',
    businessId: 'biz-001',
    companyName: 'PrismaScale AI',
    description: 'Our ingestion layer receives retried messages from upstream queues. Detect duplicates the way our production deduplicator does.',
    estimatedMinutes: 15,
    passingScore: 75,
    totalQuestions: 1,
    skillsTested: ['Backend APIs', 'Idempotency'],
    roles: ['Backend Engineer', 'Data Engineer'],
    questions: [
      {
        id: 'q-custom-1',
        title: 'Duplicate Message Detector',
        type: 'code',
        prompt: `Write 'function solution(messages, windowMs)'.

'messages' is an array of { id, t } objects ordered by timestamp t (ms). A message is a duplicate if a message with the same id was last seen less than windowMs earlier.

Return the ids of duplicate messages, in the order they arrive.`,
        starterCode: `function solution(messages, windowMs) {
  // Implementation here
  return [];
}`,
        solutionCode: `function solution(messages, windowMs) {
  const lastSeen = new Map();
  const duplicates = [];
  for (const { id, t } of messages) {
    if (lastSeen.has(id) && t - lastSeen.get(id) < windowMs) duplicates.push(id);
    lastSeen.set(id, t);
  }
  return duplicates;
}`,
        testCases: [
          {
            id: 'tc-custom-1',
            description: 'Flags a retry inside the window',
            input: '[[{"id":"m1","t":100},{"id":"m1","t":200}], 5000]',
            expectedOutput: '["m1"]',
          },
          {
            id: 'tc-custom-2',
            description: 'Ignores a repeat outside the window',
            input: '[[{"id":"a","t":0},{"id":"b","t":10},{"id":"a","t":6000}], 5000]',
            expectedOutput: '[]',
          },
          {
            id: 'tc-custom-3',
            description: 'Flags every retry in a burst',
            input: '[[{"id":"a","t":0},{"id":"a","t":1000},{"id":"a","t":2000}], 5000]',
            expectedOutput: '["a","a"]',
          },
        ],
        timeLimitMinutes: 15,
        weight: 100,
      },
    ],
  },
];

export const INITIAL_BUSINESSES: Business[] = [
  {
    id: 'biz-001',
    name: 'PrismaScale AI',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
    industry: 'Distributed AI Infrastructure',
    headquarters: 'San Francisco, CA',
    companySize: '150 - 500 employees',
    websiteUrl: 'https://prismascale.io',
    description: 'High-throughput enterprise infrastructure powering next-generation generative AI clusters and low-latency state machines.',
    techStack: ['Go', 'Rust', 'PostgreSQL', 'Kubernetes', 'CUDA'],
  },
  {
    id: 'biz-002',
    name: 'FinTech Core',
    logo: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=120&q=80',
    industry: 'Financial Technology & Ledgers',
    headquarters: 'San Francisco, CA',
    companySize: '500 - 1000 employees',
    websiteUrl: 'https://fintechcore.dev',
    description: 'Real-time financial reconciliation engines and multi-currency transaction clearing houses processing $12B+ monthly.',
    techStack: ['PostgreSQL', 'TypeScript', 'Node.js', 'dbt', 'Snowflake'],
  },
  {
    id: 'biz-003',
    name: 'CloudFlow SaaS',
    logo: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=120&q=80',
    industry: 'Enterprise Workspaces & Collaboration',
    headquarters: 'Austin, TX',
    companySize: '50 - 200 employees',
    websiteUrl: 'https://cloudflow.io',
    description: 'Real-time collaborative document and data engineering workflows with instantaneous synchronization across global teams.',
    techStack: ['React', 'TypeScript', 'GraphQL', 'Tailwind', 'Redis'],
  },
];

export const INITIAL_JOBS: JobPosting[] = [
  {
    id: 'job-001',
    title: 'Senior Data & Analytics Engineer',
    companyName: 'FinTech Core',
    companyLogo: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=120&q=80',
    businessId: 'biz-002',
    location: 'San Francisco, CA',
    workType: 'Remote',
    salaryRange: '$165,000 - $195,000',
    department: 'Data Platform',
    postedDate: '2026-10-12',
    description: 'Lead analytics engineering across real-time ledger records and trading streams. You will architect high-throughput ETL pipelines, implement dimensional dbt models, and optimize query latency on multi-terabyte data warehouses.',
    employmentType: 'Full-time',
    experienceLevel: 'Senior (5+ years)',
    closingDate: '2026-11-12',
    startDate: 'January 2027',
    responsibilities: [
      'Design and own dimensional dbt models for ledger, payments and trading data',
      'Build streaming and batch ETL pipelines that process billions of rows a day',
      'Cut warehouse query latency through partitioning, clustering and query rewrites',
      'Define data quality checks and on-call runbooks for the analytics platform',
      'Partner with finance and risk teams to turn reporting needs into reliable datasets',
    ],
    qualifications: [
      '5+ years in data or analytics engineering',
      'Expert SQL, including window functions, CTEs and query plan tuning',
      'Production experience with dbt and a cloud warehouse (Snowflake, BigQuery or Redshift)',
      'Comfortable writing Python or Go for pipeline tooling',
    ],
    niceToHave: ['Experience with double-entry ledgers or financial reconciliation', 'Kafka or Flink streaming'],
    benefits: ['Equity package', 'Medical, dental and vision', '401(k) with 4% match', '$2,000 learning budget', 'Home office stipend', '25 days paid leave'],
    requirements: [
      { skillId: 'skill-sql', skillName: 'SQL & Databases', minScore: 85, importance: 'required', weight: 0.5 },
      { skillId: 'skill-backend', skillName: 'Backend APIs', minScore: 75, importance: 'preferred', weight: 0.3 },
      { skillId: 'skill-sys', skillName: 'System Architecture', minScore: 70, importance: 'preferred', weight: 0.2 },
    ],
    testIds: ['test-sql-01'],
    testPassingScore: 85,
    testsRequired: true,
    invitations: [],
    applicantCount: 14,
    status: 'active',
  },
  {
    id: 'job-002',
    title: 'Staff Distributed Systems Engineer',
    companyName: 'PrismaScale AI',
    companyLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
    businessId: 'biz-001',
    location: 'San Francisco, CA',
    workType: 'Hybrid',
    salaryRange: '$210,000 - $260,000',
    department: 'Core Infrastructure',
    postedDate: '2026-10-14',
    description: 'Architect low-latency distributed state machines, consensus layers, and GPU cluster scheduling primitives for high-throughput AI inference pipelines.',
    employmentType: 'Full-time',
    experienceLevel: 'Staff (8+ years)',
    closingDate: '2026-11-30',
    startDate: 'As soon as possible',
    responsibilities: [
      'Lead the design of the consensus and replication layer behind our inference control plane',
      'Build scheduling primitives that place work across thousands of GPUs',
      'Set the bar for correctness: design reviews, fault injection and formal reasoning about failure modes',
      'Mentor senior engineers and drive technical direction across Core Infrastructure',
    ],
    qualifications: [
      '8+ years building distributed systems in production',
      'Deep knowledge of Raft or Paxos, replication and partition tolerance',
      'Strong in Go or Rust',
      'Track record of leading multi-team technical projects',
    ],
    niceToHave: ['Kubernetes scheduler or operator development', 'GPU cluster or HPC experience'],
    benefits: ['Significant equity', 'Medical, dental and vision', 'Hybrid: 2 days a week in the SF office', 'Daily lunch on office days', 'Parental leave: 20 weeks', 'Annual conference budget'],
    requirements: [
      { skillId: 'skill-sys', skillName: 'System Architecture', minScore: 88, importance: 'required', weight: 0.55 },
      { skillId: 'skill-backend', skillName: 'Backend APIs', minScore: 82, importance: 'required', weight: 0.3 },
      { skillId: 'skill-sql', skillName: 'SQL & Databases', minScore: 75, importance: 'preferred', weight: 0.15 },
    ],
    testIds: ['test-sys-01'],
    testPassingScore: 80,
    testsRequired: true,
    invitations: [],
    applicantCount: 8,
    status: 'active',
  },
  {
    id: 'job-003',
    title: 'Lead Full-Stack Web Architect',
    companyName: 'CloudFlow SaaS',
    companyLogo: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=120&q=80',
    businessId: 'biz-003',
    location: 'Austin, TX',
    workType: 'Remote',
    salaryRange: '$175,000 - $215,000',
    department: 'Product Engineering',
    postedDate: '2026-10-15',
    description: 'Oversee full-stack product experiences across responsive collaborative workspaces. Direct performance tuning, bundle size governance, and resilient state synchronization.',
    employmentType: 'Full-time',
    experienceLevel: 'Lead (7+ years)',
    closingDate: '2026-11-15',
    startDate: 'December 2026',
    responsibilities: [
      'Own the architecture of our collaborative workspace across React front end and Node services',
      'Set and enforce performance budgets for bundle size, render time and interaction latency',
      'Design real-time state sync with optimistic updates and conflict resolution',
      'Run architecture reviews and coach a team of 6 product engineers',
    ],
    qualifications: [
      '7+ years of full-stack web development',
      'Expert React and TypeScript, including state management at scale',
      'Experience designing REST or GraphQL APIs in Node.js',
      'Solid understanding of browser performance and profiling',
    ],
    niceToHave: ['CRDTs or operational transforms', 'Design system ownership'],
    benefits: ['Fully remote (US time zones)', 'Equity package', 'Medical, dental and vision', 'Four-day week in August', '$1,500 home office budget', 'Company offsites twice a year'],
    requirements: [
      { skillId: 'skill-frontend', skillName: 'Frontend Engineering', minScore: 85, importance: 'required', weight: 0.45 },
      { skillId: 'skill-backend', skillName: 'Backend APIs', minScore: 78, importance: 'required', weight: 0.35 },
      { skillId: 'skill-sql', skillName: 'SQL & Databases', minScore: 70, importance: 'preferred', weight: 0.2 },
    ],
    testIds: ['test-fe-01'],
    testPassingScore: 80,
    testsRequired: true,
    invitations: [],
    applicantCount: 21,
    status: 'active',
  },
  {
    id: 'job-004',
    title: 'Senior Backend Engineer, Ingestion',
    companyName: 'PrismaScale AI',
    companyLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
    businessId: 'biz-001',
    location: 'San Francisco, CA',
    workType: 'Remote',
    salaryRange: '$180,000 - $220,000',
    department: 'Data Ingestion',
    postedDate: '2026-10-17',
    description: 'Own the ingestion layer that feeds our inference clusters: exactly-once delivery, backpressure, and replay across regions.',
    employmentType: 'Full-time',
    experienceLevel: 'Senior (5+ years)',
    closingDate: '2026-12-01',
    startDate: 'January 2027',
    responsibilities: [
      'Own the ingestion services that feed our inference clusters',
      'Guarantee exactly-once delivery with idempotent consumers and deduplication',
      'Handle backpressure, retries and replay across three regions',
      'Instrument the pipeline end to end and keep it within latency SLOs',
    ],
    qualifications: [
      '5+ years building backend services',
      'Experience with message queues such as Kafka, NATS or SQS',
      'Strong API design and failure-handling instincts',
      'Proficient in Go, Rust or TypeScript',
    ],
    niceToHave: ['Multi-region active-active systems', 'Protocol Buffers and gRPC'],
    benefits: ['Fully remote', 'Equity package', 'Medical, dental and vision', 'Parental leave: 20 weeks', 'Annual conference budget'],
    requirements: [
      { skillId: 'skill-backend', skillName: 'Backend APIs', minScore: 80, importance: 'required', weight: 0.6 },
      { skillId: 'skill-sys', skillName: 'System Architecture', minScore: 75, importance: 'preferred', weight: 0.4 },
    ],
    testIds: ['test-sql-01-professional', 'test-api-01', 'test-db-01'],
    testPassingScore: 70,
    testsRequired: true,
    invitations: SEED_INVITATIONS['job-004'].invitations,
    invitedEmails: SEED_INVITATIONS['job-004'].invitedEmails,
    applicantCount: 5,
    status: 'active',
  },
  {
    id: 'job-005',
    title: 'Frontend Engineer',
    companyName: 'PrismaScale AI',
    companyLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
    businessId: 'biz-001',
    location: 'London, UK',
    workType: 'Hybrid',
    salaryRange: '£55,000 - £70,000',
    department: 'Product Engineering',
    postedDate: '2026-10-21',
    description: 'Build the console our customers use to deploy and monitor models. One test before a first interview.',
    employmentType: 'Full-time',
    experienceLevel: 'Mid (2-5 years)',
    closingDate: '2026-12-15',
    responsibilities: [
      'Build features across the customer console in React and TypeScript',
      'Own state management and data fetching for the monitoring views',
      'Work with design on a consistent, accessible component library',
    ],
    qualifications: ['2+ years building production web apps', 'Strong React and TypeScript'],
    benefits: ['Hybrid, two days in the London office', 'Equity package', 'Private medical'],
    requirements: [{ skillId: 'skill-frontend', skillName: 'Frontend', minScore: 75, importance: 'required', weight: 1 }],
    testIds: ['test-fe-01'],
    testPassingScore: 75,
    testsRequired: true,
    invitations: SEED_INVITATIONS['job-005'].invitations,
    applicantCount: 3,
    status: 'active',
  },
  {
    id: 'job-006',
    title: 'Analytics Graduate Programme 2027',
    companyName: 'FinTech Core',
    companyLogo: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=120&q=80',
    businessId: 'biz-002',
    location: 'London, UK',
    workType: 'Hybrid',
    salaryRange: '£34,000 - £38,000',
    department: 'Analytics',
    postedDate: '2026-10-18',
    description: 'A two-year rotation through our analytics teams for 2027 graduates. Three short tests make the shortlist.',
    employmentType: 'Full-time',
    experienceLevel: 'Entry level',
    closingDate: '2026-11-30',
    startDate: 'September 2027',
    responsibilities: [
      'Rotate through risk, payments and customer analytics',
      'Write SQL and build dashboards the business uses every day',
      'Present findings to product and finance teams',
    ],
    qualifications: ['Graduating in 2027 in a numerate subject', 'Some SQL or spreadsheet experience'],
    benefits: ['Graduate training programme', 'Hybrid working', 'Study support'],
    requirements: [{ skillId: 'skill-analytics', skillName: 'Data Analysis', minScore: 65, importance: 'required', weight: 1 }],
    testIds: ['test-sql-02', 'test-clean-01', 'test-dash-01'],
    testPassingScore: 65,
    testsRequired: true,
    invitations: SEED_INVITATIONS['job-006'].invitations,
    applicantCount: 4,
    status: 'active',
  },
];
