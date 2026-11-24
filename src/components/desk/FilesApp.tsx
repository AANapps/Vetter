import React, { useEffect, useRef, useState } from 'react';
import { Copy, Download, FilePlus2, FileSpreadsheet, FileText, FolderOpen, Image, Pencil, Trash2, Upload } from 'lucide-react';
import { CaseFile } from '../../types';
import { cleanHtml, copyGrid, fileGrid, fileKind, freeName } from '../../lib/deskData';
import { downloadFile, readTextFile } from '../../lib/csv';
import { DeskCtx, btn } from './shared';

export type Folder = 'all' | 'mine' | 'shared' | 'attachments' | 'downloads';

// Which app opens which kind of file, among the apps on this desktop
const OPENERS: { app: string; label: string; kinds: string[] }[] = [
  { app: 'sheet', label: 'Spreadsheet', kinds: ['csv'] },
  { app: 'sql', label: 'Database', kinds: ['csv'] },
  { app: 'bi', label: 'BI report', kinds: ['csv'] },
  { app: 'docs', label: 'Docs', kinds: ['doc'] },
];

// File Explorer: the computer's files by where they came from, a preview of each (tables, documents, images, text), and
// what can be done with them: open in another app, copy as a table, attach (from Mail or Chat), save to the candidate's
// own computer, and for their own files rename and delete. Files from their own computer can be uploaded
export const FilesApp: React.FC<{ ctx: DeskCtx; focus: string | null; origin: (f: CaseFile) => Folder }> = ({ ctx, focus, origin }) => {
  const [folder, setFolder] = useState<Folder>('all');
  const [sel, setSel] = useState<string | null>(focus ?? ctx.files[0]?.name ?? null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focus) (setSel(focus), setFolder('all'));
  }, [focus]);
  const list = ctx.files.filter((f) => folder === 'all' || origin(f) === folder);
  const file = ctx.files.find((f) => f.name === sel);
  const mine = (f: CaseFile) => (ctx.state.myFiles ?? []).some((x) => x.name === f.name);
  const grid = file ? fileGrid(file) : null;
  const kind = file ? fileKind(file.name) : 'other';
  const folders: { id: Folder; label: string }[] = [
    { id: 'all', label: 'All files' },
    { id: 'mine', label: 'My files' },
    { id: 'shared', label: 'Shared with me' },
    { id: 'attachments', label: 'Attachments' },
    { id: 'downloads', label: 'Downloads' },
  ];
  const icon = (n: string) => {
    const k = fileKind(n);
    return k === 'csv' ? <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" /> : k === 'doc' ? <FileText className="w-4 h-4 text-sky-700 shrink-0" /> : k === 'image' ? <Image className="w-4 h-4 text-violet-600 shrink-0" /> : <FileText className="w-4 h-4 text-slate-500 shrink-0" />;
  };
  return (
    <div className="h-full flex flex-col text-sm" data-ref="files">
      <div className="h-11 shrink-0 flex items-center gap-1.5 px-3 border-b border-slate-200 bg-slate-50">
        <FolderOpen className="w-4 h-4 text-amber-500" />
        <span className="text-xs text-slate-600">This PC › {folders.find((f) => f.id === folder)!.label}</span>
        <span className="ml-auto flex gap-1.5">
          {ctx.cfg.apps.includes('docs') && (
            <button
              className={btn}
              onClick={() => {
                const n = freeName('New document.docx', ctx.files.map((f) => f.name));
                ctx.saveFile({ name: n, content: '<p></p>' }, '');
                ctx.openFile(n, 'docs');
              }}
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              New document
            </button>
          )}
          <button className={btn} onClick={() => upload.current?.click()} title="Add a file from your own computer">
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
          <input
            ref={upload}
            type="file"
            className="hidden"
            accept=".csv,.tsv,.txt,.md,.json,.html,.htm"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const name = freeName(f.name, ctx.files.map((x) => x.name));
              ctx.saveFile({ name, content: await readTextFile(f) });
              setSel(name);
              e.target.value = '';
            }}
          />
        </span>
      </div>
      <div className="flex-1 min-h-0 flex">
        <nav className="w-40 shrink-0 border-r border-slate-200 py-2 bg-white">
          {folders.map((f) => (
            <button key={f.id} onClick={() => setFolder(f.id)} className={`w-full h-8 px-3 text-left text-xs flex items-center gap-2 ${folder === f.id ? 'bg-amber-50 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}>
              <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
              {f.label}
              <span className="ml-auto text-slate-400">{f.id === 'all' ? ctx.files.length : ctx.files.filter((x) => origin(x) === f.id).length}</span>
            </button>
          ))}
        </nav>
        <ul className="w-60 shrink-0 border-r border-slate-200 overflow-y-auto">
          {list.length === 0 && <li className="p-4 text-xs text-slate-500">No files here yet. Attachments you receive, files you download and anything you save or export appear in Files.</li>}
          {list.map((f) => (
            <li key={f.name}>
              {renaming === f.name ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = String(new FormData(e.currentTarget).get('n') ?? '').trim();
                    const ext = f.name.match(/\.[^.]+$/)?.[0] ?? '';
                    const n = v.endsWith(ext) ? v : `${v}${ext}`;
                    if (v && n !== f.name) {
                      if (ctx.files.some((x) => x.name === n)) return ctx.toast(`There's already a file called ${n}.`);
                      ctx.saveFile({ name: n, content: f.content }, '', f.name);
                      setSel(n);
                    }
                    setRenaming(null);
                  }}
                  className="px-2 py-1.5"
                >
                  <input name="n" autoFocus defaultValue={f.name.replace(/\.[^.]+$/, '')} onBlur={(e) => e.currentTarget.form?.requestSubmit()} className="w-full h-7 px-2 border border-sky-500 rounded text-xs" />
                </form>
              ) : (
                <button onClick={() => setSel(f.name)} onDoubleClick={() => ctx.openFile(f.name, OPENERS.find((o) => o.kinds.includes(fileKind(f.name)) && ctx.cfg.apps.includes(o.app))?.app)} className={`w-full text-left px-3 py-2 flex items-center gap-2 border-b border-slate-100 ${sel === f.name ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                  {icon(f.name)}
                  <span className="truncate text-[13px]">{f.name}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex-1 min-w-0 flex flex-col">
          {file ? (
            <>
              <div className="shrink-0 flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-700 truncate mr-1">{file.name}</span>
                {OPENERS.filter((o) => o.kinds.includes(kind) && ctx.cfg.apps.includes(o.app)).map((o) => (
                  <button key={o.app} className={btn} onClick={() => ctx.openFile(file.name, o.app)} data-ref={`open-in-${o.app}`}>
                    Open in {o.label}
                  </button>
                ))}
                {grid && (
                  <button className={btn} onClick={async () => ctx.toast((await copyGrid(grid)) ? 'Copied as a table. Paste it into Spreadsheet, Docs, Mail or Chat.' : 'Copy was blocked: open it in Spreadsheet instead.')}>
                    <Copy className="w-3.5 h-3.5" />
                    Copy table
                  </button>
                )}
                <button className={btn} onClick={() => downloadFile(kind === 'doc' ? file.name.replace(/\.docx$/i, '.doc') : file.name, kind === 'doc' ? `<html><body>${cleanHtml(file.content)}</body></html>` : file.content, kind === 'csv' ? 'text/csv' : kind === 'image' ? 'image/svg+xml' : 'text/plain')} title="Save to your own computer">
                  <Download className="w-3.5 h-3.5" />
                </button>
                {mine(file) && (
                  <>
                    <button className={btn} onClick={() => setRenaming(file.name)} aria-label="Rename" title="Rename">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button className={btn} onClick={() => (ctx.removeFile(file.name), setSel(null))} aria-label="Delete" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex-1 overflow-auto p-4">
                {grid ? (
                  <>
                    <p className="text-[11px] text-slate-400 mb-1">{Math.max(grid.length - 1, 0)} rows · {grid[0]?.length ?? 0} columns</p>
                    <table className="text-[12.5px] border border-slate-200 select-text">
                      <tbody>
                        {grid.slice(0, 300).map((r, i) => (
                          <tr key={i} className={i === 0 ? 'bg-slate-50 font-semibold' : ''}>
                            {r.map((c, j) => (
                              <td key={j} className="px-2 py-1 border border-slate-100 whitespace-nowrap">
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : kind === 'doc' ? (
                  <div className="desk-doc max-w-2xl bg-white border border-slate-200 shadow-sm px-10 py-8 text-[13.5px] leading-relaxed select-text [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_th]:border [&_th]:border-slate-300 [&_th]:px-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6" dangerouslySetInnerHTML={{ __html: cleanHtml(file.content) }} />
                ) : kind === 'image' && /^\s*<svg/i.test(file.content) ? (
                  <img alt={file.name} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(file.content)}`} className="max-w-full border border-slate-200 bg-white" />
                ) : (
                  <pre className="text-[12.5px] whitespace-pre-wrap font-mono text-slate-800 select-text">{file.content}</pre>
                )}
              </div>
            </>
          ) : (
            <p className="p-4 text-xs text-slate-400">Select a file to preview it.</p>
          )}
        </div>
      </div>
    </div>
  );
};
