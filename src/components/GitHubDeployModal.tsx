/**
 * GitHubDeployModal Component - Connect and push to GitHub repository with deployment steps
 */

import React, { useState } from 'react';
import {
  X,
  Github,
  Copy,
  Check,
  Terminal,
  Server,
  Database,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface GitHubDeployModalProps {
  onClose: () => void;
}

export const GitHubDeployModal: React.FC<GitHubDeployModalProps> = ({ onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState<string>('https://github.com/your-org/subseaflow-cad-engine.git');

  const gitPushScript = `# 1. Initialize local Git repository (if not initialized)
git init

# 2. Stage all files (Frontend, Physics Engine, Schema, Tests, README)
git add .

# 3. Create initial commit
git commit -m "feat: complete subsea flow assurance CAD platform v2 with Beggs & Brill solver"

# 4. Set default branch to main
git branch -M main

# 5. Add remote GitHub repository
git remote add origin ${repoUrl}

# 6. Push codebase to GitHub
git push -u origin main`;

  const dockerComposeScript = `# Build and start PostgreSQL, Redis, Django Solver, and Vite Frontend
docker-compose up --build -d

# Run PostgreSQL database migrations
docker-compose exec backend python manage.py migrate

# Seed multi-tenant workspaces and sample tiebacks
docker-compose exec backend python manage.py loaddata initial_tenants.json

# Execute automated physics test suite in container
docker-compose exec backend python manage.py test tests/`;

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Connect & Push to GitHub Repository</span>
                <span className="text-[10px] font-mono bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800">
                  Ready to Deploy
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Push all frontend CAD components, Beggs & Brill physics engine, database schema, and test suite.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar text-xs">
          {/* Step 1: Target Repository URL */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold block text-xs">
              1. Enter Your GitHub Repository Remote URL:
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
                placeholder="https://github.com/username/repo-name.git"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Create a new empty repository on GitHub without adding README/license, then paste the HTTPS or SSH clone URL above.
            </p>
          </div>

          {/* Step 2: Git Push Terminal Commands */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>2. Run Git Push Commands in Terminal:</span>
              </span>
              <button
                onClick={() => copyToClipboard(gitPushScript, 'git')}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition"
              >
                {copiedSection === 'git' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All Commands</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 select-text overflow-x-auto">
              <pre className="leading-relaxed whitespace-pre-wrap">{gitPushScript}</pre>
            </div>
          </div>

          {/* Step 3: Production Deployment Steps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>3. Deploy Full-Stack Services (Docker / Cloud Run):</span>
              </span>
              <button
                onClick={() => copyToClipboard(dockerComposeScript, 'docker')}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition"
              >
                {copiedSection === 'docker' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Docker Setup</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-indigo-300 select-text overflow-x-auto">
              <pre className="leading-relaxed whitespace-pre-wrap">{dockerComposeScript}</pre>
            </div>
          </div>

          {/* Repository Architecture Manifest */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
            <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
              Files Included in This Release:
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
              <div>• <code>src/physics/beggsAndBrill.ts</code> (Hydraulics)</div>
              <div>• <code>src/engine/dagLinter.ts</code> (DAG Linter)</div>
              <div>• <code>src/db/schema.sql</code> (PostgreSQL RLS)</div>
              <div>• <code>src/db/models.py</code> (Django ORM)</div>
              <div>• <code>src/tests/testSuite.ts</code> (Validation Suite)</div>
              <div>• <code>README.md</code> (Complete Architectural Specs)</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
