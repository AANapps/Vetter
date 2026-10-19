import { User, AssessmentTest, JobPosting, Business } from '../types';
import CANDIDATE_AVATAR from '../assets/images/candidate_avatar_dev_1792329815461.jpg';
import RECRUITER_AVATAR from '../assets/images/recruiter_avatar_tech_1792329815454.jpg';

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

// Vetter-made tests, open to every candidate
export const STANDARD_ASSESSMENTS: AssessmentTest[] = [
  {
    id: 'test-sql-01',
    title: 'Advanced SQL & Analytics Engineering',
    category: 'Databases',
    difficulty: 'Advanced',
    type: 'standard',
    description: 'Practical evaluation covering window functions, aggregations, multi-table joins, subqueries, and analytical data grouping on realistic company databases.',
    estimatedMinutes: 20,
    passingScore: 75,
    totalQuestions: 2,
    skillsTested: ['SQL & Databases', 'Query Optimization', 'Data Aggregation'],
    testTakersCount: 14820,
    avgScore: 72,
    questions: [
      {
        id: 'q-sql-1',
        title: 'Top Revenue Generating Clients with Fulfilled Orders',
        type: 'sql',
        prompt: `Write a SQL query against the 'orders' table to find all clients who have at least one fulfilled order (fulfilled = 1) and have spent a total amount greater than 10,000 across their orders. Order the results by total_amount descending.

Target columns: client_name, total_amount`,
        contextData: `Table: orders (id INT, client_id INT, client_name VARCHAR, amount INT, region VARCHAR, fulfilled INT)`,
        starterCode: `SELECT client_name, SUM(amount) AS total_amount
FROM orders
WHERE fulfilled = 1
GROUP BY client_name
HAVING total_amount > 10000
ORDER BY total_amount DESC;`,
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
            expectedOutput: JSON.stringify([
              { client_name: 'Stripe Global', total_amount: 27900 },
              { client_name: 'Acme Corp', total_amount: 8000 }, // filtered if >10000
            ]),
          },
        ],
        timeLimitMinutes: 10,
        weight: 50,
      },
      {
        id: 'q-sql-2',
        title: 'High-Earning Senior Engineers',
        type: 'sql',
        prompt: `Query the 'employees' table for all individuals in the 'Engineering' department earning a salary of 150,000 or greater, with a performance rating of 4.8 or higher. Sort by salary descending.

Target columns: name, salary, rating`,
        contextData: `Table: employees (id INT, name VARCHAR, department VARCHAR, salary INT, rating FLOAT, hire_year INT)`,
        starterCode: `SELECT name, salary, rating
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
        timeLimitMinutes: 10,
        weight: 50,
      },
    ],
  },
  {
    id: 'test-sys-01',
    title: 'Distributed Systems & Concurrency',
    category: 'System Architecture',
    difficulty: 'Staff Specialist',
    type: 'standard',
    description: 'Solve real-world scale challenges: distributed consensus, cache stamps, token bucket rate limiters, and idempotency key patterns.',
    estimatedMinutes: 25,
    passingScore: 80,
    totalQuestions: 2,
    skillsTested: ['System Architecture', 'Distributed Systems', 'Fault Tolerance'],
    testTakersCount: 9340,
    avgScore: 68,
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
    difficulty: 'Advanced',
    type: 'standard',
    description: 'Test your mastery of state normalization, optimistic UI reconciliations, performance optimization, and custom event dispatching.',
    estimatedMinutes: 20,
    passingScore: 75,
    totalQuestions: 1,
    skillsTested: ['Frontend Engineering', 'State Machines', 'Performance'],
    testTakersCount: 18450,
    avgScore: 74,
    questions: [
      {
        id: 'q-fe-1',
        title: 'Optimistic Mutation Reconciler',
        type: 'code',
        prompt: `Write a state reconciler function:
'function solution(serverState, optimisticPatches, rollbackIds)'

Apply optimistic patches to server entities (by id). If an id is in rollbackIds, revert that item back to the original serverState. Return the final sorted items array by id.`,
        starterCode: `function solution(serverState, optimisticPatches, rollbackIds) {
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
];

// Company-made tests, written by a business for its own jobs
export const COMPANY_ASSESSMENTS: AssessmentTest[] = [
  {
    id: 'test-custom-01',
    title: 'Idempotent Message Ingestion',
    category: 'Backend APIs',
    difficulty: 'Advanced',
    type: 'custom',
    businessId: 'biz-001',
    companyName: 'PrismaScale AI',
    description: 'Our ingestion layer receives retried messages from upstream queues. Detect duplicates the way our production deduplicator does.',
    estimatedMinutes: 15,
    passingScore: 75,
    totalQuestions: 1,
    skillsTested: ['Backend APIs', 'Idempotency'],
    testTakersCount: 212,
    avgScore: 70,
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
    requirements: [
      { skillId: 'skill-sql', skillName: 'SQL & Databases', minScore: 85, importance: 'required', weight: 0.5 },
      { skillId: 'skill-backend', skillName: 'Backend APIs', minScore: 75, importance: 'preferred', weight: 0.3 },
      { skillId: 'skill-sys', skillName: 'System Architecture', minScore: 70, importance: 'preferred', weight: 0.2 },
    ],
    attachedTestId: 'test-sql-01',
    attachedTestTitle: 'Advanced SQL & Analytics Engineering',
    attachedTestPassingScore: 85,
    isAttachedTestMandatory: true,
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
    requirements: [
      { skillId: 'skill-sys', skillName: 'System Architecture', minScore: 88, importance: 'required', weight: 0.55 },
      { skillId: 'skill-backend', skillName: 'Backend APIs', minScore: 82, importance: 'required', weight: 0.3 },
      { skillId: 'skill-sql', skillName: 'SQL & Databases', minScore: 75, importance: 'preferred', weight: 0.15 },
    ],
    attachedTestId: 'test-sys-01',
    attachedTestTitle: 'Distributed Systems & Concurrency',
    attachedTestPassingScore: 80,
    isAttachedTestMandatory: true,
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
    requirements: [
      { skillId: 'skill-frontend', skillName: 'Frontend Engineering', minScore: 85, importance: 'required', weight: 0.45 },
      { skillId: 'skill-backend', skillName: 'Backend APIs', minScore: 78, importance: 'required', weight: 0.35 },
      { skillId: 'skill-sql', skillName: 'SQL & Databases', minScore: 70, importance: 'preferred', weight: 0.2 },
    ],
    attachedTestId: 'test-fe-01',
    attachedTestTitle: 'Modern Frontend & State Architecture',
    attachedTestPassingScore: 80,
    isAttachedTestMandatory: true,
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
    requirements: [
      { skillId: 'skill-backend', skillName: 'Backend APIs', minScore: 80, importance: 'required', weight: 0.6 },
      { skillId: 'skill-sys', skillName: 'System Architecture', minScore: 75, importance: 'preferred', weight: 0.4 },
    ],
    attachedTestId: 'test-custom-01',
    attachedTestTitle: 'Idempotent Message Ingestion',
    attachedTestPassingScore: 75,
    isAttachedTestMandatory: true,
    applicantCount: 5,
    status: 'active',
  },
];
