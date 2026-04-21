export interface Teacher {
  id: string;
  name: string;
  subject: string;
  phone: string;
}

export interface ClassSection {
  id: string;
  name: string;
  room: string;
}

export interface SubjectAssignment {
  id: string;
  classId: string;
  teacherId: string;
  periodsPerWeek: number;
}

/** A lab assignment — one lab subject with multiple teachers, scheduled as 2-consecutive-period blocks */
export interface LabAssignment {
  id: string;
  classId: string;
  subjectName: string;      // e.g. "Physics Lab"
  teacherIds: string[];     // 1–N teachers who co-supervise the lab
  sessionsPerWeek: number;  // each session = 2 consecutive periods
  labRoom?: string;         // optional separate lab room
  isPE?: boolean;           // if true, uses globalPEConfig day/periods (Professional Elective)
  isOE?: boolean;           // if true, uses globalOEConfig day/period — single period
  useLunchSlot?: boolean;   // if true, allow scheduling into the lunch break slot
}

/**
 * A globally fixed subject slot — appears at the same (day, period) for ALL sections.
 * PE3, PE4, OE each have their own fixed schedule entries.
 * Each section has its own teacher for this subject.
 */
export interface GlobalFixedSlot {
  day: string;
  period: number;
}

export interface GlobalFixedSubject {
  id: string;
  name: string;           // e.g. "PE 3", "PE 4", "OE"
  slots: GlobalFixedSlot[]; // list of (day, period) this subject occupies per week
  // Per-section teacher assignments: classId → teacherId
  sectionTeachers: Record<string, string>;
}

/**
 * Global PE config — user manually picks the day and the two consecutive periods
 * that ALL sections share for Professional Elective (PE).
 * @deprecated Use GlobalFixedSubject instead
 */
export interface GlobalPEConfig {
  day: string;
  period1: number;
  period2: number;
}

/**
 * Global OE config — user manually picks the day and single period
 * that ALL sections share for Open Elective.
 * @deprecated Use GlobalFixedSubject instead
 */
export interface GlobalOEConfig {
  day: string;
  period: number;
}

export interface TimeSlot {
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  breakLabel?: string;
}

export interface TimetableSlot {
  day: string;
  period: number;
  classId: string;
  teacherId: string;        // primary teacher (or first teacher for labs)
  subject: string;
  room: string;
  isLab?: boolean;          // true for lab slots
  teacherIds?: string[];    // all teachers for a lab slot
  labBlock?: "first" | "second"; // which half of the 2-period block
}

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Default 8-period schedule matching reference image
export const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { label: "P1", startTime: "08:30", endTime: "09:25", isBreak: false },
  { label: "P2", startTime: "09:25", endTime: "10:20", isBreak: false },
  { label: "P3", startTime: "10:20", endTime: "10:40", isBreak: true, breakLabel: "BREAK" },
  { label: "P4", startTime: "10:40", endTime: "11:35", isBreak: false },
  { label: "P5", startTime: "11:35", endTime: "12:30", isBreak: false },
  { label: "P6", startTime: "12:30", endTime: "01:30", isBreak: true, breakLabel: "LUNCH" },
  { label: "P7", startTime: "01:30", endTime: "02:25", isBreak: false },
  { label: "P8", startTime: "02:25", endTime: "03:20", isBreak: false },
  { label: "P9", startTime: "03:20", endTime: "04:15", isBreak: false },
];

export function getTeachingPeriods(slots: TimeSlot[]): number[] {
  let idx = 1;
  const periods: number[] = [];
  for (const s of slots) {
    if (!s.isBreak) {
      periods.push(idx);
      idx++;
    }
  }
  return periods;
}

/**
 * Returns pairs of consecutive period numbers that do NOT straddle a break.
 * e.g. if slots are P1,P2,BREAK,P3,P4,LUNCH,P5,P6 →
 *   valid pairs: [1,2], [3,4], [5,6]  (1&2 are consecutive, 2&3 straddle break → invalid)
 *
 * If includeLunchSlot=true, also includes the pair [lastPeriodBeforeLunch, firstPeriodAfterLunch]
 * so labs can span the lunch break.
 */
export function getValidLabPairs(slots: TimeSlot[], includeLunchSlot = false): [number, number][] {
  const pairs: [number, number][] = [];
  let periodIdx = 0;
  // Build a timeline: each entry is either { period: N } or { isBreak: true, isLunch: bool }
  const timeline: ({ period: number } | { isBreak: true; isLunch: boolean })[] = [];
  for (const s of slots) {
    if (s.isBreak) {
      timeline.push({ isBreak: true, isLunch: s.breakLabel === "LUNCH" });
    } else {
      periodIdx++;
      timeline.push({ period: periodIdx });
    }
  }

  // Walk timeline; consecutive period entries with no break between them form valid pairs
  for (let i = 0; i < timeline.length - 1; i++) {
    const a = timeline[i];
    const b = timeline[i + 1];
    if ("period" in a && "period" in b) {
      pairs.push([a.period, b.period]);
    }
    // Lunch-spanning pair: period → LUNCH → period
    if (includeLunchSlot && "period" in a && "isBreak" in b && b.isLunch) {
      // find the first period after the lunch break
      for (let j = i + 2; j < timeline.length; j++) {
        const c = timeline[j];
        if ("period" in c) {
          pairs.push([a.period, c.period]);
          break;
        }
      }
    }
  }
  return pairs;
}

/**
 * Returns the period number immediately before the LUNCH break, or null if none.
 */
export function getPeriodBeforeLunch(slots: TimeSlot[]): number | null {
  let periodIdx = 0;
  let lastPeriod: number | null = null;
  for (const s of slots) {
    if (s.isBreak) {
      if (s.breakLabel === "LUNCH") return lastPeriod;
    } else {
      periodIdx++;
      lastPeriod = periodIdx;
    }
  }
  return null;
}
