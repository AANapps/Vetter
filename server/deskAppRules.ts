// The built-in work apps' data and the checks that mark them, shared by the job-simulation writer (writeJobSim.ts)
// and the skills-test writer (testChat.ts), so both write data the desktop apps (src/lib/deskApps.ts) can load

// Each app's data, as one JSON text with a key per app
export const WORK_APP_FORMATS = `  "chat": {"channels":[{"id":"ops","name":"ops","kind":"channel","topic":"","messages":[{"id":"c1","from":"<email>",
    "text":"...","time":"08:41","phase":""}]},{"id":"dm-ana","name":"Ana Lee","kind":"dm","with":"<email>","messages":[]}],
    "replies":[{"id":"r-ana","channel":"dm-ana","mustMention":[["refund","credit"]],"mustShare":"",
    "reply":{"from":"<email>","text":"..."},"otherwise":{"from":"<email>","text":"..."}}]}
    (a message may carry "attachments":[{"name":"x.csv","content":"..."}]; phase "" or a part, like emails)
  "helpdesk": {"name":"<product name>","agents":["<names>"],"sla":{"urgent":1,"high":4,"normal":24,"low":48},
    "macros":[{"name":"...","body":"Hi {{requester.first_name}}, ...","status":"pending","tags":["delay"]}],
    "tickets":[{"id":"4471","subject":"...","requester":"Name <email>","status":"new|open|pending|on-hold|solved",
    "priority":"low|normal|high|urgent","tags":[],"assignee":"","created":"Today 08:12","channel":"email|chat|phone|web",
    "fields":{"Order":"1005"},"thread":[{"from":"Name <email>","body":"...","time":"08:12","internal":false}],"phase":""}]}
  "crm": {"name":"...","objects":[{"id":"contacts","label":"Contacts","fields":[{"key":"name","label":"Name"},
    {"key":"email","label":"Email","type":"email"},{"key":"account","label":"Account","type":"link","object":"accounts"},
    {"key":"stage","label":"Stage","type":"select","options":["..."]},{"key":"amount","label":"Amount","type":"money"}],
    "records":[{"id":"con-1","name":"...","email":"..."}]}]} (field types: text number money date email phone select
    textarea link; every record has an id and a "name" or "title" field)
  "docs": {"templates":[{"name":"Board update.docx","html":"<h1>...</h1><p>...</p>"}]}
  "bi": {"name":"<report name>"} (its data is the day's CSV files and database tables)
  "forms": {"name":"...","forms":[{"id":"refund","title":"Refund request","description":"...","fields":[{"key":"order",
    "label":"Order number","type":"text|textarea|number|money|date|select|radio|checkbox|email","options":[],
    "required":true,"help":""}],"entries":[]}]}
  "calendar": {"weekOf":"<a Monday, YYYY-MM-DD>","today":"YYYY-MM-DD","events":[{"id":"e1","title":"...","date":"YYYY-MM-DD",
    "start":"09:30","end":"10:00","attendees":["<emails, the user's too>"],"location":"","notes":""},
    {"id":"e2","title":"Busy","date":"...","start":"11:00","end":"12:00","owner":"<a colleague's email: their own busy time>"}]}
  "kb": {"name":"...","articles":[{"id":"kb-refunds","title":"...","category":"...","body":"paragraphs, blank lines between,
    - bullet lines","updated":"1 Nov 2026"}]}
  "board": {"boards":[{"id":"launch","name":"...","style":"monday|jira","key":"WEB","statuses":["To Do","In Progress","Done"],
    "groups":["This week"],"people":["<names>"],"items":[{"id":"WEB-12","title":"...","status":"To Do","group":"",
    "owner":"","due":"YYYY-MM-DD","priority":"Low|Medium|High|Critical","type":"Story|Task|Bug","points":"3",
    "description":"","phase":""}]}]}`;

// The check kinds that read the built-in apps' state (src/lib/desktop.ts desktopValue)
export const WORK_APP_CHECKS = `  file:<file name>        the text of a file the candidate saved (a Docs document, an exported CSV); rubric, or expected
  filerows:<file name>    how many data rows a CSV the candidate saved has
  chat:<channel id>       the candidate's last message there, marked against rubric
  chatreceived:<rule id>  that colleague answered in chat (expected "true")
  ticket:<id>:<field>     status, priority, assignee, tags (comma-joined), or reply / note (the last public reply or
                          internal note, marked against rubric), e.g. ticket:4471:status expected "pending|solved"
  tickets:<status>        how many tickets have that status
  record:<object>:<id>:<field>   a CRM record's field; recordwhere:<object>:<field>=<value>:<field> for a record the
                          candidate creates; records:<object> the count; crmnote:<object>:<id> notes logged (rubric)
  event:<words>           they made a meeting with those words in its title (expected "true"); eventwith:<email> it
                          invites that person; eventat:<words> its "YYYY-MM-DD HH:MM"; response:<event id> yes|no|maybe
  form:<form id>:<field>  a field of their last entry; formcount:<form id> how many they submitted
  kbviewed:<article id>   they opened the article (expected "true")
  item:<board>:<item id>:<field>  status, owner, due, priority, points, title, or comments (rubric);
                          itemwhere:<board>:<field>=<value>:<field>; items:<board>:<status> a count
  chart:<words in its title>  "<kind> <x> by <agg> <y>" e.g. "bar region by sum revenue"; charts: how many
  A check that reads writing (chat:, file: of a document, ticket:…:reply or note, crmnote:, item:…:comments) may have a
  rubric instead of an expected value.`;

