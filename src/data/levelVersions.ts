import { AssessmentTest, Question, TestDifficulty } from '../types';

/**
 * The other levels of each Vetter test. A test's main version keeps its id and level;
 * each version here gets "<main id>-<level>" and links back through familyId.
 */

interface LevelContent {
  description?: string;
  estimatedMinutes: number;
  passingScore?: number;
  questions: Question[];
}

// A SQL task graded against its solution query
const sql = (
  id: string,
  title: string,
  prompt: string,
  tables: string,
  solutionCode: string,
  check: string,
  timeLimitMinutes: number,
  weight: number
): Question => ({
  id,
  title,
  type: 'sql',
  prompt,
  contextData: tables,
  starterCode: '-- Write your query here\nSELECT\n',
  solutionCode,
  testCases: [{ id: `tc-${id}`, description: check, input: '', expectedOutput: '' }],
  timeLimitMinutes,
  weight,
});

const EMPLOYEES = 'Table: employees (id INT, name VARCHAR, department VARCHAR, salary INT, rating FLOAT, hire_year INT)';
const DEPARTMENTS = 'Table: departments (id INT, dept_name VARCHAR, quarterly_budget INT, headcount_cap INT)';
const ORDERS = 'Table: orders (id INT, client_id INT, client_name VARCHAR, amount INT, region VARCHAR, fulfilled INT)';
const SALES = 'Table: sales (id INT, order_date TEXT "YYYY-MM-DD", region TEXT, rep TEXT, product TEXT, revenue INT)';
const SHOP_ORDERS = 'Table: shop_orders (id INT, customer_id INT, status TEXT, total REAL, placed_at TEXT, shipped_at TEXT)';
const SHOP_ITEMS = 'Table: shop_order_items (id INT, order_id INT, product TEXT, quantity INT, unit_price REAL)';
const SHOP_CUSTOMERS = 'Table: shop_customers (id INT, name TEXT, email TEXT)';

