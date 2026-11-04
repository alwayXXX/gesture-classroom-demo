import test from 'node:test';
import assert from 'node:assert/strict';
import { result, voteCounts } from '../src/state.js';

test('统计四种有效手势，忽略握拳', () => {
  function hand(n) {
    const points = Array.from({ length: 21 }, () => ({ x: 0, y: 0.5 }));
    [8, 12, 16, 20].slice(0, n).forEach((index) => { points[index].y = 0.3; });
    return points;
  }
  assert.deepEqual(voteCounts([hand(1), hand(1), hand(3), hand(4), hand(0)]), [2, 0, 1, 1]);
});
test('正确率按有效票数计算，零票时不假装是零正确率', () => {
  assert.deepEqual(result([1, 3, 0, 0], 1), { total: 4, right: 3, rate: 75 });
  assert.deepEqual(result([0, 0, 0, 0], 0), { total: 0, right: 0, rate: null });
});
