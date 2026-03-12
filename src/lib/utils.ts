/**
 * Find longest consecutive True streak in a boolean array.
 */
export function longestStreak(series: boolean[]): number {
  let maxStreak = 0;
  let current = 0;
  for (const val of series) {
    if (val) {
      current++;
      maxStreak = Math.max(maxStreak, current);
    } else {
      current = 0;
    }
  }
  return maxStreak;
}
