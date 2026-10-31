import { runnerImport } from 'vite';
// Run with `npm run test:rules`: checks firestore.rules against the Firebase emulators, acting out candidates,
// company owners, colleagues, outsiders and the Vetter team
const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const env = { VITE_FIREBASE_API_KEY: 'demo-key', VITE_FIREBASE_AUTH_DOMAIN: 'demo-vetter.firebaseapp.com', VITE_FIREBASE_PROJECT_ID: 'demo-vetter', VITE_FIREBASE_APP_ID: 'demo-app', VITE_FIREBASE_EMULATORS: 'true' };
const define = Object.fromEntries(Object.entries(env).map(([k, v]) => [`import.meta.env.${k}`, JSON.stringify(v)]));
const { A, F, P, C } = (await runnerImport(`${root}/tests/rulesEntry.ts`, { configFile: false, root, define, logLevel: 'silent' })).module;
const { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, collectionGroup, query, where, increment } = (await runnerImport('firebase/firestore', { configFile: false, root, logLevel: 'silent' })).module;
const PROJECT = 'demo-vetter';
let pass = 0, fail = 0;
const check = async (name, fn, shouldWork) => {
  try { await fn(); if (shouldWork) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL (allowed but should be refused):', name); } }
  catch (e) { if (!shouldWork) { pass++; console.log('  ok   refused:', name); } else { fail++; console.log('  FAIL', name, '->', e.code || e.message); } }
};
const verify = async (email) => {
  const { oobCodes } = await (await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/oobCodes`)).json();
  const code = oobCodes.filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL').at(-1);
  await fetch(code.oobLink);
  return A.refreshVerification(F.auth().currentUser);
};
const account = async (uid) => ({ uid, ...(await getDoc(doc(F.db(), 'users', uid))).data() });
const db = F.db();

console.log('Candidate');
await check('signs up with any email', () => A.signUp({ role: 'candidate', name: 'Cara', email: 'cara@gmail.com', password: 'password123' }), true);
const cara = F.auth().currentUser.uid;
await check('cannot make themselves an admin', () => updateDoc(doc(db, 'users', cara), { role: 'admin' }), false);
await check('can change their name', () => updateDoc(doc(db, 'users', cara), { name: 'Cara B' }), true);
const caraProfile = { id: cara, name: 'Cara B', email: 'cara@gmail.com', role: 'candidate', avatarUrl: '', title: '', location: '', yearsExperience: 0, workPreference: 'Remote', bio: '', verifiedSkills: [], testResults: [{ testId: 't1', score: 88, completedAt: '2026-10-28' }], appliedJobIds: [] };
await check('cannot save progress before verifying', () => P.saveProfile(caraProfile), false);
await verify('cara@gmail.com');
await check('saves her progress once verified', () => P.saveProfile(caraProfile), true);
await check('loads it back on any device', async () => { if ((await P.loadProfile(cara))?.testResults[0]?.score !== 88) throw new Error('not saved'); }, true);
await check('cannot pass herself off as a company', () => P.saveProfile({ ...caraProfile, role: 'recruiter' }), false);
await check('cannot put her email on her public profile', () => setDoc(doc(db, 'profiles', cara), { ...caraProfile }), false);
await A.signOut();

console.log('Company owner (alice@acme.io)');
await A.signUp({ role: 'recruiter', name: 'Alice', email: 'alice@acme.io', password: 'password123', company: { name: 'Acme', website: 'acme.io', noWorkEmail: false } });
const alice = F.auth().currentUser.uid;
await check('cannot claim the company before verifying', async () => A.finishCompanySetup({ ...(await account(alice)) }), false);
await verify('alice@acme.io');
await check('creates Acme once verified', async () => A.finishCompanySetup(await account(alice)), true);
console.log('    status:', (await account(alice)).status, '| company:', (await getDoc(doc(db, 'companies', 'acme.io'))).data()?.status);
await A.signOut();

console.log('Colleague (bob@acme.io)');
await A.signUp({ role: 'recruiter', name: 'Bob', email: 'bob@acme.io', password: 'password123', company: { name: 'Acme Ltd', website: 'acme.io', noWorkEmail: false } });
const bob = F.auth().currentUser.uid;
await verify('bob@acme.io');
await check('asks to join Acme', async () => A.finishCompanySetup(await account(bob)), true);
console.log('    status:', (await account(bob)).status);
await check('cannot approve himself', () => updateDoc(doc(db, 'users', bob), { status: 'active' }), false);
await check('cannot take over the company', () => updateDoc(doc(db, 'companies', 'acme.io'), { ownerUid: bob }), false);
await A.signOut();
await A.signIn('alice@acme.io', 'password123');
await check('owner approves Bob', () => A.decideMember('acme.io', bob, true), true);
console.log('    Bob now:', (await account(bob)).status);
await A.signOut();

console.log('Outsider (eve@evil.com)');
await A.signUp({ role: 'recruiter', name: 'Eve', email: 'eve@evil.com', password: 'password123', company: { name: 'Evil', website: 'evil.com', noWorkEmail: false } });
const eve = F.auth().currentUser.uid;
await verify('eve@evil.com');
await check('cannot claim someone else\'s domain', () => setDoc(doc(db, 'companies', 'rival.io'), { name: 'Rival', website: 'rival.io', domain: 'rival.io', ownerUid: eve, ownerName: 'Eve', ownerEmail: 'eve@evil.com', status: 'active' }), false);
await check('cannot read Acme\'s members', () => getDoc(doc(db, 'companies', 'acme.io', 'members', bob)), false);
await check('cannot read Alice\'s account', () => getDoc(doc(db, 'users', alice)), false);
await check('can see Cara\'s public profile and results', () => P.loadProfile(cara), true);
await check('cannot write Cara\'s progress', () => setDoc(doc(db, 'profiles', cara), { ...caraProfile, testResults: [] }), false);
await A.signOut();

console.log('Jobs, tests and applications');
const job = { id: 'job-1', title: 'Analyst', companyName: 'Acme', companyLogo: '', businessId: 'acme.io', location: 'Leeds', workType: 'Remote', salaryRange: '', description: '', department: '', postedDate: '2026-10-28', requirements: [], testIds: [], testPassingScore: 70, testsRequired: false, invitations: [], applicantCount: 0, status: 'active' };
const noop = (e) => { throw e; };
await A.signIn('alice@acme.io', 'password123');
await check('Alice posts a job for Acme', () => C.syncJobs([], [job], noop), true);
await check('Alice writes a test for Acme', () => C.syncTests([], [{ id: 'test-custom-1', title: 'Acme SQL', type: 'custom', businessId: 'acme.io', questions: [] }], noop), true);
await check('Alice cannot post a job for another company', () => C.syncJobs([], [{ ...job, id: 'job-x', businessId: 'rival.io' }], noop), false);
await check('Alice cannot make a Vetter library test', () => setDoc(doc(db, 'tests', 'test-vetter-1'), { id: 'test-vetter-1', type: 'standard', title: 'x' }), false);
await check('Alice sends the job to Cara and tells her', async () => {
  await C.syncJobs([job], [{ ...job, invitations: [{ candidateId: cara, invitedAt: '2026-10-28', via: 'invite' }] }], noop);
  await C.syncNotifications([], [{ id: 'note-1', userId: cara, kind: 'job-invite', jobId: 'job-1', createdAt: new Date().toISOString(), read: false }], noop);
}, true);
await check('Alice emails it to dan@example.com', () => C.syncJobs([job], [{ ...job, invitedEmails: ['dan@example.com'] }], noop), true);
await A.signOut();

console.log('    visitors:');
await check('anyone can see jobs, tests and profiles', async () => { await getDocs(collection(db, 'jobs')); await getDocs(collection(db, 'tests')); await getDocs(collection(db, 'profiles')); }, true);
await check('anyone can see approved companies', () => getDocs(query(collection(db, 'companies'), where('status', '==', 'active'))), true);
await check('visitors cannot see who a job was sent to', () => getDocs(query(collectionGroup(db, 'invitations'), where('businessId', '==', 'acme.io'))), false);

await A.signIn('cara@gmail.com', 'password123');
console.log('    Cara:');
await check('sees her invitation and notification', async () => {
  const inv = await getDocs(query(collectionGroup(db, 'invitations'), where('candidateId', '==', cara)));
  const notes = await getDocs(query(collection(db, 'notifications'), where('userId', '==', cara)));
  if (inv.size !== 1 || notes.size !== 1) throw new Error(`${inv.size} invitations, ${notes.size} notifications`);
}, true);
await check('marks it read', () => updateDoc(doc(db, 'notifications', 'note-1'), { read: true }), true);
await check('records starting the tests', () => updateDoc(doc(db, 'jobs', 'job-1', 'invitations', cara), { startedAt: new Date().toISOString() }), true);
await check('cannot change how she was invited', () => updateDoc(doc(db, 'jobs', 'job-1', 'invitations', cara), { via: 'link' }), false);
await check('applies', () => C.apply(job, cara, undefined), true);
console.log('    applicants:', (await getDoc(doc(db, 'jobs', 'job-1'))).data().applicantCount);
await check('cannot add applicants without applying', () => updateDoc(doc(db, 'jobs', 'job-1'), { applicantCount: increment(1) }), false);
await check('cannot edit the job', () => updateDoc(doc(db, 'jobs', 'job-1'), { title: 'Hacked' }), false);
await check('cannot apply as someone else', () => setDoc(doc(db, 'applications', `job-1__${eve}`), { jobId: 'job-1', candidateId: eve, businessId: 'acme.io', appliedAt: '' }), false);
await check('cannot see Dan\'s emailed invite', () => getDocs(query(collectionGroup(db, 'emailInvites'), where('email', '==', 'dan@example.com'))), false);
await check('cannot write a test', () => setDoc(doc(db, 'tests', 'test-custom-2'), { id: 'test-custom-2', type: 'custom', businessId: 'acme.io' }), false);
await check('posts on the feed', () => C.syncSocial({ posts: [], comments: {}, kudosGiven: [], following: [] }, { posts: [{ id: 'post-1', authorId: cara, text: 'Hi', createdAt: new Date().toISOString() }], comments: { 'post-1': [{ id: 'cmt-1', authorId: cara, text: 'me', createdAt: new Date().toISOString() }] }, kudosGiven: ['post-1'], following: ['acme.io'] }, cara, noop), true);
await A.signOut();

await A.signIn('alice@acme.io', 'password123');
console.log('    Alice:');
await check('sees who she sent the job to', () => getDocs(query(collectionGroup(db, 'invitations'), where('businessId', '==', 'acme.io'))), true);
await check('sees Cara\'s application', () => getDocs(query(collection(db, 'applications'), where('businessId', '==', 'acme.io'))), true);
const caraLead = { id: `job-1__${cara}`, jobId: 'job-1', candidateId: cara, businessId: 'acme.io', stage: 'interview', note: 'Strong', updatedAt: '2026-10-31', history: [{ stage: 'interview', at: '2026-10-31' }] };
await check('moves Cara to interview', () => setDoc(doc(db, 'leads', caraLead.id), caraLead), true);
await check('sees her leads', () => getDocs(query(collection(db, 'leads'), where('businessId', '==', 'acme.io'))), true);
await check('cannot file a lead under another company', () => setDoc(doc(db, 'leads', caraLead.id), { ...caraLead, businessId: 'evil.com' }), false);
await check('cannot use a stage that does not exist', () => setDoc(doc(db, 'leads', caraLead.id), { ...caraLead, stage: 'secret' }), false);
await check('cannot give kudos as Cara', () => setDoc(doc(db, 'kudos', `x__${cara}`), { itemId: 'x', uid: cara }), false);
await check('cannot delete Cara\'s post', () => deleteDoc(doc(db, 'posts', 'post-1')), false);
await check('cannot read Cara\'s notifications', () => getDocs(query(collection(db, 'notifications'), where('userId', '==', cara))), false);
await check('cannot see who Cara follows', () => getDoc(doc(db, 'follows', cara)), false);
await A.signOut();

await A.signIn('eve@evil.com', 'password123');
console.log('    Eve (not at Acme):');
await check('cannot see who Acme sent its job to', () => getDocs(query(collectionGroup(db, 'invitations'), where('businessId', '==', 'acme.io'))), false);
await check('cannot see Acme\'s applications', () => getDocs(query(collection(db, 'applications'), where('businessId', '==', 'acme.io'))), false);
await check('cannot see Acme\'s leads', () => getDocs(query(collection(db, 'leads'), where('businessId', '==', 'acme.io'))), false);
await check('cannot move Acme\'s leads', () => setDoc(doc(db, 'leads', caraLead.id), { ...caraLead, stage: 'archived' }), false);
await check('cannot edit Acme\'s job', () => updateDoc(doc(db, 'jobs', 'job-1'), { title: 'Hacked' }), false);
await check('cannot edit Acme\'s test', () => updateDoc(doc(db, 'tests', 'test-custom-1'), { title: 'Hacked' }), false);
await A.signOut();

await A.signIn('cara@gmail.com', 'password123');
console.log('    Cara:');
await check('cannot see her own stage or notes', () => getDoc(doc(db, 'leads', caraLead.id)), false);
await A.signOut();

console.log('    Dan, emailed before he had an account:');
await A.signUp({ role: 'candidate', name: 'Dan', email: 'dan@example.com', password: 'password123' });
const dan = F.auth().currentUser.uid;
await verify('dan@example.com');
await check('sees the job emailed to him', async () => { const s = await getDocs(query(collectionGroup(db, 'emailInvites'), where('email', '==', 'dan@example.com'))); if (s.size !== 1) throw new Error(`${s.size}`); }, true);
await check('puts himself on it', () => setDoc(doc(db, 'jobs', 'job-1', 'invitations', dan), { candidateId: dan, invitedAt: '2026-10-28', via: 'email', jobId: 'job-1', businessId: 'acme.io' }), true);
await check('cannot claim he was picked by the company', () => setDoc(doc(db, 'jobs', 'job-1', 'invitations', `${dan}`), { candidateId: dan, invitedAt: '2026-10-28', via: 'invite', jobId: 'job-1', businessId: 'acme.io' }), false);
await A.signOut();

console.log('No work email (mo@gmail.com)');
await A.signUp({ role: 'recruiter', name: 'Mo', email: 'mo@gmail.com', password: 'password123', company: { name: "Mo's Bakery", website: '', noWorkEmail: true } });
const mo = F.auth().currentUser.uid;
await verify('mo@gmail.com');
await check('cannot claim gmail.com as a company', () => setDoc(doc(db, 'companies', 'gmail.com'), { name: 'G', website: '', domain: 'gmail.com', ownerUid: mo, ownerName: 'Mo', ownerEmail: 'mo@gmail.com', status: 'active' }), false);
await check('goes to review', async () => A.finishCompanySetup(await account(mo)), true);
console.log('    status:', (await account(mo)).status);
await check('cannot approve their own review', () => updateDoc(doc(db, 'companies', `review-${mo}`), { status: 'active' }), false);
await A.signOut();

console.log('Vetter team');
// Admins are made by hand in the Firebase console; here, through the emulator's rule-free access
await fetch(`http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents/users/${cara}?updateMask.fieldPaths=role`, {
  method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { role: { stringValue: 'admin' } } }),
});
await A.signIn('cara@gmail.com', 'password123');
const queue = await A.companiesInReview();
console.log('    review queue:', queue.map((c) => c.name).join(', '));
await check('admin approves Mo', () => A.decideCompany(queue[0], true), true);
console.log('    Mo now:', (await account(mo)).status);
await A.signOut();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
