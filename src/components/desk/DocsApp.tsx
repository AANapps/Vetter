import React, { useEffect, useRef, useState } from 'react';
import { Bold, Copy, FileDown, FilePlus2, Heading1, Heading2, Italic, List, ListOrdered, Redo2, Save, Table2, Underline, Undo2 } from 'lucide-react';
import { CaseFile } from '../../types';
import { cleanHtml, fileKind, freeName, gridFromClipboard, gridToHtml, htmlToText } from '../../lib/deskData';
import { downloadFile } from '../../lib/csv';
import { DeskCtx, btn, input } from './shared';

// Word/Google Docs: documents are files (".docx", kept as HTML) so they can be attached to emails, shared in chat and
// marked by their words. Pasting cells from Spreadsheet, a table from a web page or a CSV's lines makes a real table.
export const DocsApp: React.FC<{ ctx: DeskCtx; focus?: string | null }> = ({ ctx, focus }) => {
  const docs = ctx.files.filter((f) => fileKind(f.name) === 'doc');
  const [name, setName] = useState<string | null>(focus ?? null);
  useEffect(() => {
    if (focus) setName(focus);
  }, [focus]);
  const doc = docs.find((d) => d.name === name);
  return doc ? (
    <Editor key={doc.name} ctx={ctx} doc={doc} onClose={() => setName(null)} onRename={setName} />
  ) : (
    <div className="h-full overflow-y-auto bg-slate-50 p-6 text-[13px]" data-ref="docs">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
          <button
            className={`${btn} ml-auto`}
            onClick={() => {
              const n = freeName('Untitled document.docx', ctx.files.map((f) => f.name));
              ctx.saveFile({ name: n, content: '<p></p>' }, '');
              setName(n);
            }}
            data-ref="docs-new"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            Blank document
          </button>
        </div>
        {docs.length === 0 && <p className="text-xs text-slate-500">No documents yet. Start a blank one.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {docs.map((d) => (
            <button key={d.name} onClick={() => setName(d.name)} className="text-left group">
              <div className="h-36 bg-white border border-slate-200 rounded group-hover:border-sky-500 p-3 overflow-hidden text-[7px] leading-tight text-slate-500 whitespace-pre-wrap">{htmlToText(d.content).slice(0, 600)}</div>
              <div className="mt-1 text-xs font-medium text-slate-800 truncate">{d.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const Editor: React.FC<{ ctx: DeskCtx; doc: CaseFile; onClose: () => void; onRename: (n: string) => void }> = ({ ctx, doc, onClose, onRename }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(doc.name.replace(/\.(docx?|html?)$/i, ''));
  const [dirty, setDirty] = useState(false);
  const [words, setWords] = useState(0);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = cleanHtml(doc.content);
    count();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const count = () => setWords((htmlToText(ref.current?.innerHTML ?? '').match(/\S+/g) ?? []).length);
  const html = () => cleanHtml(ref.current?.innerHTML ?? '');
  const save = (quiet = false) => {
    const n = `${title.trim() || 'Untitled document'}.docx`;
    if (n !== doc.name && ctx.files.some((f) => f.name === n)) return ctx.toast(`There's already a file called ${n}.`);
    ctx.saveFile({ name: n, content: html() }, quiet ? '' : undefined, doc.name);
    if (n !== doc.name) onRename(n);
    setDirty(false);
  };
  // Saves on its own a moment after typing stops, as online editors do
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => save(true), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, words]);
  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    setDirty(true);
    count();
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    const rich = e.clipboardData.getData('text/html');
    const g = gridFromClipboard(text, rich);
    e.preventDefault();
    if (g && (text.includes('\t') || /<table/i.test(rich) || g.length > 1)) exec('insertHTML', gridToHtml(g) + '<p></p>');
    else if (rich) exec('insertHTML', cleanHtml(rich));
    else exec('insertText', text);
  };
  const tool = (label: string, Icon: React.ComponentType<{ className?: string }>, run: () => void) => (
    <button onMouseDown={(e) => e.preventDefault()} onClick={run} title={label} aria-label={label} className="w-8 h-8 grid place-items-center rounded hover:bg-slate-200 text-slate-700">
      <Icon className="w-4 h-4" />
    </button>
  );
  return (
    <div className="h-full flex flex-col bg-slate-100 text-[13px]" data-ref="docs-editor">
      <div className="shrink-0 bg-white border-b border-slate-200 px-3 pt-2 pb-1 space-y-1">
        <div className="flex items-center gap-2">
          <button onClick={() => (save(true), onClose())} className="text-xs text-sky-700 hover:underline">
            ← Documents
          </button>
          <input value={title} onChange={(e) => (setTitle(e.target.value), setDirty(true))} onBlur={() => save(true)} className="h-7 px-1.5 text-[15px] font-medium text-slate-900 rounded hover:ring-1 hover:ring-slate-200 focus:ring-2 focus:ring-sky-500/30 outline-none min-w-0 flex-1" aria-label="Document name" data-ref="docs-title" />
          <span className="text-[11px] text-slate-400">{dirty ? 'Saving…' : 'Saved to Files'}</span>
          <button className={btn} onClick={() => save()} title="Save (Ctrl+S)">
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
          <button
            className={btn}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(htmlToText(html()));
                ctx.toast('Copied the text. Paste it into an email or chat.');
              } catch {
                ctx.toast('Copy was blocked: select the text and press Ctrl+C.');
              }
            }}
          >
            <Copy className="w-3.5 h-3.5" />
            Copy text
          </button>
          <button className={btn} onClick={() => downloadFile(`${title || 'document'}.doc`, `<html><body>${html()}</body></html>`, 'application/msword')} title="Download to your own computer">
            <FileDown className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          {tool('Undo', Undo2, () => exec('undo'))}
          {tool('Redo', Redo2, () => exec('redo'))}
          <span className="w-px h-5 bg-slate-200 mx-1" />
          <select onChange={(e) => (exec('formatBlock', e.target.value), (e.target.value = ''))} defaultValue="" className={`${input} !w-32 !h-7`} aria-label="Style">
            <option value="" disabled>
              Style
            </option>
            <option value="P">Normal text</option>
            <option value="H1">Heading 1</option>
            <option value="H2">Heading 2</option>
            <option value="H3">Heading 3</option>
            <option value="BLOCKQUOTE">Quote</option>
          </select>
          {tool('Heading 1', Heading1, () => exec('formatBlock', 'H1'))}
          {tool('Heading 2', Heading2, () => exec('formatBlock', 'H2'))}
          {tool('Bold (Ctrl+B)', Bold, () => exec('bold'))}
          {tool('Italic (Ctrl+I)', Italic, () => exec('italic'))}
          {tool('Underline (Ctrl+U)', Underline, () => exec('underline'))}
          {tool('Bulleted list', List, () => exec('insertUnorderedList'))}
          {tool('Numbered list', ListOrdered, () => exec('insertOrderedList'))}
          {tool('Insert a table', Table2, () => exec('insertHTML', gridToHtml([['Column 1', 'Column 2', 'Column 3'], ['', '', ''], ['', '', '']]) + '<p></p>'))}
          <span className="ml-auto text-[11px] text-slate-500 tabular-nums">{words} words</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-6">
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={() => (setDirty(true), count())}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
              e.preventDefault();
              save();
            }
          }}
          className="desk-doc mx-auto w-[min(760px,calc(100%-2rem))] min-h-[900px] bg-white shadow-sm border border-slate-200 px-16 py-14 outline-none text-[14px] leading-relaxed text-slate-900 select-text"
          aria-label="Document"
          data-ref="docs-body"
        />
      </div>
      <style>{`.desk-doc h1{font-size:1.6em;font-weight:700;margin:.6em 0 .3em}.desk-doc h2{font-size:1.3em;font-weight:700;margin:.6em 0 .3em}.desk-doc h3{font-size:1.1em;font-weight:600;margin:.5em 0 .2em}.desk-doc p{margin:.35em 0}.desk-doc ul{list-style:disc;padding-left:1.6em}.desk-doc ol{list-style:decimal;padding-left:1.6em}.desk-doc blockquote{border-left:3px solid #cbd5e1;padding-left:.8em;color:#475569}.desk-doc table{border-collapse:collapse;margin:.5em 0;width:100%}.desk-doc td,.desk-doc th{border:1px solid #cbd5e1;padding:4px 8px;min-width:40px;text-align:left}.desk-doc th{background:#f1f5f9;font-weight:600}`}</style>
    </div>
  );
};
