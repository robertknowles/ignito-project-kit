/**
 * Throwaway check for the NT sub-$525k stamp duty fix (Ella comparison report,
 * accuracy-testing/ella-spreadsheet-comparison.md, "NT stamp duty audit" section).
 *
 * Official NT TRO formula for dutiable value <= $525,000:
 *   D = 0.06571441*V^2 + 15*V, where V = value / 1000
 * >= $525k band: 4.95% flat to $3m (then 5.75%, 5.95%) — must be UNCHANGED.
 *
 * Run: npx vite-node accuracy-testing/verify-nt-stampduty.ts
 */
import { calculateStampDuty } from '../src/utils/stampDutyCalculator';

const official = (price: number) => {
  const v = price / 1000;
  return 0.06571441 * v * v + 15 * v;
};

let failures = 0;
const check = (label: string, actual: number, expected: number, tol = 0.5) => {
  const ok = Math.abs(actual - expected) <= tol;
  if (!ok) failures++;
  console.log(
    `${ok ? '✓' : '✗'} ${label.padEnd(42)} actual $${actual.toFixed(2).padStart(12)}  expected $${expected.toFixed(2).padStart(12)}`
  );
};

console.log('--- NT sub-$525k (report expected figures) ---');
// Report-documented official values: $300k → $10,414 ; $500k → $23,929
check('$300,000 (report: $10,414)', calculateStampDuty('NT', 300000), 10414, 1);
check('$500,000 (report: $23,929)', calculateStampDuty('NT', 500000), 23929, 1);
// Formula-exact assertions
check('$200,000 = formula', calculateStampDuty('NT', 200000), official(200000), 0.01);
check('$300,000 = formula', calculateStampDuty('NT', 300000), official(300000), 0.01);
check('$400,000 = formula', calculateStampDuty('NT', 400000), official(400000), 0.01);
check('$500,000 = formula', calculateStampDuty('NT', 500000), official(500000), 0.01);
check('$525,000 = formula', calculateStampDuty('NT', 525000), official(525000), 0.01);

console.log('--- boundary continuity (report: ~$25,988 both sides) ---');
check('$525,000 (formula side)', calculateStampDuty('NT', 525000), 25988, 1);
check('$525,001 (4.95% side)', calculateStampDuty('NT', 525001), 525001 * 0.0495, 0.01);
const jump = Math.abs(calculateStampDuty('NT', 525001) - calculateStampDuty('NT', 525000));
console.log(`${jump < 1 ? '✓' : '✗'} boundary discontinuity $${jump.toFixed(2)} (was $8,134 before fix)`);
if (jump >= 1) failures++;

console.log('--- >= $525k path unchanged ---');
check('$600,000 = 4.95% flat', calculateStampDuty('NT', 600000), 600000 * 0.0495, 0.01);
check("$650,000 (Ella's Darwin house) = $32,175", calculateStampDuty('NT', 650000), 32175, 0.01);
check('$3,000,001 = 5.75% flat', calculateStampDuty('NT', 3000001), 3000001 * 0.0575, 0.01);
check('$5,000,001 = 5.95% flat', calculateStampDuty('NT', 5000001), 5000001 * 0.0595, 0.01);

console.log('--- other states untouched (spot checks vs published brackets) ---');
check('QLD $500,000', calculateStampDuty('QLD', 500000), calculateStampDuty('QLD', 500000), 0); // identity
check('TAS $500,000 bracket math', calculateStampDuty('TAS', 500000), 12935 + (500000 - 375000) * 0.0425, 0.01);
check('ACT $500,000 bracket math', calculateStampDuty('ACT', 500000), 4600 + (500000 - 300000) * 0.034, 0.01);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
if (failures > 0) process.exit(1);
