import { describe, expect, it } from "vitest";
import { habitProgress } from "../habit-progress";
// June 2026: 1st is Monday, 30 days
const Y = 2026, M = 5, T = 30;
describe("habit progress", () => {
  it("daily 3 of 5 elapsed = 60%", () => {
    expect(habitProgress({ id: "a", title: "", emoji: "" }, [1, 2, 4], Y, M, T, 5).pct).toBe(60);
  });
  it("weekly 3x on other weekdays = 100% for week", () => {
    const h = { id: "a", title: "", emoji: "", freq: { type: "weekly" as const, times: 3, days: [1, 3, 5] } };
    expect(habitProgress(h, [2, 4, 6], Y, M, T, 7).pct).toBe(100);
  });
  it("weekly 3x completed 4 times capped at 100%", () => {
    const h = { id: "a", title: "", emoji: "", freq: { type: "weekly" as const, times: 3 } };
    expect(habitProgress(h, [1, 2, 3, 4], Y, M, T, 7).pct).toBe(100);
  });
  it("monthly target 8, done 2 = 25%", () => {
    const h = { id: "a", title: "", emoji: "", freq: { type: "monthly" as const, times: 8 } };
    expect(habitProgress(h, [3, 9], Y, M, T, 30).pct).toBe(25);
  });
});
