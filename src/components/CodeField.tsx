import React, { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { Compartment, EditorState } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';

interface CodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  // The language to highlight, by the name CodeMirror's language list knows ("Python", "C++", "SQL")
  language: string;
  // Dark like the test's editor, or light like a form field
  dark?: boolean;
  className?: string;
  ariaLabel?: string;
  minHeight?: string;
}

/**
 * A code editor for any language: line numbers, highlighting, brackets closed and matched, indenting with Tab, undo,
 * search. The language's highlighting is loaded when it's first needed, so a test only downloads the ones it uses.
 */
export const CodeField: React.FC<CodeFieldProps> = ({ value, onChange, language, dark = true, className = '', ariaLabel, minHeight }) => {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const lang = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          lang.current.of([]),
          ...(dark ? [oneDark] : []),
          EditorView.theme({
            '&': { height: '100%', fontSize: '12.5px', ...(minHeight && { minHeight }) },
            '.cm-scroller': { fontFamily: "ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace", lineHeight: '1.6' },
            '&.cm-focused': { outline: 'none' },
          }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
          }),
          EditorView.contentAttributes.of({ 'aria-label': ariaLabel ?? 'Code editor', spellcheck: 'false' }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // The editor is made once; value and language changes are applied below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);

  // A value changed from outside (reset, another question) replaces the text
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  useEffect(() => {
    let live = true;
    const found = LanguageDescription.matchLanguageName(languages, language, true);
    if (!found) {
      view.current?.dispatch({ effects: lang.current.reconfigure([]) });
      return;
    }
    found.load().then((support) => {
      if (live) view.current?.dispatch({ effects: lang.current.reconfigure(support) });
    });
    return () => {
      live = false;
    };
  }, [language, dark]);

  return <div ref={host} className={`overflow-hidden [&_.cm-editor]:h-full ${className}`} />;
};
