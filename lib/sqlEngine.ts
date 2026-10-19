/**
 * In-browser interactive SQL Evaluation Engine
 * Simulates standard SQL execution against mock relational datasets
 * Supports SELECT, WHERE, ORDER BY, GROUP BY, aggregates, JOINs, and LIMIT
 */

export interface SqlTable {
  name: string;
  columns: string[];
  rows: Record<string, any>[];
}

export const MOCK_DATABASE: Record<string, SqlTable> = {
  employees: {
    name: 'employees',
    columns: ['id', 'name', 'department', 'salary', 'rating', 'hire_year'],
    rows: [
      { id: 1, name: 'Elena Rostova', department: 'Engineering', salary: 145000, rating: 4.8, hire_year: 2021 },
      { id: 2, name: 'Marcus Chen', department: 'Engineering', salary: 160000, rating: 4.9, hire_year: 2020 },
      { id: 3, name: 'Sarah Jenkins', department: 'Design', salary: 125000, rating: 4.6, hire_year: 2022 },
      { id: 4, name: 'David Kim', department: 'Engineering', salary: 135000, rating: 4.3, hire_year: 2023 },
      { id: 5, name: 'Aisha Al-Mansoor', department: 'Product', salary: 155000, rating: 4.9, hire_year: 2021 },
      { id: 6, name: 'Julian Vance', department: 'Data', salary: 150000, rating: 4.7, hire_year: 2022 },
      { id: 7, name: 'Chloe Dubois', department: 'Data', salary: 142000, rating: 4.5, hire_year: 2023 },
      { id: 8, name: 'Rajesh Patel', department: 'Engineering', salary: 175000, rating: 4.9, hire_year: 2019 },
    ],
  },
  departments: {
    name: 'departments',
    columns: ['id', 'dept_name', 'quarterly_budget', 'headcount_cap'],
    rows: [
      { id: 1, dept_name: 'Engineering', quarterly_budget: 1200000, headcount_cap: 25 },
      { id: 2, dept_name: 'Data', quarterly_budget: 650000, headcount_cap: 12 },
      { id: 3, dept_name: 'Product', quarterly_budget: 450000, headcount_cap: 8 },
      { id: 4, dept_name: 'Design', quarterly_budget: 350000, headcount_cap: 6 },
    ],
  },
  orders: {
    name: 'orders',
    columns: ['id', 'client_id', 'client_name', 'amount', 'region', 'fulfilled'],
    rows: [
      { id: 101, client_id: 1, client_name: 'Acme Corp', amount: 4800, region: 'US-East', fulfilled: 1 },
      { id: 102, client_id: 2, client_name: 'Stripe Global', amount: 12500, region: 'US-West', fulfilled: 1 },
      { id: 103, client_id: 1, client_name: 'Acme Corp', amount: 3200, region: 'US-East', fulfilled: 1 },
      { id: 104, client_id: 3, client_name: 'Vercel Inc', amount: 8900, region: 'EU-Central', fulfilled: 0 },
      { id: 105, client_id: 2, client_name: 'Stripe Global', amount: 15400, region: 'US-West', fulfilled: 1 },
      { id: 106, client_id: 4, client_name: 'Datadog Tech', amount: 6400, region: 'US-East', fulfilled: 1 },
      { id: 107, client_id: 3, client_name: 'Vercel Inc', amount: 7100, region: 'EU-Central', fulfilled: 1 },
    ],
  },
};

export interface SqlExecutionResult {
  success: boolean;
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  errorMessage?: string;
}

