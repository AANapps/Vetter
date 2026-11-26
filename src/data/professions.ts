import { ROLE_GROUPS } from '../lib/testRoles';

// Professions a candidate can pick as the kind of work a job profile is for: Granyt's own roles plus common jobs
// across industries, sorted, no duplicates
const COMMON = [
  'Account Manager', 'Accounts Assistant', 'Actor', 'Administrator', 'Architect', 'Art Director', 'Auditor',
  'Baker', 'Bank Teller', 'Bartender', 'Beautician', 'Bookkeeper', 'Brand Manager', 'Bricklayer', 'Business Development Manager',
  'Buyer', 'Call Centre Agent', 'Cashier', 'Chef', 'Civil Engineer', 'Cleaner', 'Cloud Engineer', 'Compliance Officer',
  'Construction Manager', 'Content Writer', 'Copywriter', 'Counsellor', 'Courier', 'Customer Success Manager',
  'Data Protection Officer', 'Database Administrator', 'Delivery Driver', 'Dentist', 'Designer', 'Dietitian',
  'Doctor', 'Early Years Practitioner', 'Electrical Engineer', 'Engineering Manager', 'Estate Agent', 'Event Planner',
  'Executive Assistant', 'Facilities Manager', 'Firefighter', 'Fitness Instructor', 'Florist', 'Forklift Driver',
  'Game Developer', 'Gardener', 'Graphic Designer', 'Hairdresser', 'Health and Safety Officer', 'Healthcare Assistant',
  'Hotel Receptionist', 'HR Advisor', 'HR Manager', 'Illustrator', 'Insurance Broker', 'Interior Designer',
  'IT Support Technician', 'Journalist', 'Kitchen Porter', 'Lab Technician', 'Lawyer', 'Legal Assistant', 'Lecturer',
  'Librarian', 'Logistics Coordinator', 'Machine Learning Engineer', 'Machine Operator', 'Marketing Manager',
  'Mechanical Engineer', 'Midwife', 'Mobile Developer', 'Network Engineer', 'Occupational Therapist', 'Office Manager',
  'Operations Manager', 'Optician', 'Painter and Decorator', 'Paralegal', 'Paramedic', 'Payroll Administrator',
  'Personal Assistant', 'Pharmacist', 'Pharmacy Assistant', 'Photographer', 'Physiotherapist', 'Police Officer',
  'Product Designer', 'Product Manager', 'Production Manager', 'Programme Manager', 'Psychologist', 'Receptionist',
  'Recruiter', 'Research Scientist', 'Restaurant Manager', 'Roofer', 'Sales Manager', 'Scrum Master', 'Security Engineer',
  'Security Guard', 'SEO Specialist', 'Social Media Manager', 'Social Worker', 'Software Architect', 'Solicitor',
  'Store Manager', 'Supply Chain Manager', 'Surveyor', 'Systems Administrator', 'Tax Advisor', 'Teacher',
  'Teaching Assistant', 'Technical Writer', 'Translator', 'UX Designer', 'Veterinary Nurse', 'Vet', 'Video Editor',
  'Waiter', 'Warehouse Operative', 'Web Developer', 'Welder', 'Youth Worker',
];

const own = ROLE_GROUPS.flatMap((g) => g.roles).filter((r) => r !== 'Any role') as string[];

export const PROFESSIONS: string[] = [...new Set([...own, ...COMMON])].sort((a, b) => a.localeCompare(b));
