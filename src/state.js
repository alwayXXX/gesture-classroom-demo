export const LETTERS = ['A', 'B', 'C', 'D'];
export const emptyCounts = () => [0, 0, 0, 0];
export function voteCounts(hands) {
  const counts = emptyCounts();
  for (const hand of hands) {
    const n = [[8, 6], [12, 10], [16, 14], [20, 18]].reduce(
      (sum, [tip, joint]) => sum + (hand[tip].y < hand[joint].y - 0.015 ? 1 : 0), 0
    );
    if (n >= 1 && n <= 4) counts[n - 1]++;
  }
  return counts;
}
export function result(counts, answer) {
  const total = counts.reduce((sum, n) => sum + n, 0);
  return { total, right: counts[answer], rate: total ? Math.round(counts[answer] / total * 100) : null };
}
