import { JobPosting, JobProfile, User } from '../types';

// Everyone has at least one profile: without any of their own, it's their headline, about and every skill
export const profilesOf = (user: User): JobProfile[] =>
  user.jobProfiles && user.jobProfiles.length > 0
    ? user.jobProfiles
    : [{ id: 'main', name: 'Main', title: user.title, bio: user.bio, skillIds: user.verifiedSkills.map((s) => s.skillId) }];

export const activeProfileOf = (user: User): JobProfile => {
  const profiles = profilesOf(user);
  return profiles.find((p) => p.id === user.activeProfileId) ?? profiles[0];
};

// The user as one profile presents them: its headline and about, and only the skills it features
export const asProfile = (user: User, profile: JobProfile): User => ({
  ...user,
  title: profile.title,
  bio: profile.bio,
  verifiedSkills: user.verifiedSkills.filter((s) => profile.skillIds.includes(s.skillId)),
});

// The profile that covers most of what a job asks for, required skills counting double
export const bestProfileFor = (user: User, job: JobPosting): JobProfile => {
  const covered = (p: JobProfile) =>
    job.requirements.reduce((sum, r) => sum + (p.skillIds.includes(r.skillId) ? (r.importance === 'required' ? 2 : 1) : 0), 0);
  return profilesOf(user).reduce((best, p) => (covered(p) > covered(best) ? p : best));
};

// The profile an application was sent with, if it still exists
export const applicationProfileOf = (user: User, jobId: string): JobProfile | undefined => {
  const id = user.applicationProfiles?.[jobId];
  return id ? user.jobProfiles?.find((p) => p.id === id) : undefined;
};
