// A database task's answer: what's in the query window, and the statements that changed the database
export interface DatabaseWork {
  script: string;
  changes: string[];
}

export function parseDatabaseWork(json: string): DatabaseWork {
  try {
    const w = JSON.parse(json);
    return { script: String(w?.script ?? ''), changes: Array.isArray(w?.changes) ? w.changes.map(String) : [] };
  } catch {
    return { script: '', changes: [] };
  }
}

export const databaseStarter = (script: string) => JSON.stringify({ script, changes: [] } satisfies DatabaseWork);
