/**
 * The programming languages a coding task can be set in. A task with a language is a whole program: each test case's
 * input is fed to it on standard input, and what it prints is compared with the expected output, so any language works
 * the same way. JavaScript and Python run in the candidate's browser; every other language runs on Praxa's code
 * runner (server/runCode.ts). A task with no language is the older kind: a JavaScript function called solution, given
 * each test case's arguments.
 */

export type Runtime = 'browser' | 'python' | 'server';

export interface Language {
  id: string;
  label: string;
  // The editor's file name, so it reads like a real file
  file: string;
  // The name CodeMirror's language list knows it by, for highlighting
  editor: string;
  runtime: Runtime;
  // How the code runner names it ("Python (3.8.1)"): the names it starts with, best first
  runner: string[];
  // A program that reads all of standard input and prints the answer, for the candidate to start from
  starter: string;
}

const L = (id: string, label: string, file: string, editor: string, runtime: Runtime, runner: string[], starter: string): Language => ({ id, label, file, editor, runtime, runner, starter });

export const LANGUAGES: Language[] = [
  L('javascript', 'JavaScript', 'main.js', 'JavaScript', 'browser', ['JavaScript (Node'], `const input = require('fs').readFileSync(0, 'utf8').trim();\nconst lines = input.split('\\n');\n\n// Work out the answer and print it\nconsole.log(lines[0]);\n`),
  L('typescript', 'TypeScript', 'main.ts', 'TypeScript', 'server', ['TypeScript ('], `import * as fs from 'fs';\nconst input: string = fs.readFileSync(0, 'utf8').trim();\nconst lines = input.split('\\n');\n\n// Work out the answer and print it\nconsole.log(lines[0]);\n`),
  L('python', 'Python', 'main.py', 'Python', 'python', ['Python (3'], `import sys\n\nlines = sys.stdin.read().strip().split("\\n")\n\n# Work out the answer and print it\nprint(lines[0])\n`),
  L('java', 'Java', 'Main.java', 'Java', 'server', ['Java (OpenJDK', 'Java ('], `import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        String line = in.readLine();\n\n        // Work out the answer and print it\n        System.out.println(line);\n    }\n}\n`),
  L('csharp', 'C#', 'Program.cs', 'C#', 'server', ['C# ('], `using System;\n\nclass Program {\n    static void Main() {\n        string input = Console.In.ReadToEnd().Trim();\n        string[] lines = input.Split('\\n');\n\n        // Work out the answer and print it\n        Console.WriteLine(lines[0]);\n    }\n}\n`),
  L('cpp', 'C++', 'main.cpp', 'C++', 'server', ['C++ (GCC', 'C++ ('], `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    string line;\n    getline(cin, line);\n\n    // Work out the answer and print it\n    cout << line << endl;\n    return 0;\n}\n`),
  L('c', 'C', 'main.c', 'C', 'server', ['C (GCC', 'C ('], `#include <stdio.h>\n\nint main(void) {\n    char line[1024];\n    if (!fgets(line, sizeof line, stdin)) return 0;\n\n    /* Work out the answer and print it */\n    printf("%s", line);\n    return 0;\n}\n`),
  L('go', 'Go', 'main.go', 'Go', 'server', ['Go ('], `package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\tin := bufio.NewScanner(os.Stdin)\n\tin.Scan()\n\tline := in.Text()\n\n\t// Work out the answer and print it\n\tfmt.Println(line)\n}\n`),
  L('rust', 'Rust', 'main.rs', 'Rust', 'server', ['Rust ('], `use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let lines: Vec<&str> = input.trim().lines().collect();\n\n    // Work out the answer and print it\n    println!("{}", lines[0]);\n}\n`),
  L('php', 'PHP', 'main.php', 'PHP', 'server', ['PHP ('], `<?php\n$lines = explode("\\n", trim(stream_get_contents(STDIN)));\n\n// Work out the answer and print it\necho $lines[0] . "\\n";\n`),
  L('ruby', 'Ruby', 'main.rb', 'Ruby', 'server', ['Ruby ('], `lines = STDIN.read.strip.split("\\n")\n\n# Work out the answer and print it\nputs lines[0]\n`),
  L('kotlin', 'Kotlin', 'Main.kt', 'Kotlin', 'server', ['Kotlin ('], `fun main() {\n    val lines = generateSequence(::readLine).toList()\n\n    // Work out the answer and print it\n    println(lines[0])\n}\n`),
  L('swift', 'Swift', 'main.swift', 'Swift', 'server', ['Swift ('], `var lines: [String] = []\nwhile let line = readLine() { lines.append(line) }\n\n// Work out the answer and print it\nprint(lines[0])\n`),
  L('scala', 'Scala', 'Main.scala', 'Scala', 'server', ['Scala ('], `object Main extends App {\n  val lines = scala.io.Source.stdin.getLines().toList\n\n  // Work out the answer and print it\n  println(lines.head)\n}\n`),
  L('dart', 'Dart', 'main.dart', 'Dart', 'server', ['Dart ('], `import 'dart:io';\n\nvoid main() {\n  final line = stdin.readLineSync() ?? '';\n\n  // Work out the answer and print it\n  print(line);\n}\n`),
  L('r', 'R', 'main.r', 'R', 'server', ['R ('], `lines <- readLines(file("stdin"))\n\n# Work out the answer and print it\ncat(lines[1], "\\n")\n`),
  L('bash', 'Bash', 'main.sh', 'Shell', 'server', ['Bash ('], `read -r line\n\n# Work out the answer and print it\necho "$line"\n`),
  L('perl', 'Perl', 'main.pl', 'Perl', 'server', ['Perl ('], `my @lines = <STDIN>;\nchomp @lines;\n\n# Work out the answer and print it\nprint "$lines[0]\\n";\n`),
  L('lua', 'Lua', 'main.lua', 'Lua', 'server', ['Lua ('], `local line = io.read("l")\n\n-- Work out the answer and print it\nprint(line)\n`),
  L('haskell', 'Haskell', 'Main.hs', 'Haskell', 'server', ['Haskell ('], `main :: IO ()\nmain = do\n  input <- getContents\n  let ls = lines input\n  -- Work out the answer and print it\n  putStrLn (head ls)\n`),
  L('elixir', 'Elixir', 'main.exs', 'Elixir', 'server', ['Elixir ('], `lines = IO.read(:stdio, :eof) |> String.trim() |> String.split("\\n")\n\n# Work out the answer and print it\nIO.puts(hd(lines))\n`),
  L('fsharp', 'F#', 'main.fs', 'F#', 'server', ['F# ('], `let lines = stdin.ReadToEnd().Trim().Split('\\n')\n\n// Work out the answer and print it\nprintfn "%s" lines.[0]\n`),
  L('vbnet', 'Visual Basic .NET', 'Main.vb', 'VB.NET', 'server', ['Visual Basic'], `Module Main\n    Sub Main()\n        Dim line As String = Console.ReadLine()\n\n        ' Work out the answer and print it\n        Console.WriteLine(line)\n    End Sub\nEnd Module\n`),
  L('objectivec', 'Objective-C', 'main.m', 'Objective-C', 'server', ['Objective-C ('], `#import <Foundation/Foundation.h>\n\nint main() {\n    char line[1024];\n    if (!fgets(line, sizeof line, stdin)) return 0;\n\n    // Work out the answer and print it\n    printf("%s", line);\n    return 0;\n}\n`),
  L('clojure', 'Clojure', 'main.clj', 'Clojure', 'server', ['Clojure ('], `(def lines (line-seq (java.io.BufferedReader. *in*)))\n\n; Work out the answer and print it\n(println (first lines))\n`),
  L('groovy', 'Groovy', 'main.groovy', 'Groovy', 'server', ['Groovy ('], `def lines = System.in.readLines()\n\n// Work out the answer and print it\nprintln lines[0]\n`),
  L('ocaml', 'OCaml', 'main.ml', 'OCaml', 'server', ['OCaml ('], `let () =\n  let line = input_line stdin in\n  (* Work out the answer and print it *)\n  print_endline line\n`),
  L('erlang', 'Erlang', 'main.erl', 'Erlang', 'server', ['Erlang ('], `-module(main).\n-export([main/1]).\n\nmain(_) ->\n    Line = string:trim(io:get_line("")),\n    % Work out the answer and print it\n    io:format("~s~n", [Line]).\n`),
  L('fortran', 'Fortran', 'main.f90', 'Fortran', 'server', ['Fortran ('], `program main\n  character(len=1024) :: line\n  read(*, '(A)') line\n  ! Work out the answer and print it\n  print '(A)', trim(line)\nend program main\n`),
  L('pascal', 'Pascal', 'main.pas', 'Pascal', 'server', ['Pascal ('], `program Main;\nvar line: string;\nbegin\n  readln(line);\n  { Work out the answer and print it }\n  writeln(line);\nend.\n`),
  L('cobol', 'COBOL', 'main.cob', 'Cobol', 'server', ['COBOL ('], `       IDENTIFICATION DIVISION.\n       PROGRAM-ID. MAIN.\n       DATA DIVISION.\n       WORKING-STORAGE SECTION.\n       01 WS-LINE PIC X(1024).\n       PROCEDURE DIVISION.\n           ACCEPT WS-LINE.\n           DISPLAY FUNCTION TRIM(WS-LINE).\n           STOP RUN.\n`),
  L('d', 'D', 'main.d', 'D', 'server', ['D ('], `import std.stdio;\nimport std.string;\n\nvoid main() {\n    auto line = readln().strip();\n    // Work out the answer and print it\n    writeln(line);\n}\n`),
  L('prolog', 'Prolog', 'main.pl', 'Prolog', 'server', ['Prolog ('], `:- initialization(main).\n\nmain :-\n    read_term(user_input, Term, []),\n    % Work out the answer and print it\n    write(Term), nl,\n    halt.\n`),
  L('octave', 'Octave', 'main.m', 'Octave', 'server', ['Octave ('], `line = fgetl(stdin);\n% Work out the answer and print it\ndisp(line);\n`),
  L('assembly', 'Assembly (NASM)', 'main.asm', 'Gas', 'server', ['Assembly (NASM'], `section .text\nglobal _start\n\n_start:\n    ; Work out the answer and print it\n    mov eax, 60\n    xor edi, edi\n    syscall\n`),
];

