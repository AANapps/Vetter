import React from 'react';
import { isNumeric, splitTables } from '../lib/textTables';

// Question text with its column-aligned data drawn as tables, so headers line up with their values in any font
export const RichText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const blocks = splitTables(text);
  return (
    <div className={className}>
      {blocks.map((b, i) =>
        b.kind === 'text' ? (
          <div key={i} className="whitespace-pre-wrap">
            {b.text}
          </div>
        ) : (
          <div key={i} className="my-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-[13px] leading-snug">
              {b.head && (
                <thead className="bg-slate-50">
                  <tr>
                    {b.head.map((h, k) => (
                      <th key={k} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap border-b border-slate-200">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {b.rows.map((row, r) => (
                  <tr key={r} className="border-b border-slate-100 last:border-0">
                    {row.map((c, k) => (
                      <td key={k} className={`px-3 py-1.5 text-slate-800 align-top ${isNumeric(c) ? 'text-right tabular-nums font-mono text-[12.5px]' : ''} ${k === 0 ? 'font-medium' : ''}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};
