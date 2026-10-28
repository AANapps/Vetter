import { runnerImport } from 'vite';
// Run with `npm run test:rules`: checks firestore.rules against the Firebase emulators, acting out candidates,
// company owners, colleagues, outsiders and the Vetter team
const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const env = { VITE_FIREBASE_API_KEY: 'demo-key', VITE_FIREBASE_AUTH_DOMAIN: 'demo-vetter.firebaseapp.com', VITE_FIREBASE_PROJECT_ID: 'demo-vetter', VITE_FIREBASE_APP_ID: 'demo-app', VITE_FIREBASE_EMULATORS: 'true' };
const define = Object.fromEntries(Object.entries(env).map(([k, v]) => [`import.meta.env.${k}`, JSON.stringify(v)]));
const { A, F, P } = (await runnerImport(`${root}/tests/rulesEntry.ts`, { configFile: false, root, define, logLevel: 'silent' })).module;
const { doc, setDoc, getDoc, updateDoc } = (await runnerImport('firebase/firestore', { configFile: false, root, logLevel: 'silent' })).module;
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
await check('cannot read Cara\'s progress', () => P.loadProfile(cara), false);
await check('cannot write Cara\'s progress', () => setDoc(doc(db, 'profiles', cara), { ...caraProfile, testResults: [] }), false);
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