export const LEVEL_CONTENT: Record<string, Partial<Record<TestDifficulty, LevelContent>>> = {
  // ---------- SQL Queries (main version: Junior) ----------
  'test-sql-01': {
    Beginner: {
      description: 'The basics every backend developer uses: filtering, sorting, counting and limiting rows.',
      estimatedMinutes: 12,
      passingScore: 70,
      questions: [
        sql(
          'q-sql-b1',
          'Everyone in Data',
          `List the employees in the 'Data' department, highest salary first.

Target columns: name, salary`,
          EMPLOYEES,
          `SELECT name, salary FROM employees WHERE department = 'Data' ORDER BY salary DESC;`,
          'Data team, highest paid first',
          3,
          30
        ),
        sql(
          'q-sql-b2',
          'Headcount by Department',
          `Count how many employees each department has.

Order by department name.

Target columns: department, headcount`,
          EMPLOYEES,
          `SELECT department, COUNT(*) AS headcount FROM employees GROUP BY department ORDER BY department;`,
          'One row per department with its headcount',
          4,
          35
        ),
        sql(
          'q-sql-b3',
          'Top Three Salaries',
          `Return the three highest-paid employees, highest first.

Target columns: name, salary`,
          EMPLOYEES,
          `SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 3;`,
          'The three highest salaries',
          3,
          35
        ),
      ],
    },
    Professional: {
      description: 'Reporting queries for a production backend: budget ratios, comparisons to the group average, set conditions and running totals.',
      estimatedMinutes: 20,
      passingScore: 75,
      questions: [
        sql(
          'q-sql-p1',
          'Payroll Against Budget',
          `For each department, compare its yearly payroll (sum of salaries) with its yearly budget (quarterly_budget × 4). Return the payroll as a percentage of the budget, rounded to 1 decimal place.

Order by budget_pct descending.

Target columns: dept_name, payroll, budget_pct`,
          `${DEPARTMENTS}\n${EMPLOYEES}`,
          `SELECT d.dept_name, SUM(e.salary) AS payroll, ROUND(100.0 * SUM(e.salary) / (d.quarterly_budget * 4), 1) AS budget_pct
FROM departments d JOIN employees e ON e.department = d.dept_name
GROUP BY d.id ORDER BY budget_pct DESC;`,
          'Payroll as a share of each yearly budget',
          5,
          25
        ),
        sql(
          'q-sql-p2',
          'Pay Against the Team Average',
          `For every employee, show how far their salary is above or below their department's average (negative when below). Use a window function.

Order by department, then name.

Target columns: name, department, salary, diff_from_avg`,
          EMPLOYEES,
          `SELECT name, department, salary, salary - AVG(salary) OVER (PARTITION BY department) AS diff_from_avg
FROM employees ORDER BY department, name;`,
          'Each salary compared with the department average',
          5,
          25
        ),
        sql(
          'q-sql-p3',
          'Clients With Every Order Fulfilled',
          `Find the clients whose orders have all been fulfilled.

Order by client name.

Target columns: client_name`,
          ORDERS,
          `SELECT client_name FROM orders GROUP BY client_name HAVING MIN(fulfilled) = 1 ORDER BY client_name;`,
          'Only clients with no unfulfilled orders',
          4,
          20
        ),
        sql(
          'q-sql-p4',
          'Payroll Growth by Hiring Year',
          `For each hire_year, return how many people were hired that year and the cumulative payroll of everyone hired up to and including that year.

Order by hire_year.

Target columns: hire_year, hires, cumulative_payroll`,
          EMPLOYEES,
          `SELECT hire_year, COUNT(*) AS hires, SUM(SUM(salary)) OVER (ORDER BY hire_year) AS cumulative_payroll
FROM employees GROUP BY hire_year ORDER BY hire_year;`,
          'Hires per year with a running payroll total',
          6,
          30
        ),
      ],
    },
    Senior: {
      description: 'Hard analytical SQL: ranking with ties, quartiles, shares of a total and filling gaps with a recursive CTE.',
      estimatedMinutes: 25,
      passingScore: 75,
      questions: [
        sql(
          'q-sql-s1',
          'Second-Highest Salary per Department',
          `For each department with at least two different salaries, return the employee with the second-highest salary.

Order by department.

Target columns: department, name, salary`,
          EMPLOYEES,
          `SELECT department, name, salary FROM (
  SELECT department, name, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS r FROM employees
) WHERE r = 2 ORDER BY department;`,
          'The runner-up earner in each department',
          5,
          25
        ),
        sql(
          'q-sql-s2',
          'Salary Quartiles',
          `Split all employees into four equal salary quartiles, 1 being the highest paid.

Order by salary descending.

Target columns: name, salary, quartile`,
          EMPLOYEES,
          `SELECT name, salary, NTILE(4) OVER (ORDER BY salary DESC) AS quartile FROM employees ORDER BY salary DESC;`,
          'Every employee in a quartile',
          5,
          20
        ),
        sql(
          'q-sql-s3',
          'Regional Share of Fulfilled Revenue',
          `Using fulfilled orders only, return each region's revenue, its share of all fulfilled revenue rounded to 1 decimal place, and its rank.

Order by revenue descending.

Target columns: region, revenue, share_pct, region_rank`,
          ORDERS,
          `SELECT region, SUM(amount) AS revenue,
  ROUND(100.0 * SUM(amount) / SUM(SUM(amount)) OVER (), 1) AS share_pct,
  RANK() OVER (ORDER BY SUM(amount) DESC) AS region_rank
FROM orders WHERE fulfilled = 1 GROUP BY region ORDER BY revenue DESC;`,
          'Each region with its share and rank',
          6,
          25
        ),
        sql(
          'q-sql-s4',
          'Salary Bands With No Gaps',
          `Build a salary histogram in bands of 5,000 from 125,000 to 175,000 (band_start 125000, 130000, … 175000). Each band covers band_start up to but not including band_start + 5000. Empty bands must still appear with 0.

Use a recursive CTE to generate the bands. Order by band_start.

Target columns: band_start, people`,
          EMPLOYEES,
          `WITH RECURSIVE bands(band_start) AS (
  SELECT 125000 UNION ALL SELECT band_start + 5000 FROM bands WHERE band_start < 175000
)
SELECT b.band_start, COUNT(e.id) AS people
FROM bands b LEFT JOIN employees e ON e.salary >= b.band_start AND e.salary < b.band_start + 5000
GROUP BY b.band_start ORDER BY b.band_start;`,
          'Every band, including empty ones',
          9,
          30
        ),
      ],
    },
  },

  // ---------- Analytical SQL (main version: Professional) ----------
  'test-sql-02': {
    Beginner: {
      description: 'First steps in reporting SQL on a sales table: totals, filters and averages.',
      estimatedMinutes: 12,
      passingScore: 70,
      questions: [
        sql(
          'q-asql-b1',
          'Revenue by Region',
          `Return the total revenue of each region.

Order by region.

Target columns: region, revenue`,
          SALES,
          `SELECT region, SUM(revenue) AS revenue FROM sales GROUP BY region ORDER BY region;`,
          'Total revenue per region',
          3,
          30
        ),
        sql(
          'q-asql-b2',
          'Big Sales',
          `List every sale over 4,000, largest first.

Target columns: id, rep, revenue`,
          SALES,
          `SELECT id, rep, revenue FROM sales WHERE revenue > 4000 ORDER BY revenue DESC;`,
          'Sales above 4,000, largest first',
          3,
          30
        ),
        sql(
          'q-asql-b3',
          'Product Averages',
          `For each product, return how many sales it had and its average revenue rounded to a whole number.

Order by product.

Target columns: product, sales, avg_revenue`,
          SALES,
          `SELECT product, COUNT(*) AS sales, ROUND(AVG(revenue)) AS avg_revenue FROM sales GROUP BY product ORDER BY product;`,
          'Sales count and average per product',
          4,
          40
        ),
      ],
    },
    Junior: {
      description: 'Everyday analyst queries: monthly totals, best results per person, distinct counts and shares of a total.',
      estimatedMinutes: 16,
      passingScore: 70,
      questions: [
        sql(
          'q-asql-j1',
          'Revenue by Month',
          `Return total revenue for each month as "YYYY-MM".

Order by month.

Target columns: month, revenue`,
          SALES,
          `SELECT strftime('%Y-%m', order_date) AS month, SUM(revenue) AS revenue FROM sales GROUP BY month ORDER BY month;`,
          'One row per month',
          4,
          25
        ),
        sql(
          'q-asql-j2',
          "Each Rep's Best Sale",
          `Return each rep's single biggest sale.

Order by best_sale descending.

Target columns: rep, best_sale`,
          SALES,
          `SELECT rep, MAX(revenue) AS best_sale FROM sales GROUP BY rep ORDER BY best_sale DESC;`,
          'Biggest sale per rep',
          3,
          25
        ),
        sql(
          'q-asql-j3',
          'Reps Selling in Several Regions',
          `Find the reps who made sales in more than one region, with how many regions.

Order by rep.

Target columns: rep, regions`,
          SALES,
          `SELECT rep, COUNT(DISTINCT region) AS regions FROM sales GROUP BY rep HAVING COUNT(DISTINCT region) > 1 ORDER BY rep;`,
          'Reps active in more than one region',
          4,
          25
        ),
        sql(
          'q-asql-j4',
          'Share of Revenue by Region',
          `Return each region's share of total revenue as a percentage rounded to 1 decimal place.

Order by share_pct descending.

Target columns: region, share_pct`,
          SALES,
          `SELECT region, ROUND(100.0 * SUM(revenue) / (SELECT SUM(revenue) FROM sales), 1) AS share_pct FROM sales GROUP BY region ORDER BY share_pct DESC;`,
          'Each region as a percentage of the total',
          5,
          25
        ),
      ],
    },
    Senior: {
      description: 'Senior analyst SQL: winners per period, moving averages, period-over-period growth by segment and medians without a MEDIAN function.',
      estimatedMinutes: 25,
      passingScore: 75,
      questions: [
        sql(
          'q-asql-s1',
          'Top Rep Each Month',
          `For each month, find the rep with the most revenue that month and their share of the month's revenue, rounded to 1 decimal place.

Order by month.

Target columns: month ("YYYY-MM"), rep, revenue, share_pct`,
          SALES,
          `WITH rep_month AS (
  SELECT strftime('%Y-%m', order_date) AS month, rep, SUM(revenue) AS revenue FROM sales GROUP BY month, rep
), ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY month ORDER BY revenue DESC) AS rn,
    SUM(revenue) OVER (PARTITION BY month) AS month_total FROM rep_month
)
SELECT month, rep, revenue, ROUND(100.0 * revenue / month_total, 1) AS share_pct FROM ranked WHERE rn = 1 ORDER BY month;`,
          'The leading rep of each month with their share',
          7,
          25
        ),
        sql(
          'q-asql-s2',
          'Moving Average by Region',
          `For every sale, show the average revenue of that sale and up to two sales before it in the same region (by date), rounded to a whole number.

Order by region, then order_date.

Target columns: region, order_date, revenue, moving_avg`,
          SALES,
          `SELECT region, order_date, revenue,
  ROUND(AVG(revenue) OVER (PARTITION BY region ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)) AS moving_avg
FROM sales ORDER BY region, order_date;`,
          'A three-sale moving average per region',
          5,
          25
        ),
        sql(
          'q-asql-s3',
          'Growth Months by Region',
          `Total revenue per region per month, then return only the months where a region's revenue grew compared with its previous month.

Order by region, then month.

Target columns: region, month ("YYYY-MM"), revenue, prev_revenue`,
          SALES,
          `WITH monthly AS (
  SELECT region, strftime('%Y-%m', order_date) AS month, SUM(revenue) AS revenue FROM sales GROUP BY region, month
), with_prev AS (
  SELECT *, LAG(revenue) OVER (PARTITION BY region ORDER BY month) AS prev_revenue FROM monthly
)
SELECT region, month, revenue, prev_revenue FROM with_prev WHERE revenue > prev_revenue ORDER BY region, month;`,
          'Only months that beat the month before',
          6,
          25
        ),
        sql(
          'q-asql-s4',
          'Median Sale by Region',
          `Return the median sale revenue of each region. SQLite has no MEDIAN function: with an even number of sales, the median is the average of the two middle values.

Order by region.

Target columns: region, median_revenue`,
          SALES,
          `WITH ordered AS (
  SELECT region, revenue,
    ROW_NUMBER() OVER (PARTITION BY region ORDER BY revenue) AS rn,
    COUNT(*) OVER (PARTITION BY region) AS n
  FROM sales
)
SELECT region, AVG(revenue) AS median_revenue FROM ordered
WHERE rn IN ((n + 1) / 2, (n + 2) / 2)
GROUP BY region ORDER BY region;`,
          'The middle value of each region',
          7,
          25
        ),
      ],
    },
  },

  // ---------- SQL for Testing (main version: Junior) ----------
  'test-qasql-01': {
    Beginner: {
      description: 'Look things up in a shop database while testing: filter orders, count by status and spot unusual quantities.',
      estimatedMinutes: 12,
      passingScore: 70,
      questions: [
        sql(
          'q-qasql-b1',
          'Pending Orders',
          `List the orders whose status is 'pending'.

Order by id.

Target columns: id, total`,
          SHOP_ORDERS,
          `SELECT id, total FROM shop_orders WHERE status = 'pending' ORDER BY id;`,
          'Every pending order',
          3,
          30
        ),
        sql(
          'q-qasql-b2',
          'Orders by Status',
          `Count the orders in each status.

Order by status.

Target columns: status, orders`,
          SHOP_ORDERS,
          `SELECT status, COUNT(*) AS orders FROM shop_orders GROUP BY status ORDER BY status;`,
          'A count per status',
          4,
          35
        ),
        sql(
          'q-qasql-b3',
          'Multi-Item Lines',
          `List the order items with a quantity above 1.

Order by id.

Target columns: id, product, quantity`,
          SHOP_ITEMS,
          `SELECT id, product, quantity FROM shop_order_items WHERE quantity > 1 ORDER BY id;`,
          'Items bought more than once',
          3,
          35
        ),
      ],
    },
    Professional: {
      description: 'Validation queries a QA engineer writes before sign-off: missing relationships, money that is off, merged duplicates and timing checks.',
      estimatedMinutes: 20,
      passingScore: 75,
      questions: [
        sql(
          'q-qasql-p1',
          'Customers Without Orders',
          `Find customers who have never placed an order.

Order by id.

Target columns: id, name`,
          `${SHOP_CUSTOMERS}\n${SHOP_ORDERS}`,
          `SELECT c.id, c.name FROM shop_customers c LEFT JOIN shop_orders o ON o.customer_id = c.id WHERE o.id IS NULL ORDER BY c.id;`,
          'Every customer with no orders',
          4,
          20
        ),
        sql(
          'q-qasql-p2',
          'How Far Off Are the Totals?',
          `For orders whose total doesn't match the sum of quantity × unit_price over its items (to the penny), show the difference (total minus items_total) rounded to 2 decimal places.

Order by the size of the difference, largest first.

Target columns: id, total, items_total, difference`,
          `${SHOP_ORDERS}\n${SHOP_ITEMS}`,
          `SELECT o.id, o.total, ROUND(SUM(i.quantity * i.unit_price), 2) AS items_total, ROUND(o.total - SUM(i.quantity * i.unit_price), 2) AS difference
FROM shop_orders o JOIN shop_order_items i ON i.order_id = o.id
GROUP BY o.id HAVING ABS(o.total - SUM(i.quantity * i.unit_price)) > 0.005
ORDER BY ABS(difference) DESC;`,
          'Mismatched orders, biggest gap first',
          6,
          30
        ),
        sql(
          'q-qasql-p3',
          'Duplicate Accounts and Their Orders',
          `Group customers by lowercased email. For every email used by more than one account, return how many accounts share it and how many orders those accounts placed in total.

Order by email.

Target columns: email, accounts, orders`,
          `${SHOP_CUSTOMERS}\n${SHOP_ORDERS}`,
          `SELECT LOWER(c.email) AS email, COUNT(DISTINCT c.id) AS accounts, COUNT(DISTINCT o.id) AS orders
FROM shop_customers c LEFT JOIN shop_orders o ON o.customer_id = c.id
GROUP BY LOWER(c.email) HAVING COUNT(DISTINCT c.id) > 1 ORDER BY email;`,
          'Each shared email with its accounts and orders',
          5,
          25
        ),
        sql(
          'q-qasql-p4',
          'Days to Ship',
          `For orders that have a shipped_at on or after placed_at, return how many whole days shipping took.

Order by id.

Target columns: id, days`,
          SHOP_ORDERS,
          `SELECT id, CAST(julianday(shipped_at) - julianday(placed_at) AS INTEGER) AS days
FROM shop_orders WHERE shipped_at IS NOT NULL AND shipped_at >= placed_at ORDER BY id;`,
          'Shipping time for every validly shipped order',
          5,
          25
        ),
      ],
    },
    Senior: {
      description: 'Build the checks a release depends on: one query reporting every defect, a merge plan for duplicates, impact analysis and a data quality score.',
      estimatedMinutes: 25,
      passingScore: 75,
      questions: [
        sql(
          'q-qasql-s1',
          'One Report for Every Defect',
          `Write a single query returning one row per problem found, as (check_name, record_id):
- 'orphan_item': an order item whose order doesn't exist (record_id is the item id)
- 'total_mismatch': an order whose total differs from its items by more than half a penny (order id)
- 'impossible_state': a shipped/delivered order with no shipped_at or shipped before placed, or a pending order with a shipped_at (order id)

Order by check_name, then record_id.

Target columns: check_name, record_id`,
          `${SHOP_ORDERS}\n${SHOP_ITEMS}`,
          `SELECT 'orphan_item' AS check_name, i.id AS record_id FROM shop_order_items i LEFT JOIN shop_orders o ON o.id = i.order_id WHERE o.id IS NULL
UNION ALL
SELECT 'total_mismatch', o.id FROM shop_orders o JOIN shop_order_items i ON i.order_id = o.id GROUP BY o.id HAVING ABS(o.total - SUM(i.quantity * i.unit_price)) > 0.005
UNION ALL
SELECT 'impossible_state', id FROM shop_orders
WHERE (status IN ('shipped', 'delivered') AND (shipped_at IS NULL OR shipped_at < placed_at)) OR (status = 'pending' AND shipped_at IS NOT NULL)
ORDER BY check_name, record_id;`,
          'Every defect from all three checks',
          8,
          30
        ),
        sql(
          'q-qasql-s2',
          'Merge Plan for Duplicates',
          `Accounts sharing an email (ignoring case) will be merged into the one with the lowest id. Return one row per account that will be merged away.

Order by email.

Target columns: email (lowercased), keep_id, merge_id`,
          SHOP_CUSTOMERS,
          `SELECT LOWER(c.email) AS email, k.keep_id, c.id AS merge_id
FROM shop_customers c
JOIN (SELECT LOWER(email) AS email, MIN(id) AS keep_id FROM shop_customers GROUP BY LOWER(email)) k ON k.email = LOWER(c.email)
WHERE c.id <> k.keep_id ORDER BY email;`,
          'Which account each duplicate merges into',
          6,
          20
        ),
        sql(
          'q-qasql-s3',
          'Orders Affected by the Merge',
          `List every order placed by an account whose email is shared with another account (ignoring case). These need re-testing after the merge.

Order by order id.

Target columns: id, customer_id`,
          `${SHOP_ORDERS}\n${SHOP_CUSTOMERS}`,
          `SELECT o.id, o.customer_id FROM shop_orders o JOIN shop_customers c ON c.id = o.customer_id
WHERE LOWER(c.email) IN (SELECT LOWER(email) FROM shop_customers GROUP BY LOWER(email) HAVING COUNT(*) > 1)
ORDER BY o.id;`,
          'Orders from any duplicated account',
          5,
          20
        ),
        sql(
          'q-qasql-s4',
          'Data Quality Score per Table',
          `Score each table by the share of clean rows, as a percentage rounded to 1 decimal place:
- shop_orders: a row is bad if its total mismatches its items or its state is impossible (as in task 1)
- shop_order_items: a row is bad if its order doesn't exist
- shop_customers: a row is bad if it will be merged away (task 2)

Order by table_name.

Target columns: table_name, total_rows, bad_rows, pct_clean`,
          `${SHOP_ORDERS}\n${SHOP_ITEMS}\n${SHOP_CUSTOMERS}`,
          `WITH bad_orders AS (
  SELECT o.id FROM shop_orders o JOIN shop_order_items i ON i.order_id = o.id GROUP BY o.id HAVING ABS(o.total - SUM(i.quantity * i.unit_price)) > 0.005
  UNION
  SELECT id FROM shop_orders WHERE (status IN ('shipped', 'delivered') AND (shipped_at IS NULL OR shipped_at < placed_at)) OR (status = 'pending' AND shipped_at IS NOT NULL)
), scores AS (
  SELECT 'shop_customers' AS table_name, (SELECT COUNT(*) FROM shop_customers) AS total_rows,
    (SELECT COUNT(*) FROM shop_customers c WHERE c.id > (SELECT MIN(id) FROM shop_customers x WHERE LOWER(x.email) = LOWER(c.email))) AS bad_rows
  UNION ALL
  SELECT 'shop_order_items', (SELECT COUNT(*) FROM shop_order_items),
    (SELECT COUNT(*) FROM shop_order_items i WHERE i.order_id NOT IN (SELECT id FROM shop_orders))
  UNION ALL
  SELECT 'shop_orders', (SELECT COUNT(*) FROM shop_orders), (SELECT COUNT(*) FROM bad_orders)
)
SELECT table_name, total_rows, bad_rows, ROUND(100.0 * (total_rows - bad_rows) / total_rows, 1) AS pct_clean FROM scores ORDER BY table_name;`,
          'A clean-row score for each table',
          6,
          30
        ),
      ],
    },
  },
};

// Every main version followed by its other levels
export function withLevelVersions(mains: AssessmentTest[]): AssessmentTest[] {
  return mains.flatMap((main) => {
    const levels = LEVEL_CONTENT[main.id] ?? {};
    const versions = Object.entries(levels).map(([level, content]) => ({
      ...main,
      id: `${main.id}-${level.toLowerCase()}`,
      familyId: main.id,
      difficulty: level as TestDifficulty,
      description: content!.description ?? main.description,
      estimatedMinutes: content!.estimatedMinutes,
      passingScore: content!.passingScore ?? main.passingScore,
      totalQuestions: content!.questions.length,
      questions: content!.questions,
    }));
    return [main, ...versions];
  });
}
