import React from 'react';

/**
 * The kinds of question a Vetter test can set, each with a small drawing of what the candidate sees, one line on
 * what it shows and how it's marked. The drawings are inline SVG on one 240x140 grid in the site's greys and navy, so
 * they read as a set.
 */

const LINE = '#dadfe7';
const FILL = '#f6f7f9';
const INK = '#5c6777';
const NAVY = '#2b3a6e';
const ACCENT = '#5b50e5';
const GREEN = '#00a060';
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const Frame: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <svg viewBox="0 0 240 140" role="img" aria-label={label} className="w-full h-auto block">
    {children}
  </svg>
);

// Grey bars standing in for text
const Bar: React.FC<{ x: number; y: number; w: number; h?: number; fill?: string }> = ({ x, y, w, h = 5, fill = LINE }) => (
  <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} />
);

const MultipleChoice = () => (
  <Frame label="Four answer options with the second one chosen">
    <Bar x={20} y={14} w={150} h={6} fill={INK} />
    {[0, 1, 2, 3].map((i) => {
      const y = 32 + i * 25;
      const on = i === 1;
      return (
        <g key={i}>
          <rect x={20} y={y} width={200} height={19} rx={6} fill={on ? '#eef0fb' : '#fff'} stroke={on ? ACCENT : LINE} />
          <circle cx={32} cy={y + 9.5} r={4.5} fill="#fff" stroke={on ? ACCENT : '#a9b2bf'} strokeWidth={1.5} />
          {on && <circle cx={32} cy={y + 9.5} r={2.2} fill={ACCENT} />}
          <Bar x={44} y={y + 7} w={[90, 120, 70, 104][i]} fill={on ? '#a3afd1' : LINE} />
        </g>
      );
    })}
  </Frame>
);

const ShortAnswer = () => (
  <Frame label="A question with a short typed answer">
    <Bar x={20} y={22} w={170} h={6} fill={INK} />
    <Bar x={20} y={34} w={120} />
    <rect x={20} y={56} width={200} height={30} rx={7} fill="#fff" stroke={ACCENT} strokeWidth={1.5} />
    <text x={32} y={76} fontFamily={MONO} fontSize={13} fontWeight={600} fill={NAVY}>
      18.4%
    </text>
    <rect x={76} y={64} width={1.6} height={15} fill={ACCENT} />
    <rect x={20} y={100} width={64} height={20} rx={10} fill="#e6f6ee" />
    <path d="M30 110l4 4 7-8" fill="none" stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Bar x={46} y={108} w={30} fill="#8fd3b4" />
  </Frame>
);

const WrittenAnswer = () => (
  <Frame label="A paragraph answer checked against key points">
    <rect x={14} y={14} width={140} height={112} rx={8} fill="#fff" stroke={LINE} />
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <Bar key={i} x={24} y={26 + i * 13} w={[112, 104, 118, 96, 110, 84, 60][i]} />
    ))}
    <text x={24} y={118} fontFamily={MONO} fontSize={8} fill={INK}>
      142 words
    </text>
    {[0, 1, 2].map((i) => {
      const y = 26 + i * 30;
      const hit = i < 2;
      return (
        <g key={i}>
          <rect x={164} y={y} width={62} height={22} rx={6} fill={hit ? '#e6f6ee' : FILL} stroke={hit ? '#b5e3cc' : LINE} />
          {hit ? (
            <path d={`M171 ${y + 11}l3 3 6-7`} fill="none" stroke={GREEN} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <circle cx={175} cy={y + 11} r={3.5} fill="none" stroke="#a9b2bf" strokeWidth={1.5} />
          )}
          <Bar x={184} y={y + 8.5} w={34} fill={hit ? '#8fd3b4' : LINE} />
        </g>
      );
    })}
  </Frame>
);

const CaseStudy = () => (
  <Frame label="An email to read beside the questions on it">
    <rect x={14} y={14} width={120} height={112} rx={8} fill="#fff" stroke={LINE} />
    <rect x={14} y={14} width={120} height={24} rx={8} fill={FILL} />
    <rect x={14} y={30} width={120} height={8} fill={FILL} />
    <circle cx={28} cy={26} r={6} fill="#c9d1e6" />
    <Bar x={40} y={21} w={54} fill={INK} />
    <Bar x={40} y={29} w={36} />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <Bar key={i} x={24} y={48 + i * 11} w={[96, 90, 100, 70, 94, 58][i]} />
    ))}
    <rect x={24} y={58} width={62} height={5} rx={2.5} fill="#ffe2a8" />
    {[0, 1, 2].map((i) => (
      <g key={i}>
        <rect x={144} y={18 + i * 36} width={82} height={28} rx={6} fill="#fff" stroke={i === 0 ? ACCENT : LINE} />
        <text x={152} y={36 + i * 36} fontFamily={MONO} fontSize={9} fontWeight={700} fill={i === 0 ? ACCENT : '#a9b2bf'}>
          Q{i + 1}
        </text>
        <Bar x={170} y={29.5 + i * 36} w={46} fill={i === 0 ? '#a3afd1' : LINE} />
      </g>
    ))}
  </Frame>
);