export const ANY_LANGUAGE = 'any';

export const languageById = (id?: string): Language | undefined => LANGUAGES.find((l) => l.id === id);

// The language a candidate answers in: the task's own, or their pick on a task open to any language (JavaScript until
// they pick)
export const answerLanguage = (taskLanguage: string | undefined, picked?: string): Language =>
  languageById(taskLanguage === ANY_LANGUAGE ? picked : taskLanguage) ?? LANGUAGES[0];

/**
 * A task open to any language keeps the language picked with the answer: a first line "«python»" before the code, so
 * the answer stays one string like every other answer
 */
const MARK = /^«([a-z]+)»\n/;
export const packAnswer = (language: string, code: string) => `«${language}»\n${code}`;
export function unpackAnswer(answer: string): { language?: string; code: string } {
  const m = answer.match(MARK);
  return m ? { language: m[1], code: answer.slice(m[0].length) } : { code: answer };
}

// A coding answer as people read it: blank when the candidate left the starting code as it was, and on a task open to
// any language, the language they picked first ("(Python)")
export function codeAnswer(q: { language?: string; starterCode: string }, raw: string): string {
  if (q.language !== ANY_LANGUAGE) return raw.trim() === q.starterCode.trim() ? '' : raw;
  const { language, code } = unpackAnswer(raw);
  const lang = answerLanguage(q.language, language ?? 'python');
  return !code.trim() || code.trim() === lang.starter.trim() ? '' : `(${lang.label})\n${code}`;
}

// What the candidate's output is compared on: line endings, trailing spaces and trailing blank lines don't count
export const normaliseOutput = (s: string) =>
  s
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '')
    .replace(/^\n+/, '');

// JSON with object keys sorted, so { a, b } and { b, a } compare equal
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v));

// Whether a program printed the expected output: exactly (as normalised above), as the same JSON, or as the same number
export function sameOutput(actual: string, expected: string): boolean {
  const a = normaliseOutput(actual);
  const e = normaliseOutput(expected);
  if (a === e) return true;
  try {
    if (canonical(JSON.parse(a)) === canonical(JSON.parse(e))) return true;
  } catch {
    /* not JSON */
  }
  const an = Number(a);
  const en = Number(e);
  return a !== '' && e !== '' && Number.isFinite(an) && Number.isFinite(en) && Math.abs(an - en) <= 1e-6 * Math.max(1, Math.abs(en));
}
