import { AssessmentTest } from '../../types';

// A module titled for the field it's made for: "Excel for Data Analysis". Another field gets its own version of the
// skill ("Excel for Finance"), written for that work; a module can also be added to another role's track as it is
export const forField = (test: AssessmentTest, skill: string, field: string): AssessmentTest => ({
  ...test,
  title: `${skill} for ${field}`,
  module: { skill, field },
});