const Spreadsheet = () => {
  const cols = ['', 'A', 'B', 'C', 'D'];
  const colX = [14, 34, 86, 138, 190];
  const colW = [20, 52, 52, 52, 36];
  return (
    <Frame label="A spreadsheet with a SUM formula in a selected cell">
      <rect x={14} y={10} width={212} height={18} rx={5} fill="#fff" stroke={LINE} />
      <text x={22} y={22.5} fontFamily={MONO} fontSize={8.5} fontStyle="italic" fill={INK}>
        fx
      </text>
      <text x={38} y={22.5} fontFamily={MONO} fontSize={8.5} fill={NAVY}>
        =SUM(C2:C5)
      </text>
      {[0, 1, 2, 3, 4, 5].map((r) =>
        cols.map((c, ci) => {
          const y = 34 + r * 16;
          const head = r === 0 || ci === 0;
          const selected = r === 5 && ci === 3;
          return (
            <g key={`${r}-${ci}`}>
              <rect x={colX[ci]} y={y} width={colW[ci]} height={16} fill={head ? FILL : '#fff'} stroke={LINE} strokeWidth={0.8} />
              {r === 0 && c && (
                <text x={colX[ci] + colW[ci] / 2} y={y + 11} textAnchor="middle" fontFamily={MONO} fontSize={8} fill={INK}>
                  {c}
                </text>
              )}
              {ci === 0 && r > 0 && (
                <text x={colX[0] + 10} y={y + 11} textAnchor="middle" fontFamily={MONO} fontSize={8} fill={INK}>
                  {r}
                </text>
              )}
              {r > 0 && r < 5 && ci > 0 && ci < 4 && <Bar x={colX[ci] + 6} y={y + 6} w={ci === 3 ? 26 : 34} h={4} />}
              {selected && (
                <>
                  <rect x={colX[ci]} y={y} width={colW[ci]} height={16} fill="#eef0fb" stroke={ACCENT} strokeWidth={1.6} />
                  <text x={colX[ci] + colW[ci] - 6} y={y + 11} textAnchor="end" fontFamily={MONO} fontSize={8.5} fontWeight={700} fill={NAVY}>
                    4,210
                  </text>
                </>
              )}
            </g>
          );
        })
      )}
    </Frame>
  );
};

const Sql = () => (
  <Frame label="A SQL query and the table it returns">
    <rect x={14} y={10} width={212} height={62} rx={8} fill="#1f2b57" />
    {[
      [['SELECT', '#9fb0ff'], [' region, SUM(sales)', '#e4e8f3']],
      [['FROM', '#9fb0ff'], [' orders', '#e4e8f3']],
      [['GROUP BY', '#9fb0ff'], [' region', '#e4e8f3']],
    ].map((parts, i) => (
      <text key={i} x={24} y={28 + i * 15} fontFamily={MONO} fontSize={9.5}>
        {parts.map(([t, c], j) => (
          <tspan key={j} fill={c}>
            {t}
          </tspan>
        ))}
      </text>
    ))}
    <rect x={14} y={80} width={212} height={50} rx={8} fill="#fff" stroke={LINE} />
    <rect x={14} y={80} width={212} height={15} rx={8} fill={FILL} />
    <rect x={14} y={88} width={212} height={7} fill={FILL} />
    <text x={24} y={91} fontFamily={MONO} fontSize={8} fontWeight={700} fill={INK}>
      region
    </text>
    <text x={216} y={91} textAnchor="end" fontFamily={MONO} fontSize={8} fontWeight={700} fill={INK}>
      sum
    </text>
    {[
      ['North', '1,840'],
      ['South', '2,370'],
    ].map(([a, b], i) => (
      <g key={a}>
        <line x1={14} x2={226} y1={96 + i * 16} y2={96 + i * 16} stroke={LINE} />
        <text x={24} y={107 + i * 16} fontFamily={MONO} fontSize={8.5} fill={NAVY}>
          {a}
        </text>
        <text x={216} y={107 + i * 16} textAnchor="end" fontFamily={MONO} fontSize={8.5} fill={NAVY}>
          {b}
        </text>
      </g>
    ))}
  </Frame>
);

