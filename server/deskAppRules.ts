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
