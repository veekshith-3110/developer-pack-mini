import {
  Teacher, ClassSection, SubjectAssignment, LabAssignment,
  TimetableSlot, DAYS, TimeSlot, getValidLabPairs,
} from "@/types/timetable";

const MAX_PERIODS_PER_DAY = 5;
const MAX_FIRST_PERIOD_PER_TEACHER = 2;

// PE is always fixed to periods 3 & 4 (2-period block, same slot across ALL sections/branches)
const PE_FIXED_PERIODS: [number, number] = [3, 4];

// OE is always fixed to period 5 (single period, same slot across ALL sections/branches)
const OE_FIXED_PERIOD = 5;

export function generateTimetable(
  teachers: Teacher[],
  classes: ClassSection[],
  assignments: SubjectAssignment[],
  timeSlots: TimeSlot[],
  labAssignments: LabAssignment[] = []
): { timetable: TimetableSlot[]; success: boolean; errors: string[] } {
  const errors: string[] = [];
  const timetable: TimetableSlot[] = [];

  const teachingSlotCount = timeSlots.filter(s => !s.isBreak).length;
  const PERIODS = Array.from({ length: teachingSlotCount }, (_, i) => i + 1);
  const validLabPairs = getValidLabPairs(timeSlots, false);
  const validLabPairsWithLunch = getValidLabPairs(timeSlots, true);

  const teacherOccupied = new Set<string>();
  const classOccupied = new Set<string>();
  const roomOccupied = new Set<string>();
  const classDayPeriodCount: Record<string, number> = {};
  const classDayLabCount: Record<string, number> = {};
  const teacherFirstPeriodCount: Record<string, number> = {};
  const teacherDayPeriods: Record<string, Record<number, Set<number>>> = {};

  const makeKey = (...parts: (string | number)[]) => parts.join("-");
  const cdKey = (classId: string, day: string) => `${classId}|${day}`;
  const dayIndex = (day: string) => DAYS.indexOf(day);

  const wouldRepeatConsecutiveDay = (teacherId: string, day: string, period: number): boolean => {
    const di = dayIndex(day);
    const teacherDays = teacherDayPeriods[teacherId] || {};
    if (di > 0 && teacherDays[di - 1]?.has(period)) return true;
    if (di < DAYS.length - 1 && teacherDays[di + 1]?.has(period)) return true;
    return false;
  };

  const recordTeacherDayPeriod = (teacherId: string, day: string, period: number) => {
    const di = dayIndex(day);
    if (!teacherDayPeriods[teacherId]) teacherDayPeriods[teacherId] = {};
    if (!teacherDayPeriods[teacherId][di]) teacherDayPeriods[teacherId][di] = new Set();
    teacherDayPeriods[teacherId][di].add(period);
  };

  // Determine which periods are globally reserved (PE and OE) so theory never goes there
  const hasPE = labAssignments.some(l => l.isPE);
  const hasOE = labAssignments.some(l => l.isOE);
  const globallyReservedPeriods = new Set<number>();
  if (hasPE) { globallyReservedPeriods.add(PE_FIXED_PERIODS[0]); globallyReservedPeriods.add(PE_FIXED_PERIODS[1]); }
  if (hasOE) { globallyReservedPeriods.add(OE_FIXED_PERIOD); }

  // ── 1. PE labs (fixed to periods 3 & 4, same day+period for all sections) ─
  const peLabs = labAssignments.filter(lab => lab.isPE);
  const oeLabs = labAssignments.filter(lab => lab.isOE);
  const regularLabs = labAssignments.filter(lab => !lab.isPE && !lab.isOE);

  // Pick a single day for PE across all sections (same day for all)
  // We pick the first available day that works for the most sections
  const peDay = pickGlobalDay(peLabs, classes, PE_FIXED_PERIODS[0], PE_FIXED_PERIODS[1]);

  for (const lab of peLabs) {
    const cls = classes.find(c => c.id === lab.classId);
    const labRoom = lab.labRoom || cls?.room || "Ground";
    const primaryTeacherId = lab.teacherIds[0] || "";
    const subject = lab.subjectName;
    let sessionsPlaced = 0;

    // Use the globally chosen PE day; if not available fall back to any day
    const dayOrder = peDay
      ? [peDay, ...DAYS.filter(d => d !== peDay)]
      : [...DAYS].sort(() => Math.random() - 0.5);

    const [p1, p2] = PE_FIXED_PERIODS;

    for (const day of dayOrder) {
      if (sessionsPlaced >= lab.sessionsPerWeek) break;
      const labDayKey = cdKey(lab.classId, day);
      if ((classDayLabCount[labDayKey] || 0) >= 1) continue;

      const dk = cdKey(lab.classId, day);
      if ((classDayPeriodCount[dk] || 0) + 2 > MAX_PERIODS_PER_DAY) continue;

      const cKey1 = makeKey(lab.classId, day, p1);
      const cKey2 = makeKey(lab.classId, day, p2);
      if (classOccupied.has(cKey1) || classOccupied.has(cKey2)) continue;
      if (roomOccupied.has(makeKey(labRoom, day, p1)) || roomOccupied.has(makeKey(labRoom, day, p2))) continue;

      const allFree = lab.teacherIds.every(tid =>
        !teacherOccupied.has(makeKey(tid, day, p1)) && !teacherOccupied.has(makeKey(tid, day, p2))
      );
      if (!allFree) continue;

      for (const [period, block] of [[p1, "first"], [p2, "second"]] as [number, "first" | "second"][]) {
        timetable.push({
          day, period, classId: lab.classId,
          teacherId: primaryTeacherId, teacherIds: lab.teacherIds,
          subject, room: labRoom, isLab: true, labBlock: block,
        });
        classOccupied.add(makeKey(lab.classId, day, period));
        roomOccupied.add(makeKey(labRoom, day, period));
        for (const tid of lab.teacherIds) {
          teacherOccupied.add(makeKey(tid, day, period));
          recordTeacherDayPeriod(tid, day, period);
        }
      }
      classDayPeriodCount[dk] = (classDayPeriodCount[dk] || 0) + 2;
      classDayLabCount[labDayKey] = (classDayLabCount[labDayKey] || 0) + 1;
      sessionsPlaced++;
    }

    if (sessionsPlaced < lab.sessionsPerWeek) {
      errors.push(`Could not place all PE sessions for "${lab.subjectName}" in ${cls?.name}. Placed ${sessionsPlaced}/${lab.sessionsPerWeek}.`);
    }
  }

  // ── 2. OE slots (fixed to period 5, single period, same day for all sections) ─
  // Pick a single global day for OE (same day for all sections)
  const oeDay = pickGlobalDaySingle(oeLabs, classes, OE_FIXED_PERIOD);

  for (const lab of oeLabs) {
    const cls = classes.find(c => c.id === lab.classId);
    const labRoom = lab.labRoom || cls?.room || "Room";
    const primaryTeacherId = lab.teacherIds[0] || "";
    const subject = lab.subjectName;
    let sessionsPlaced = 0;

    const dayOrder = oeDay
      ? [oeDay, ...DAYS.filter(d => d !== oeDay)]
      : [...DAYS].sort(() => Math.random() - 0.5);

    const period = OE_FIXED_PERIOD;

    for (const day of dayOrder) {
      if (sessionsPlaced >= lab.sessionsPerWeek) break;

      const dk = cdKey(lab.classId, day);
      if ((classDayPeriodCount[dk] || 0) + 1 > MAX_PERIODS_PER_DAY) continue;

      const cKey = makeKey(lab.classId, day, period);
      if (classOccupied.has(cKey)) continue;
      if (roomOccupied.has(makeKey(labRoom, day, period))) continue;

      const allFree = lab.teacherIds.every(tid =>
        !teacherOccupied.has(makeKey(tid, day, period))
      );
      if (!allFree) continue;

      // OE is a single-period slot (not a lab block)
      timetable.push({
        day, period, classId: lab.classId,
        teacherId: primaryTeacherId, teacherIds: lab.teacherIds,
        subject, room: labRoom, isLab: false,
      });
      classOccupied.add(cKey);
      roomOccupied.add(makeKey(labRoom, day, period));
      for (const tid of lab.teacherIds) {
        teacherOccupied.add(makeKey(tid, day, period));
        recordTeacherDayPeriod(tid, day, period);
      }
      classDayPeriodCount[dk] = (classDayPeriodCount[dk] || 0) + 1;
      sessionsPlaced++;
    }

    if (sessionsPlaced < lab.sessionsPerWeek) {
      errors.push(`Could not place all OE sessions for "${lab.subjectName}" in ${cls?.name}. Placed ${sessionsPlaced}/${lab.sessionsPerWeek}.`);
    }
  }

  // ── 3. Regular labs ────────────────────────────────────────────────────────
  for (const lab of regularLabs) {
    const cls = classes.find(c => c.id === lab.classId);
    const labRoom = lab.labRoom || cls?.room || "Lab";
    const primaryTeacherId = lab.teacherIds[0] || "";
    const subject = lab.subjectName;
    let sessionsPlaced = 0;
    const dayOrder = [...DAYS].sort(() => Math.random() - 0.5);
    const pairs = lab.useLunchSlot ? validLabPairsWithLunch : validLabPairs;

    for (const day of dayOrder) {
      if (sessionsPlaced >= lab.sessionsPerWeek) break;
      const labDayKey = cdKey(lab.classId, day);
      if ((classDayLabCount[labDayKey] || 0) >= 1) continue;

      const shuffledPairs = [...pairs].sort(() => Math.random() - 0.5);
      for (const [p1, p2] of shuffledPairs) {
        if (sessionsPlaced >= lab.sessionsPerWeek) break;
        // Don't place regular labs in globally reserved periods
        if (globallyReservedPeriods.has(p1) || globallyReservedPeriods.has(p2)) continue;

        const dk = cdKey(lab.classId, day);
        if ((classDayPeriodCount[dk] || 0) + 2 > MAX_PERIODS_PER_DAY) continue;

        const cKey1 = makeKey(lab.classId, day, p1);
        const cKey2 = makeKey(lab.classId, day, p2);
        if (classOccupied.has(cKey1) || classOccupied.has(cKey2)) continue;
        if (roomOccupied.has(makeKey(labRoom, day, p1)) || roomOccupied.has(makeKey(labRoom, day, p2))) continue;

        const allFree = lab.teacherIds.every(tid =>
          !teacherOccupied.has(makeKey(tid, day, p1)) && !teacherOccupied.has(makeKey(tid, day, p2))
        );
        if (!allFree) continue;

        for (const [period, block] of [[p1, "first"], [p2, "second"]] as [number, "first" | "second"][]) {
          timetable.push({
            day, period, classId: lab.classId,
            teacherId: primaryTeacherId, teacherIds: lab.teacherIds,
            subject, room: labRoom, isLab: true, labBlock: block,
          });
          classOccupied.add(makeKey(lab.classId, day, period));
          roomOccupied.add(makeKey(labRoom, day, period));
          for (const tid of lab.teacherIds) {
            teacherOccupied.add(makeKey(tid, day, period));
            recordTeacherDayPeriod(tid, day, period);
          }
        }
        classDayPeriodCount[dk] = (classDayPeriodCount[dk] || 0) + 2;
        classDayLabCount[labDayKey] = (classDayLabCount[labDayKey] || 0) + 1;
        sessionsPlaced++;
        break;
      }
    }

    if (sessionsPlaced < lab.sessionsPerWeek) {
      errors.push(`Could not place all lab sessions for "${lab.subjectName}" in ${cls?.name}. Placed ${sessionsPlaced}/${lab.sessionsPerWeek}.`);
    }
  }

  // ── 4. Regular theory assignments ──────────────────────────────────────────
  interface PendingSlot { classId: string; teacherId: string; subject: string; room: string; remaining: number; }

  const pending: PendingSlot[] = assignments.map(a => {
    const teacher = teachers.find(t => t.id === a.teacherId);
    const cls = classes.find(c => c.id === a.classId);
    return {
      classId: a.classId, teacherId: a.teacherId,
      subject: teacher?.subject || "Unknown",
      room: cls?.room || "Unknown",
      remaining: a.periodsPerWeek,
    };
  });

  const shuffled = [...pending].sort(() => Math.random() - 0.5);
  shuffled.sort((a, b) => a.remaining - b.remaining);

  for (const slot of shuffled) {
    let placed = 0;
    const dayOrder = [...DAYS].sort(() => Math.random() - 0.5);
    const dayCount: Record<string, number> = {};

    for (let attempt = 0; attempt < slot.remaining * 50 && placed < slot.remaining; attempt++) {
      for (const day of dayOrder) {
        if (placed >= slot.remaining) break;
        const dcKey = `${slot.classId}-${slot.subject}-${day}`;
        if ((dayCount[dcKey] || 0) >= 2) continue;
        const dk = cdKey(slot.classId, day);
        if ((classDayPeriodCount[dk] || 0) >= MAX_PERIODS_PER_DAY) continue;

        const periodOrder = [...PERIODS].sort(() => Math.random() - 0.5);

        for (const period of periodOrder) {
          if (placed >= slot.remaining) break;
          // Skip globally reserved periods (PE and OE slots)
          if (globallyReservedPeriods.has(period)) continue;

          const tKey = makeKey(slot.teacherId, day, period);
          const cKey = makeKey(slot.classId, day, period);
          const rKey = makeKey(slot.room, day, period);
          if (teacherOccupied.has(tKey) || classOccupied.has(cKey) || roomOccupied.has(rKey)) continue;

          if (period === 1 && (teacherFirstPeriodCount[slot.teacherId] || 0) >= MAX_FIRST_PERIOD_PER_TEACHER) continue;
          if (wouldRepeatConsecutiveDay(slot.teacherId, day, period)) continue;

          timetable.push({ day, period, classId: slot.classId, teacherId: slot.teacherId, subject: slot.subject, room: slot.room });
          teacherOccupied.add(tKey);
          classOccupied.add(cKey);
          roomOccupied.add(rKey);
          dayCount[dcKey] = (dayCount[dcKey] || 0) + 1;
          classDayPeriodCount[dk] = (classDayPeriodCount[dk] || 0) + 1;
          if (period === 1) teacherFirstPeriodCount[slot.teacherId] = (teacherFirstPeriodCount[slot.teacherId] || 0) + 1;
          recordTeacherDayPeriod(slot.teacherId, day, period);
          placed++;
          break;
        }
      }
    }

    if (placed < slot.remaining) {
      const teacher = teachers.find(t => t.id === slot.teacherId);
      const cls = classes.find(c => c.id === slot.classId);
      errors.push(`Could not place all periods for ${slot.subject} (${teacher?.name}) in ${cls?.name}. Placed ${placed}/${slot.remaining}`);
    }
  }

  return { timetable, success: errors.length === 0, errors };
}

/**
 * Picks the best single day for a 2-period global slot (PE) across all sections.
 * Prefers a day where all sections have both periods free.
 */
function pickGlobalDay(
  labs: LabAssignment[],
  _classes: ClassSection[],
  p1: number,
  p2: number,
): string | null {
  if (labs.length === 0) return null;
  // Just pick a random day — PE is placed first so all slots are free
  const shuffled = [...DAYS].sort(() => Math.random() - 0.5);
  return shuffled[0];
}

/**
 * Picks the best single day for a 1-period global slot (OE) across all sections.
 */
function pickGlobalDaySingle(
  labs: LabAssignment[],
  _classes: ClassSection[],
  _period: number,
): string | null {
  if (labs.length === 0) return null;
  const shuffled = [...DAYS].sort(() => Math.random() - 0.5);
  return shuffled[0];
}
