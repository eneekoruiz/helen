// Statistical utilities for eval runs and confidence intervals.

const T_TABLE_95 = {
  1: 12.706,
  2: 4.303,
  3: 3.182,
  4: 2.776,
  5: 2.571,
  6: 2.447,
  7: 2.365,
  8: 2.306,
  9: 2.262,
  10: 2.228,
  11: 2.201,
  12: 2.179,
  13: 2.160,
  14: 2.145,
  15: 2.131,
  16: 2.120,
  17: 2.110,
  18: 2.101,
  19: 2.093,
  20: 2.086,
  25: 2.060,
  30: 2.042,
};

export function studentTCriticalValue(df) {
  if (df <= 0) return 0;
  if (T_TABLE_95[df]) return T_TABLE_95[df];
  if (df < 20) {
    const keys = Object.keys(T_TABLE_95).map(Number).sort((a, b) => a - b);
    const closest = keys.reduce((prev, curr) => (Math.abs(curr - df) < Math.abs(prev - df) ? curr : prev));
    return T_TABLE_95[closest];
  }
  if (df <= 30) return 2.042;
  return 1.960;
}

export function mean(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function sampleVariance(values) {
  if (!values || values.length <= 1) return 0;
  const avg = mean(values);
  const sumSquares = values.reduce((sum, v) => sum + (v - avg) ** 2, 0);
  return sumSquares / (values.length - 1);
}

export function sampleStdDev(values) {
  return Math.sqrt(sampleVariance(values));
}

export function confidenceInterval95(values) {
  const avg = mean(values);
  const n = values?.length ?? 0;
  if (n <= 1) {
    return {
      mean: Math.round(avg * 10) / 10,
      stdDev: 0,
      marginOfError: 0,
      lower: Math.round(avg * 10) / 10,
      upper: Math.round(avg * 10) / 10,
    };
  }
  const s = sampleStdDev(values);
  const df = n - 1;
  const t = studentTCriticalValue(df);
  const se = s / Math.sqrt(n);
  const moe = t * se;
  return {
    mean: Math.round(avg * 10) / 10,
    stdDev: Math.round(s * 10) / 10,
    marginOfError: Math.round(moe * 10) / 10,
    lower: Math.round((avg - moe) * 10) / 10,
    upper: Math.round((avg + moe) * 10) / 10,
  };
}

export function pairedDeltaConfidenceInterval(baselineScores, withSkillScores) {
  const n = Math.min(baselineScores?.length ?? 0, withSkillScores?.length ?? 0);
  if (n === 0) {
    return { mean: 0, stdDev: 0, marginOfError: 0, lower: 0, upper: 0, isNoise: true };
  }
  const diffs = [];
  for (let i = 0; i < n; i++) {
    diffs.push(withSkillScores[i] - baselineScores[i]);
  }
  const ci = confidenceInterval95(diffs);
  const isNoise = n > 1 ? ci.lower <= 0 && ci.upper >= 0 : ci.mean === 0;
  return {
    ...ci,
    isNoise,
  };
}

export function calculateGrade(meanDelta, withSkillMean, isNoise) {
  if (isNoise) return 'NOISE';
  if (meanDelta >= 20 && withSkillMean >= 85) return 'A';
  if (withSkillMean >= 75) return 'B';
  return 'C';
}

export function falsePositiveRate(cases) {
  const negativeCases = (cases || []).filter(c => c.expectTrigger === false);
  const totalNegative = negativeCases.length;
  if (totalNegative === 0) return { falsePositives: 0, totalNegative: 0, rate: 0 };
  const falsePositives = negativeCases.filter(c => c.triggered).length;
  return {
    falsePositives,
    totalNegative,
    rate: Math.round((falsePositives / totalNegative) * 100),
  };
}

export function parseStreamJsonEvents(stdout) {
  let text = '';
  let triggered = false;
  const toolCalls = [];

  for (const line of (stdout || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const event = JSON.parse(trimmed);
      if (event.type === 'assistant') {
        for (const block of event.message?.content ?? []) {
          if (block.type === 'tool_use') {
            toolCalls.push(block.name);
            if (block.name === 'Skill') {
              triggered = true;
            }
          }
        }
      }
      if (event.type === 'result' && typeof event.result === 'string') {
        text = event.result;
      }
    } catch {
      // Non-JSON line
    }
  }

  return { text, triggered, toolCalls };
}
