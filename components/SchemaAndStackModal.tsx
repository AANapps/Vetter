import React, { useState } from 'react';
import { X, Database, Server, Layers, Cpu, ShieldCheck, CheckCircle2, Copy, Check } from 'lucide-react';

interface SchemaAndStackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaAndStackModal: React.FC<SchemaAndStackModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'stack' | 'matching'>('schema');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sqlSchemaText = `-- ==========================================
-- VETTED: Core Relational Database Schema (PostgreSQL)
-- Supports users, verified skill vectors, tests, submissions, jobs, and vector matching
-- ==========================================

-- 1. USERS & ROLES
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(32) NOT NULL CHECK (role IN ('candidate', 'recruiter', 'admin')),
    full_name VARCHAR(128) NOT NULL,
    headline VARCHAR(255),
    company_name VARCHAR(128),
    avatar_url TEXT,
    location VARCHAR(128),
    years_experience INT DEFAULT 0,
    work_preference VARCHAR(32) CHECK (work_preference IN ('Remote', 'Hybrid', 'On-site')),
    verified_skills_vector JSONB DEFAULT '[]'::jsonb, -- Array of {skill_id, score, percentile, verified_at}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ASSESSMENTS & TESTS (Standard & Custom)
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'Databases', 'Algorithms', 'System Architecture', etc.
    difficulty VARCHAR(32) NOT NULL, -- 'Intermediate', 'Advanced', 'Staff Specialist'
    type VARCHAR(32) NOT NULL CHECK (type IN ('standard', 'custom')),
    company_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for standard platform tests
    description TEXT NOT NULL,
    passing_score INT NOT NULL DEFAULT 75,
    estimated_minutes INT NOT NULL DEFAULT 20,
    questions JSONB NOT NULL, -- Array of questions, prompts, test_cases, weights
    skills_tested TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SUBMISSIONS & VERIFIED SCORING
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall_score INT NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    percentile NUMERIC(5,2) NOT NULL, -- e.g. 98.40
    duration_seconds INT NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('passed', 'review', 'failed')),
    code_solutions JSONB NOT NULL,
    test_case_results JSONB NOT NULL,
    integrity_metadata JSONB DEFAULT '{"tab_switches": 0, "focus_score": 100}'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. JOBS & RECRUITER CRITERIA
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(128) NOT NULL,
    title VARCHAR(128) NOT NULL,
    department VARCHAR(64),
    location VARCHAR(128) NOT NULL,
    work_type VARCHAR(32) NOT NULL,
    salary_range VARCHAR(64),
    tier VARCHAR(32) NOT NULL CHECK (tier IN ('tier_1_standard', 'tier_2_custom')),
    description TEXT NOT NULL,
    skill_requirements JSONB NOT NULL, -- Array of {skill_name, min_score, importance: 'required'|'preferred', weight: float}
    custom_assessment_id UUID REFERENCES assessments(id),
    status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'filled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MATCHES & APPLICANT PIPELINE
CREATE TABLE candidate_job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fit_percentage NUMERIC(5,2) NOT NULL,
    meets_hard_requirements BOOLEAN NOT NULL DEFAULT FALSE,
    skill_breakdown JSONB NOT NULL,
    application_status VARCHAR(32) DEFAULT 'none' CHECK (application_status IN ('none', 'applied', 'reviewing', 'interview', 'offer', 'rejected')),
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    applied_at TIMESTAMPTZ,
    UNIQUE(job_id, candidate_id)
);

-- 6. SUBSCRIPTIONS & MONETIZATION
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES users(id),
    stripe_customer_id VARCHAR(128) NOT NULL,
    plan_tier VARCHAR(32) NOT NULL CHECK (plan_tier IN ('tier_1_standard', 'tier_2_custom')),
    status VARCHAR(32) NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-2xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Database Schema & Recommended Stack</h2>
              <p className="text-xs text-slate-500">Architecture specification for production deployment of Vetted</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'schema'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database Schema (PostgreSQL)</span>
          </button>
          <button
            onClick={() => setActiveTab('stack')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'stack'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Recommended Tech Stack</span>
          </button>
          <button
            onClick={() => setActiveTab('matching')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'matching'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Matching Vector Engine</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Relational Data Model</h3>
                  <p className="text-xs text-slate-500">
                    6 core entities covering Candidates, Recruiters, Standard/Custom Tests, Code Submissions, and Matches.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(sqlSchemaText, 'sql')}
                  className="px-3 py-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  {copiedSection === 'sql' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy DDL SQL</span>
                    </>
                  )}
                </button>
              </div>

              {/* Entity Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg shadow-2xs">
                  <div className="text-xs font-bold text-indigo-700 mb-1">users</div>
                  <div className="text-xs text-slate-600">
                    Candidate & Recruiter profiles, verified skill vector snapshots, and preferences.
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg shadow-2xs">
                  <div className="text-xs font-bold text-violet-700 mb-1">assessments</div>
                  <div className="text-xs text-slate-600">
                    Interactive SQL, code & scenario questions, starter code, test suites, and passing marks.
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg shadow-2xs">
                  <div className="text-xs font-bold text-amber-700 mb-1">submissions</div>
                  <div className="text-xs text-slate-600">
                    Execution outputs, test case passes, percentile recalculations, and focus integrity metrics.
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg shadow-2xs">
                  <div className="text-xs font-bold text-indigo-700 mb-1">jobs</div>
                  <div className="text-xs text-slate-600">
                    Recruiter postings with skill score thresholds, required vs preferred weights, and tier status.
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg shadow-2xs">
                  <div className="text-xs font-bold text-rose-700 mb-1">candidate_job_matches</div>
                  <div className="text-xs text-slate-600">
                    Automated fit scores, threshold validations, detailed component breakdowns, and pipeline stage.
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg shadow-2xs">
                  <div className="text-xs font-bold text-emerald-700 mb-1">subscriptions</div>
                  <div className="text-xs text-slate-600">
                    Stripe billing records, tier entitlements (Standard Tier 1 vs Custom Builder Tier 2).
                  </div>
                </div>
              </div>

              {/* SQL Code Block */}
              <div className="relative">
                <pre className="p-4 bg-slate-950 text-indigo-200 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 leading-relaxed shadow-sm">
                  {sqlSchemaText}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'stack' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recommended Production Tech Stack</h3>
                <p className="text-xs text-slate-500">
                  Engineered for low-latency code execution, scalable candidate matching, and enterprise reliability.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                    <Layers className="w-4 h-4" />
                    <span>Frontend & Client Experience</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">React 19 + TypeScript + Vite:</strong> Instant HMR, single-page responsiveness, type-safe contract with backend.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">Tailwind CSS v4:</strong> Clean modern design with blue-purple primary accents and JetBrains Mono tabular figures.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">In-Browser Code Execution & Monaco Editor:</strong> Client-side preview and testing with web worker sandboxes.
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-violet-700 font-bold text-sm">
                    <Server className="w-4 h-4" />
                    <span>Backend & Code Execution Sandbox</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">Node.js / Express or Go Microservice:</strong> High-concurrency job matching worker and REST/gRPC API.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">Isolated Sandbox (AWS Firecracker / gVisor):</strong> Zero-trust microVM execution for untrusted candidate SQL and Python scripts.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">Redis Cluster:</strong> Real-time leaderboard percentiles via Sorted Sets (ZSET) and cached job match rankings.
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                    <Database className="w-4 h-4" />
                    <span>Database & Search Layer</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">PostgreSQL 16 (Cloud SQL / Supabase):</strong> ACID guarantees for verified scores and applicant tracking.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">Drizzle ORM:</strong> End-to-end type-safe queries, migrations, and seamless JSONB operators.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">pgvector Extension:</strong> Fast approximate nearest-neighbor search for candidate skill vectors.
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Auth, Payments & Security</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">Stripe Billing:</strong> Webhooks for Tier 1 pay-per-job and Tier 2 recurring custom assessment builder subscriptions.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">Anti-Cheat Proctor Engine:</strong> Browser focus tracking, clipboard paste anomaly detection, and timing benchmarks.
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">Cloudflare / GCP Cloud Run:</strong> Global CDN edge caching and serverless scale-to-zero compute.
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'matching' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Vector Skill Matching Algorithm Formula</h3>
                <p className="text-xs text-slate-500">
                  How candidate verified skill scores are objectively scored against recruiter thresholds.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs leading-relaxed text-slate-700 shadow-2xs">
                <p>
                  The engine evaluates candidate score vectors $S_c$ against job requirement vectors $R_j$:
                </p>
                <div className="p-3 bg-white border border-slate-200 rounded-lg font-mono text-indigo-700 font-semibold text-xs shadow-2xs">
                  FitPercentage = ( &Sigma; [ weight_i &times; EffectiveRatio(c_i, min_i, importance_i) ] / &Sigma; weight_i ) &times; 100
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 font-mono">1.</span>
                    <span>
                      <strong className="text-slate-900">Exceeding Benchmark (c &ge; min):</strong> Candidate receives 100% credit plus an over-performance bonus up to +10% based on margin.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 font-mono">2.</span>
                    <span>
                      <strong className="text-slate-900">Deficit Penalization (c &lt; min):</strong> If a skill is marked <code className="text-rose-700 font-mono font-semibold">required</code>, exponential penalty $(c / min)^{1.4}$ is applied and overall fit is hard-capped at 74% until verified.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 font-mono">3.</span>
                    <span>
                      <strong className="text-slate-900">Experience & Work Alignment:</strong> Fine-tuned with +2% bonus when candidate remote/hybrid preference exactly matches role profile.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Database Schema: PostgreSQL · Ready for Drizzle / Supabase migrations
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
