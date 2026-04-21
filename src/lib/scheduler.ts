import { Teacher, ClassSection, SubjectAssignment, LabAssignment, TimetableSlot, DAYS, TimeSlot, getValidLabPairs } from "@/types/timetable";

const MAX_PERIODS_PER_DAY = 5;
const MAX_FIRST_PERIOD_PER_TEACHER = 2;

// PE is always fixed to periods 3 & 4 (same hour across all departments)
const PE_FIXED_PERIODS: [number, number] = [3, 4];

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
  // Valid pairs for normal labs (no lunch crossing)
  const validLabPairs = getValidLabPairs(timeSlots, false);
  // Valid pairs including lunch slot (for labs with useLunchSlot=true)
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

  // ── PE labs first (fixed to periods 3 & 4, same slot for all sections) ───
  const peLabs = labAssignments.filter(lab => lab.isPE);
  const regularLabs = labAssignments.filter(lab => !lab.isPE);

  for (const lab of peLabs) {
    const cls = classes.find(c => c.id === lab.classId);
    const labRoom = lab.labRoom || cls?.room || "Ground";
    const primaryTeacherId = lab.teacherIds[0] || "";
    const subject = lab.subjectName;
    let sessionsPlaced = 0;
    const dayOrder = [...DAYS].sort(() => Math.random() - 0.5);
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
        timetable.push({ day, period, classId: lab.classId, teacherId: primaryTeacherId, teacherIds: lab.teacherIds, subject, room: labRoom, isLab: true, labBlock: block });
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
      errors.push(`Could not place all PE sessions for "${subject}" in ${cls?.name}. Placed ${sessionsPlaced}/${lab.sessionsPerWeek}.`);
    }
  }

  // ── Regular labs (most constrained, placed before theory) ─────────────────
  for (const lab of regularLabs) {
    const cls = classes.find(c => c.id === lab.classId);
    const labRoom = lab.labRoom || cls?.room || "Lab";
    const primaryTeacherId = lab.teacherIds[0] || "";
    const subject = lab.subjectName;
    let sessionsPlaced = 0;
    const dayOrder = [...DAYS].sort(() => Math.random() - 0.5);

    // Use lunch-spanning pairs if useLunchSlot is enabled
    const pairs = lab.useLunchSlot ? validLabPairsWithLunch : validLabPairs;

    for (const day of dayOrder) {
      if (sessionsPlaced >= lab.sessionsPerWeek) break;
      const labDayKey = cdKey(lab.classId, day);
      if ((classDayLabCount[labDayKey] || 0) >= 1) continue;

      const shuffledPairs = [...pairs].sort(() => Math.random() - 0.5);
      for (const [p1, p2] of shuffledPairs) {
        if (sessionsPlaced >= lab.sessionsPerWeek) break;
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
          timetable.push({ day, period, classId: lab.classId, teacherId: primaryTeacherId, teacherIds: lab.teacherIds, subject, room: labRoom, isLab: true, labBlock: block });
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
      errors.push(`Could not place all lab sessions for "${subject}" in ${cls?.name}. Placed ${sessionsPlaced}/${lab.sessionsPerWeek}.`);
    }
  }

  // ── Regular assignments ────────────────────────────────────────────────────
  interface PendingSlot { classId: string; teacherId: string; subject: string; room: string; remaining: number; }

  // Collect all teacher IDs that are exclusively lab teachers (not in theory assignments)
  const labOnlyTeacherIds = new Set(
    labAssignments.flatMap(l => l.teacherIds).filter(tid =>
      !assignments.some(a => a.teacherId === tid)
    )
  );

  const pending: PendingSlot[] = assignments.map(a => {
    const teacher = teachers.find(t => t.id === a.teacherId);
    const cls = classes.find(c => c.id === a.classId);
    return { classId: a.classId, teacherId: a.teacherId, subject: teacher?.subject || "Unknown", room: cls?.room || "Unknown", remaining: a.periodsPerWeek };
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
          // Skip PE periods (3 & 4) for theory assignments — those are reserved for PE
          if (period === PE_FIXED_PERIODS[0] || period === PE_FIXED_PERIODS[1]) continue;

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