const Coding = () => (
  <Frame label="A function in a code editor with its tests passing">
    <rect x={14} y={10} width={212} height={82} rx={8} fill="#fff" stroke={LINE} />
    {[1, 2, 3, 4].map((n, i) => (
      <text key={n} x={24} y={30 + i * 16} fontFamily={MONO} fontSize={8} fill="#a9b2bf">
        {n}
      </text>
    ))}
    <text x={38} y={30} fontFamily={MONO} fontSize={9.5}>
      <tspan fill={ACCENT}>function</tspan>
      <tspan fill={NAVY}> total(items) {'{'}</tspan>
    </text>
    <text x={50} y={46} fontFamily={MONO} fontSize={9.5}>
      <tspan fill={ACCENT}>return</tspan>
      <tspan fill={NAVY}> items.reduce(</tspan>
    </text>
    <text x={62} y={62} fontFamily={MONO} fontSize={9.5} fill={NAVY}>
      (s, i) =&gt; s + i.qty, 0);
    </text>
    <text x={38} y={78} fontFamily={MONO} fontSize={9.5} fill={NAVY}>
      {'}'}
    </text>
    {[0, 1, 2].map((i) => (
      <g key={i}>
        <rect x={14 + i * 72} y={102} width={66} height={24} rx={6} fill="#e6f6ee" stroke="#b5e3cc" />
        <path d={`M${24 + i * 72} 114l3 3 6-7`} fill="none" stroke={GREEN} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <text x={38 + i * 72} y={117.5} fontFamily={MONO} fontSize={8.5} fontWeight={600} fill="#0b7a4b">
          test {i + 1}
        </text>
      </g>
    ))}
  </Frame>
);

const AppSimulation = () => (
  <Frame label="A working copy of business software with a chart and a button">
    <rect x={10} y={8} width={220} height={124} rx={8} fill="#fff" stroke={LINE} />
    <rect x={10} y={8} width={220} height={16} rx={8} fill={FILL} />
    <rect x={10} y={18} width={220} height={6} fill={FILL} />
    {['#f2a3b3', '#f6cf86', '#8fd3b4'].map((c, i) => (
      <circle key={c} cx={20 + i * 8} cy={16} r={2.6} fill={c} />
    ))}
    <rect x={52} y={12} width={110} height={8} rx={4} fill="#fff" stroke={LINE} />
    <rect x={10} y={24} width={44} height={108} fill={FILL} />
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x={18} y={34 + i * 15} width={28} height={7} rx={3.5} fill={i === 1 ? '#c9d1e6' : LINE} />
    ))}
    <Bar x={64} y={34} w={60} h={6} fill={INK} />
    {[30, 46, 38, 58, 50, 70].map((h, i) => (
      <rect key={i} x={66 + i * 18} y={118 - h} width={11} height={h} rx={2} fill={i === 5 ? ACCENT : '#c9d1e6'} />
    ))}
    <line x1={62} x2={176} y1={118.5} y2={118.5} stroke={LINE} />
    <rect x={184} y={32} width={38} height={15} rx={5} fill={ACCENT} />
    <Bar x={192} y={37.5} w={22} h={4} fill="#fff" />
    <rect x={184} y={54} width={38} height={46} rx={6} fill="#fff" stroke={LINE} />
    <Bar x={190} y={62} w={24} h={4} />
    <text x={190} y={82} fontFamily={MONO} fontSize={10} fontWeight={700} fill={NAVY}>
      +12%
    </text>
    <Bar x={190} y={89} w={18} h={4} />
  </Frame>
);

const TYPES: { title: string; text: string; marked: string; Diagram: React.FC }[] = [
  { title: 'App simulation', text: 'A working copy of the software the job uses. Candidates do a real task in it, start to finish.', marked: 'Checked on the state they leave the app in', Diagram: AppSimulation },
  { title: 'Spreadsheet task', text: 'An Excel-style sheet with real data to clean, total, look up or model.', marked: 'Checked by formulas on the finished sheet', Diagram: Spreadsheet },
  { title: 'SQL query', text: 'Real tables to query: filters, joins, grouped totals and window functions.', marked: 'Results compared with the right answer', Diagram: Sql },
  { title: 'Coding', text: 'Write a function in a code editor, then run it against test cases.', marked: 'Run against test cases', Diagram: Coding },
  { title: 'Case study', text: 'Emails, tickets or figures to read, with questions that depend on them.', marked: 'Each question marked on its own', Diagram: CaseStudy },
  { title: 'Written answer', text: 'A paragraph or two: explain a decision, reply to a client, plan an approach.', marked: 'AI marks against the points a strong answer makes', Diagram: WrittenAnswer },
  { title: 'Short answer', text: 'A number, word or phrase worked out from the question.', marked: 'Checked automatically; typos don’t cost marks', Diagram: ShortAnswer },
  { title: 'Multiple choice', text: 'Pick the right answer, or tick every one that applies. Quick to answer, quick to mark.', marked: 'Marked instantly', Diagram: MultipleChoice },
];

export const TestTypeCards: React.FC = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {TYPES.map(({ title, text, marked, Diagram }) => (
      <article key={title} className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2">
          <Diagram />
        </div>
        <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600 flex-1">{text}</p>
        <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">{marked}</p>
      </article>
    ))}
  </div>
);