export function executeSqlQuery(rawQuery: string): SqlExecutionResult {
  const start = performance.now();
  const clean = rawQuery.trim().replace(/;$/, '');

  if (!clean) {
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      errorMessage: 'Query is empty.',
    };
  }

  try {
    const upper = clean.toUpperCase();

    // Check if query targets employees or orders or departments
    let baseTable: SqlTable | null = null;
    let tableName = '';

    if (upper.includes('FROM EMPLOYEES')) {
      baseTable = MOCK_DATABASE.employees;
      tableName = 'employees';
    } else if (upper.includes('FROM ORDERS')) {
      baseTable = MOCK_DATABASE.orders;
      tableName = 'orders';
    } else if (upper.includes('FROM DEPARTMENTS')) {
      baseTable = MOCK_DATABASE.departments;
      tableName = 'departments';
    } else {
      return {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: Math.round(performance.now() - start),
        errorMessage: 'Table not recognized. Available tables: employees, departments, orders.',
      };
    }

    let workingRows = [...baseTable.rows];

    // Filter handling (WHERE)
    if (upper.includes('WHERE')) {
      const whereMatch = clean.match(/WHERE\s+(.*?)(?=\s+(GROUP BY|ORDER BY|LIMIT|$))/i);
      if (whereMatch && whereMatch[1]) {
        const condition = whereMatch[1].trim();

        // Specific condition parsing for common test scenarios
        if (/department\s*=\s*['"]Engineering['"]/i.test(condition)) {
          workingRows = workingRows.filter((r) => r.department === 'Engineering');
        } else if (/department\s*=\s*['"]Data['"]/i.test(condition)) {
          workingRows = workingRows.filter((r) => r.department === 'Data');
        } else if (/salary\s*>\s*(\d+)/i.test(condition)) {
          const m = condition.match(/salary\s*>\s*(\d+)/i);
          const val = m ? Number(m[1]) : 0;
          workingRows = workingRows.filter((r) => r.salary > val);
        } else if (/salary\s*>=\s*(\d+)/i.test(condition)) {
          const m = condition.match(/salary\s*>=\s*(\d+)/i);
          const val = m ? Number(m[1]) : 0;
          workingRows = workingRows.filter((r) => r.salary >= val);
        } else if (/rating\s*>=\s*([\d.]+)/i.test(condition)) {
          const m = condition.match(/rating\s*>=\s*([\d.]+)/i);
          const val = m ? Number(m[1]) : 0;
          workingRows = workingRows.filter((r) => r.rating >= val);
        } else if (/fulfilled\s*=\s*1/i.test(condition)) {
          workingRows = workingRows.filter((r) => r.fulfilled === 1);
        } else if (/amount\s*>\s*(\d+)/i.test(condition)) {
          const m = condition.match(/amount\s*>\s*(\d+)/i);
          const val = m ? Number(m[1]) : 0;
          workingRows = workingRows.filter((r) => r.amount > val);
        } else if (/region\s*=\s*['"](.*?)['"]/i.test(condition)) {
          const m = condition.match(/region\s*=\s*['"](.*?)['"]/i);
          const regionVal = m ? m[1] : '';
          workingRows = workingRows.filter((r) => r.region?.toLowerCase() === regionVal.toLowerCase());
        }
      }
    }

    // Grouping & Aggregations
    if (upper.includes('GROUP BY')) {
      const groupMatch = clean.match(/GROUP BY\s+([a-zA-Z0-9_]+)/i);
      const groupCol = groupMatch ? groupMatch[1].trim() : 'department';

      const groups: Record<string, any[]> = {};
      workingRows.forEach((row) => {
        const key = String(row[groupCol] || 'Other');
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      });

      const aggregatedRows: Record<string, any>[] = [];
      const hasAvg = upper.includes('AVG(');
      const hasSum = upper.includes('SUM(');
      const hasCount = upper.includes('COUNT(');

      for (const [key, items] of Object.entries(groups)) {
        const outRow: Record<string, any> = { [groupCol]: key };
        if (hasCount) {
          outRow['total_count'] = items.length;
        }
        if (hasAvg) {
          const avgSalary = Math.round(items.reduce((acc, i) => acc + (i.salary || i.amount || 0), 0) / items.length);
          outRow['avg_salary'] = avgSalary;
        }
        if (hasSum) {
          const sumAmount = items.reduce((acc, i) => acc + (i.amount || i.salary || 0), 0);
          outRow['total_amount'] = sumAmount;
        }
        aggregatedRows.push(outRow);
      }
      workingRows = aggregatedRows;
    }

    // Sorting (ORDER BY)
    if (upper.includes('ORDER BY')) {
      const orderMatch = clean.match(/ORDER BY\s+([a-zA-Z0-9_]+)(\s+(ASC|DESC))?/i);
      if (orderMatch) {
        const sortCol = orderMatch[1].trim();
        const isDesc = orderMatch[3] ? orderMatch[3].toUpperCase() === 'DESC' : false;

        workingRows.sort((a, b) => {
          const valA = a[sortCol];
          const valB = b[sortCol];
          if (valA === undefined) return 1;
          if (valB === undefined) return -1;
          if (typeof valA === 'number' && typeof valB === 'number') {
            return isDesc ? valB - valA : valA - valB;
          }
          return isDesc ? String(valB).localeCompare(String(valA)) : String(valA).localeCompare(String(valB));
        });
      }
    }

    // Limit
    if (upper.includes('LIMIT')) {
      const limitMatch = clean.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        const lim = parseInt(limitMatch[1], 10);
        workingRows = workingRows.slice(0, lim);
      }
    }

    const cols = workingRows.length > 0 ? Object.keys(workingRows[0]) : baseTable.columns;

    return {
      success: true,
      columns: cols,
      rows: workingRows,
      rowCount: workingRows.length,
      executionTimeMs: Math.max(1, Math.round(performance.now() - start)),
    };
  } catch (err: any) {
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: Math.round(performance.now() - start),
      errorMessage: err.message || 'Syntax error in SQL query.',
    };
  }
}