// The AI-at-work layer of a job simulation (src/lib/capabilities.ts): scripted AI agents in the Agents app, with
// planted mistakes. Only for a job simulation the company builds with the layer on
export const AI_LAYER_RULES = `THE AI-AT-WORK LAYER (ON for this day): the day also measures how the candidate works with AI, not AI trivia.
Put "agents" in apps (it doesn't count as a work environment) and its data in work under "agents". The agents are LIVE
AI: they do the work for real on the day's data and answer whatever the candidate writes. You write only each task and
the agent's BLIND SPOTS (pitfalls): mistakes it makes unless the candidate's brief or later instructions cover that point.
  "agents": {"name":"<company> AI agents","agents":[{"id":"ada","name":"Ada","role":"Insight agent: analysis, summaries
    and drafts"},{"id":"dex","name":"Dex","role":"Data agent: cleaning, merging and exporting data"}],
    "tasks":[{"id":"tidy","phase":"juggling","title":"...","context":"who asked and why, one or two sentences",
      "agent":"","brief":"","bestAgent":"dex",
      "goal":"what the work is, neutrally (not hinting at the blind spots)","facts":"what the agent knows: figures, names,
      dates, the right answers","data":["<file names on the computer it works from>"],"file":"x_clean.csv",
      "action":"what approving does",
      "pitfalls":[{"id":"dropped","mistake":"exactly what it gets wrong, with the wrong figure where there is one",
        "avoidWhen":"what the instructions must make clear, in any words","why":"what's wrong, for the company"}]}]}
  Agents are 2 (names and roles to suit the job). A task with "agent" and "brief" set was handed out by a colleague: the
  agent does it when the candidate opens it, falling into every blind spot. With them "" the candidate picks the agent and
  writes the brief. data names files in files or email attachments (the agent reads them); file is the CSV it hands back
  ("" for none; approving saves it to Files). Plain text everywhere; facts may use newlines.
Build in THREE agent tasks, each tied into the parts (and the emails mention them):
  1. DELEGATE (juggling, or core): a piece of the work for the candidate to hand to the right agent, with 2 pitfalls that
     do quiet damage (delete real records, drop a condition, miss the planted data issue) unless the brief covers them.
     Its file is what the candidate then uses (Spreadsheet Import CSV makes a new sheet named after the file, e.g. x_clean;
     check that sheet with IF(ISERROR(COUNTIF(x_clean!A:A,"*")),<formula on the original>,<same formula on x_clean>)).
  2. JUDGEMENT (juggling): handed out already: a recommendation that is technically plausible but commercially or
     ethically wrong (hides a miss from leadership, breaks a policy or promise to a customer, treats people unfairly,
     shares private data), as 2 to 3 pitfalls, with an "action". Someone leans on the candidate to approve it (the
     grey-area email).
  3. VERIFY (report): handed out already: the agent's draft of the report back, with EXACTLY FIVE pitfalls, each one line
     of the draft: a figure that ignores the curveball, a wrong date or count, a made-up source or statistic, a number that
     includes the planted data issue, and one more specific to the day. facts hold every right figure.
  Also one AI-generated figure someone quotes in an email (e.g. "the agent says revenue was £X, OK to use?") that's wrong
  because of the planted issue: the reply is marked on giving the right figure.
Agent checks (in checks, like the others; each run reports which blind spots it fell into):
  agent:<task id>:clean     its latest run fell into no blind spot: expected "true" (the delegate task: briefed well)
  agent:<task id>:approved  "clean" (approved only work without the mistakes) or "flawed": expected "clean"
  agent:<task id>:handled   rejected, sent back, or approved only clean work: expected "true" (the judgement task)
  agent:<task id>:note      the note with their decision (rubric)
  agentcaught:<task id>     the verify task's planted mistakes caught: expected "5" (marked with partial credit)
Each check has capability: "orchestrate" (briefing and directing agents), "verify" (checking AI output: the delegate
approval, the quoted figure's reply, agentcaught), "judgement" (the judgement task and the grey-area reply), "adapt" (the
curveball checks), "own" (the report back's email), "fluency" (using AI to get the core work done), or "" for the job's
own skills. Tag every check; at least five have a capability.
The setting's planted lines list the three agent tasks and their blind spots, so the desk and script match.`;

export const NO_AI_LAYER = `THE AI-AT-WORK LAYER is OFF for this day: no "agents" app or work data, and every check's capability is "" except
the curveball's checks ("adapt"), the grey-area reply ("judgement") and the report back's email ("own").`;
