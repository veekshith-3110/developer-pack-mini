import {
  Teacher, ClassSection, SubjectAssignment, LabAssignment,
  TimetableSlot, DAYS, TimeSlot, getValidLabPairs,
  GlobalPEConfig, GlobalOEConfig, getPeriodBeforeLunch,
} from "@/types/timetable";

const MAX_PERIODS_PER_DAY = 5;
const MAX_FIRST_PERIOD_PER_TEACHER = 2;
// Max times per week a class can have a lab in the lunch slot
const MAX_LUNCH_SLOT_USES_PER_CLASS = 2;

export function generateTimetable(
  teachers: Teacher[],
  classes: ClassSection[],
  assignments: SubjectAssignment[],
  timeSlots: TimeSlot[],
  labAssignments: LabAssignment[] = [],
  peConfig?: GlobalPEConfig,
  oeConfig?: GlobalOEConfig,
): { timetable: TimetableSlot[]; success: boolean; errors: string[]; updatedTimeSlots: TimeSlot[] } {
  const errors: string[] = [];
  const timetable: TimetableSlot[] = [];

  const teachingSlotCount = timeSlots.filter(s => !s.isBreak).length;
  const PERIODS = Array.from({ length: teachingSlotCount }, (_, i) => i + 1);

  // Valid pairs for normal labs (no lunch crossing)
  const validLabPairs = getValidLabPairs(timeSlots, false);
  // Valid pairs including lunch slot (for labs with useLunchSlot=true)
  const validLabPairsWithLunch = getValidLabPairs(timeSlots, true);

  // Identify the lunch-spanning pair: [periodBeforeLunch, periodAfterLunch]
  const periodBeforeLunch = getPeriodBeforeLunch(timeSlots);
  const periodAfterLunch = periodBeforeLunch !== null
    ? (() => {
        // find the first teaching period after the lunch break
        let idx = 0;
        let foundLunch = false;
        for (const s of timeSlots) {
          if (s.isBreak) {
            if (s.breakLabel === "LUNCH") foundLunch = true;
          } else {
            idx++;
            if (foundLunch) return idx;
          }
        }
        return null;
      })()
    : null;

  const isLunchPair = (p1: number, p2: number) =>
    periodBeforeLunch !== null && periodAfterLunch !== null &&
    p1 === periodBeforeLunch && p2 === periodAfterLunch;

  const teacherOccupied = new Set<string>();
  const classOccupied = new Set<string>();
  const roomOccupied = new Set<string>();
  const classDayPeriodCount: Record<string, number> = {};
  const classDayLabCount: Record<string, number> = {};
  const teacherFirstPeriodCount: Record<string, number> = {};
  const teacherDayPeriods: Record<string, Record<number, Set<number>>> = {};
  // Track how many times per week each class uses the lunch slot
  const classLunchSlotWeekCount: Record<string, number> = {};

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

  // Build globally reserved (day, period) pairs from PE/OE config
  const globallyReservedSlots = new Set<string>(); // "day|period"
  if (peConfig) {
    globallyReservedSlots.add(`${peConfig.day}|${peConfig.period1}`);
    globallyReservedSlots.add(`${peConfig.day}|${peConfig.period2}`);
  }
  if (oeConfig) {
    globallyReservedSlots.add(`${oeConfig.day}|${oeConfig.period}`);
  }

  const isGloballyReserved = (day: string, period: number) =>
    globallyReservedSlots.has(`${day}|${period}`);

  // Track whether any lunch-slot lab was placed (to shift lunch time in output)
  let lunchSlotUsed = false;

  // ── 1. PE ─────────────────────────────────────────────────────────────────
  const peLabs = labAssignments.filter(lab => lab.isPE);
  const oeLabs = labAssignments.filter(lab => lab.isOE);
  const regularLabs = labAssignments.filter(lab => !lab.isPE && !lab.isOE);

  for (const lab of peLabs) {
    if (!peConfig) {
      errors.push(`Professional Elective config missing — please set the day and periods in the PE/OE settings.`);
      continue;
    }
    const cls = classes.find(c => c.id === lab.classId);
    const labRoom = lab.labRoom || cls?.room || "Ground";
    const primaryTeacherId = lab.teacherIds[0] || "";
    const subject = lab.subjectName;
    const { day, period1: p1, period2: p2 } = peConfig;

    const dk = cdKey(lab.classId, day);
    const cKey1 = makeKey(lab.classId, day, p1);
    const cKey2 = makeKey(lab.classId, day, p2);

    if (classOccupied.has(cKey1) || classOccupied.has(cKey2)) {
      errors.push(`Professional Elective slot conflict for "${subject}" in ${cls?.name} on ${day}.`);
      continue;
    }

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
    classDayLabCount[cdKey(lab.classId, day)] = (classDayLabCount[cdKey(lab.classId, day)] || 0) + 1;
  }

  // ── 2. OE ─────────────────────────────────────────────────────────────────
  for (const lab of oeLabs) {
    if (!oeConfig) {
      errors.push(`OE config missing — please set OE day and period in the PE/OE settings.`);
      continue;
    }
    const cls = classes.find(c => c.id === lab.classId);
    const labRoom = lab.labRoom || cls?.room || "Room";
    const primaryTeacherId = lab.teacherIds[0] || "";
    const subject = lab.subjectName;
    const { day, period } = oeConfig;

    const dk = cdKey(lab.classId, day);
    const cKey = makeKey(lab.classId, day, period);

    if (classOccupied.has(cKey)) {
      errors.push(`OE slot conflict for "${subject}" in ${cls?.name} on ${day}.`);
      continue;
    }

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
  }

  // ── 3. Regular labs ────────────────────────────────────────────────────────
  for (const lab of regularLabs) {
    const cls = classes.find(c => c.id === lab.classId);
    const labRoom = lab.labRoom || cls?.room || "Lab";
    const primaryTeacherId = lab.teacherIds[0] || "";
    const subject = lab.subjectName;
    let sessionsPlaced = 0;
    const dayOrder = [...DAYS].sort(() => Math.random() - 0.5);

    // For lunch-slot labs: try regular pairs first, then lunch pair as fallback
    // For non-lunch labs: only use normal pairs (never lunch)
    const pairs = lab.useLunchSlot ? validLabPairsWithLunch : validLabPairs;

    for (const day of dayOrder) {
      if (sessionsPlaced >= lab.sessionsPerWeek) break;
      const labDayKey = cdKey(lab.classId, day);
      if ((classDayLabCount[labDayKey] || 0) >= 1) continue;

      // For lunch-slot labs: check weekly lunch slot limit
      if (lab.useLunchSlot && (classLunchSlotWeekCount[lab.classId] || 0) >= MAX_LUNCH_SLOT_USES_PER_CLASS) {
        // Exceeded lunch slot limit — fall back to normal pairs only
      }

      const shuffledPairs = [...pairs].sort((a, b) => {
        // Prioritize lunch pairs when useLunchSlot is true and limit not reached
        if (lab.useLunchSlot) {
          const aIsLunch = isLunchPair(a[0], a[1]);
          const bIsLunch = isLunchPair(b[0], b[1]);
          const lunchLimitReached = (classLunchSlotWeekCount[lab.classId] || 0) >= MAX_LUNCH_SLOT_USES_PER_CLASS;
          if (!lunchLimitReached && aIsLunch && !bIsLunch) return -1;
          if (!lunchLimitReached && !aIsLunch && bIsLunch) return 1;
        }
        return Math.random() - 0.5;
      });

      for (const [p1, p2] of shuffledPairs) {
        if (sessionsPlaced >= lab.sessionsPerWeek) break;

        const thisIsLunchPair = isLunchPair(p1, p2);

        // If this is a lunch pair but limit reached, skip it
        if (thisIsLunchPair && (classLunchSlotWeekCount[lab.classId] || 0) >= MAX_LUNCH_SLOT_USES_PER_CLASS) continue;

        // Only allow lunch pairs for labs with useLunchSlot=true
        if (thisIsLunchPair && !lab.useLunchSlot) continue;

        // Skip if either period is globally reserved on this day
        if (isGloballyReserved(day, p1) || isGloballyReserved(day, p2)) continue;

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

        if (thisIsLunchPair) {
          classLunchSlotWeekCount[lab.classId] = (classLunchSlotWeekCount[lab.classId] || 0) + 1;
          lunchSlotUsed = true;
        }

        sessionsPlaced++;
        break;
      }
    }

    if (sessionsPlaced < lab.sessionsPerWeek) {
      errors.push(`Could not place all lab sessions for "${subject}" in ${cls?.name}. Placed ${sessionsPlaced}/${lab.sessionsPerWeek}.`);
    }
  }

  // ── 4. Regular theory assignments ──────────────────────────────────────────
  // Theory NEVER goes into the lunch break period (before or after lunch)
  // when a lab is using that slot on the same day
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
          // Skip globally reserved (day, period) combos
          if (isGloballyReserved(day, period)) continue;
          // Theory never goes into lunch-adjacent periods (those are for labs only)
          if (periodBeforeLunch !== null && period === periodBeforeLunch) continue;
          if (periodAfterLunch !== null && period === periodAfterLunch) continue;

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

  // ── Shift lunch time if any lab used the lunch slot ────────────────────────
  let updatedTimeSlots = timeSlots;
  if (lunchSlotUsed) {
    updatedTimeSlots = timeSlots.map(ts => {
      if (ts.isBreak && ts.breakLabel === "LUNCH") {
        return { ...ts, startTime: "11:30", endTime: "12:20" };
      }
      return ts;
    });
  }

  return { timetable, success: errors.length === 0, errors, updatedTimeSlots };
}
