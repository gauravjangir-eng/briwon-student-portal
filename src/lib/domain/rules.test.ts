import { describe, expect, it } from "vitest";
import { attendancePercent, attendanceStatusFor, feeStatus, gradeFor, haversineMeters, minutesAfter, submissionWindow } from "./rules";

const at = (hhmm: string) => new Date(`2026-11-27T${hhmm}:00+05:30`);

describe("attendance timing", () => {
  const start = at("10:00");
  it.each([
    ["10:00", "present"], ["10:14", "present"], ["10:15", "late"], ["10:30", "late"], ["10:31", "absent"], ["09:50", "present"],
  ])("%s → %s", (time, expected) => {
    expect(attendanceStatusFor(minutesAfter(start, at(time)))).toBe(expected);
  });
  it("10:14:59 is still present (minutes are floored)", () => {
    expect(attendanceStatusFor(minutesAfter(start, new Date("2026-11-27T10:14:59+05:30")))).toBe("present");
  });
  it("respects a configured policy", () => {
    expect(attendanceStatusFor(12, { presentUntilMin: 10, lateUntilMin: 20 })).toBe("late");
    expect(attendanceStatusFor(21, { presentUntilMin: 10, lateUntilMin: 20 })).toBe("absent");
  });
});

describe("attendance percentage", () => {
  it("counts late with weight and excludes excused", () => {
    expect(attendancePercent({ present: 6, late: 2, total: 10, excused: 0 }, 1)).toBe(80);
    expect(attendancePercent({ present: 6, late: 2, total: 10, excused: 0 }, 0.5)).toBe(70);
    expect(attendancePercent({ present: 6, late: 2, total: 10, excused: 2 }, 0)).toBe(75);
    expect(attendancePercent({ present: 0, late: 0, total: 0, excused: 0 })).toBe(0);
  });
});

describe("GPS distance", () => {
  it("is ~0 for the same point and ~111 km per degree of latitude", () => {
    expect(haversineMeters(26.9124, 75.7873, 26.9124, 75.7873)).toBeCloseTo(0, 5);
    expect(haversineMeters(26, 75, 27, 75)).toBeGreaterThan(111000);
    expect(haversineMeters(26, 75, 27, 75)).toBeLessThan(111400);
  });
  it("detects points outside a 200 m radius", () => {
    expect(haversineMeters(26.9124, 75.7873, 26.9144, 75.7873)).toBeGreaterThan(200);
    expect(haversineMeters(26.9124, 75.7873, 26.9134, 75.7873)).toBeLessThan(200);
  });
});

describe("fee status", () => {
  const today = "2026-11-27";
  it("derives each status", () => {
    expect(feeStatus(1000, 1000, 0, null, today)).toBe("paid");
    expect(feeStatus(1000, 400, 600, null, today)).toBe("waived");
    expect(feeStatus(1000, 400, 0, "2026-12-01", today)).toBe("partially_paid");
    expect(feeStatus(1000, 400, 0, "2026-11-01", today)).toBe("overdue");
    expect(feeStatus(1000, 0, 0, null, today)).toBe("pending");
  });
});

describe("certificate grade", () => {
  it("maps overall percentage", () => {
    expect(gradeFor(85, true)).toBe("Distinction");
    expect(gradeFor(84.99, true)).toBe("Merit");
    expect(gradeFor(70, true)).toBe("Merit");
    expect(gradeFor(69, true)).toBe("Pass");
    expect(gradeFor(50, true)).toBe("Pass");
    expect(gradeFor(49.9, true)).toBe("Not Yet Complete");
  });
  it("is Not Yet Complete when a requirement is missing, regardless of score", () => {
    expect(gradeFor(99, false)).toBe("Not Yet Complete");
  });
});

describe("late submission policy", () => {
  const deadline = new Date("2026-11-20T23:59:00+05:30");
  it("on time", () => expect(submissionWindow(deadline, new Date("2026-11-20T20:00:00+05:30"), "none")).toEqual({ late: false, accepted: true, countsOnTime: true }));
  it("late rejected under 'none'", () => expect(submissionWindow(deadline, new Date("2026-11-21T10:00:00+05:30"), "none").accepted).toBe(false));
  it("late within 7 days accepted and counts under 'grace'", () => expect(submissionWindow(deadline, new Date("2026-11-26T10:00:00+05:30"), "grace")).toEqual({ late: true, accepted: true, countsOnTime: true }));
  it("after grace rejected under 'grace'", () => expect(submissionWindow(deadline, new Date("2026-11-28T10:00:00+05:30"), "grace").accepted).toBe(false));
  it("after grace accepted but not on time under 'always'", () => expect(submissionWindow(deadline, new Date("2026-11-30T10:00:00+05:30"), "always")).toEqual({ late: true, accepted: true, countsOnTime: false }));
  it("grace does not count when policy disabled", () => expect(submissionWindow(deadline, new Date("2026-11-22T10:00:00+05:30"), "grace", 7, false).countsOnTime).toBe(false));
});
