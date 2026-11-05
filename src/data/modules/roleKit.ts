import { AssessmentTest, SkillCategory, TestDifficulty, TestRole } from '../../types';

// The main version of a module test added for a role: its levels, questions and timings come from its skeleton
export const roleMain = (
  id: string,
  title: string,
  category: SkillCategory,
  description: string,
  skillsTested: string[],
  roles: TestRole[],
  difficulty: TestDifficulty = 'Junior'
): AssessmentTest => ({
  id,
  title,
  description,
  skillsTested,
  roles,
  type: 'standard',
  category,
  difficulty,
  passingScore: 70,
  questions: [],
  estimatedMinutes: 0,
  totalQuestions: 0,
});
