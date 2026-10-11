/**
 * CLI Test Runner for SubseaFlow CAD Platform
 * Runs automated physics, linter, and tenant tests in terminal environment
 */

import { runFullTestSuite } from './testSuite';

async function main() {
  console.log('================================================================');
  console.log('SubseaFlow CAD Platform - Automated Physics & Topology Test Suite');
  console.log('================================================================\n');

  try {
    const { summary, results } = await runFullTestSuite();

    results.forEach((r, idx) => {
      const statusIcon = r.status === 'PASSED' ? '✅ [PASS]' : '❌ [FAIL]';
      console.log(`${idx + 1}. ${statusIcon} ${r.suite} -> ${r.name} (${r.durationMs}ms)`);
      console.log(`   Message: ${r.message}\n`);
    });

    console.log('----------------------------------------------------------------');
    console.log(`Total Tests : ${summary.total}`);
    console.log(`Passed      : ${summary.passed}`);
    console.log(`Failed      : ${summary.failed}`);
    console.log(`Elapsed     : ${summary.totalDurationMs} ms`);
    console.log('----------------------------------------------------------------\n');

    if (summary.failed > 0) {
      process.exit(1);
    } else {
      console.log('🎉 All subsea flow assurance numerical tests PASSED successfully.');
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

main();
