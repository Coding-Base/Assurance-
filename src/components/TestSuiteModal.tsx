/**
 * TestSuiteModal Component - Automated In-App Test Runner for Subsea Flow Assurance
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  XCircle,
  FlaskConical,
  RefreshCw,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { runFullTestSuite, TestResult } from '../tests/testSuite';

interface TestSuiteModalProps {
  onClose: () => void;
}

export const TestSuiteModal: React.FC<TestSuiteModalProps> = ({ onClose }) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    passed: number;
    failed: number;
    totalDurationMs: number;
  } | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const executeTests = async () => {
    setIsRunning(true);
    setExpandedIndex(null);
    try {
      const data = await runFullTestSuite();
      setSummary(data.summary);
      setTestResults(data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    executeTests();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Automated Flow Assurance Test Suite</span>
                {summary && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      summary.failed === 0
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {summary.failed === 0 ? 'ALL PASSED' : `${summary.failed} FAILED`}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Beggs & Brill (1973), Hammerschmidt hydrate model, DAG topological linter & quota tests
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={executeTests}
              disabled={isRunning}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isRunning ? 'Running...' : 'Re-run Tests'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Metric Ribbon */}
        {summary && (
          <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-4">
              <span className="text-slate-400">
                Total Tests: <strong className="text-white">{summary.total}</strong>
              </span>
              <span className="text-emerald-400">
                Passed: <strong>{summary.passed}</strong>
              </span>
              <span className={summary.failed > 0 ? 'text-rose-400' : 'text-slate-500'}>
                Failed: <strong>{summary.failed}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-1 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Total Elapsed: {summary.totalDurationMs} ms</span>
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar text-xs">
          {testResults.map((test, index) => {
            const isPassed = test.status === 'PASSED';
            const isExpanded = expandedIndex === index;

            return (
              <div
                key={index}
                className={`rounded-xl border p-3 transition ${
                  isPassed
                    ? 'bg-slate-950/70 border-slate-800 hover:border-emerald-500/40'
                    : 'bg-rose-950/20 border-rose-500/50'
                }`}
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                >
                  <div className="flex items-start space-x-2.5">
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-200">{test.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          [{test.suite}]
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{test.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500">
                      {test.durationMs} ms
                    </span>
                    <button className="text-slate-500 hover:text-slate-300">
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && test.details && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800 font-mono text-[11px] text-cyan-300/90 bg-slate-900/90 p-2.5 rounded-lg select-text overflow-x-auto">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Continuous Integration Verification Suite v2.1</span>
          <span className="font-mono text-[11px] text-slate-500">Path: /src/tests/testSuite.ts</span>
        </div>
      </div>
    </div>
  );
};
