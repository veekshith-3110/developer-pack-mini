import { useState, useRef } from "react";
import { TimetableSlot, ClassSection, Teacher, DAYS, TimeSlot } from "@/types/timetable";
import { Printer, Building2, BookOpen, Calendar, Search, Filter, X, FlaskConical, BookOpenCheck, Users } from "lucide-react";
import SlotEditDialog from "@/components/SlotEditDialog";

interface Props {
  timetable: TimetableSlot[];
  setTimetable: (t: TimetableSlot[]) => void;
  classes: ClassSection[];
  teachers: Teacher[];
  timeSlots: TimeSlot[];
  setTimeSlots: (ts: TimeSlot[]) => void;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  collegeName: string;
  setCollegeName: (v: string) => void;
  department: string;
  setDepartment: (v: string) => void;
  semester: string;
  setSemester: (v: string) => void;
  role?: "teacher" | "student" | null;
}

// Rich subject color palette – HSL-based, compatible with design system
const SUBJECT_PALETTES = [
  { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-300", ring: "ring-blue-400", badge: "bg-blue-100 text-blue-800 border-blue-300" },
  { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-300", ring: "ring-emerald-400", badge: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-300", ring: "ring-amber-400", badge: "bg-amber-100 text-amber-800 border-amber-300" },
  { bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-300", ring: "ring-violet-400", badge: "bg-violet-100 text-violet-800 border-violet-300" },
  { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-300", ring: "ring-rose-400", badge: "bg-rose-100 text-rose-800 border-rose-300" },
  { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-300", ring: "ring-cyan-400", badge: "bg-cyan-100 text-cyan-800 border-cyan-300" },
  { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-300", ring: "ring-orange-400", badge: "bg-orange-100 text-orange-800 border-orange-300" },
  { bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-300", ring: "ring-indigo-400", badge: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  { bg: "bg-lime-50", text: "text-lime-800", border: "border-lime-300", ring: "ring-lime-400", badge: "bg-lime-100 text-lime-800 border-lime-300" },
  { bg: "bg-fuchsia-50", text: "text-fuchsia-800", border: "border-fuchsia-300", ring: "ring-fuchsia-400", badge: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300" },
  { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-300", ring: "ring-teal-400", badge: "bg-teal-100 text-teal-800 border-teal-300" },
  { bg: "bg-pink-50", text: "text-pink-800", border: "border-pink-300", ring: "ring-pink-400", badge: "bg-pink-100 text-pink-800 border-pink-300" },
];

// Lab classes get a special teal style with dashed border
const LAB_PALETTE = { bg: "bg-teal-50", text: "text-teal-900", border: "border-teal-400 border-dashed", ring: "ring-teal-500", badge: "bg-teal-100 text-teal-900 border-teal-400" };

function isLab(subject: string): boolean {
  return /lab|laboratory|practical/i.test(subject);
}

const TimetableView = ({
  timetable, setTimetable, classes, teachers, timeSlots, setTimeSlots,
  selectedClassId, setSelectedClassId,
  collegeName, setCollegeName, department, setDepartment, semester, setSemester,
  role,
}: Props) => {
  const isTeacher = role === "teacher" || role == null; // null = unknown, default to full access
  const [viewMode, setViewMode] = useState<"class" | "teacher" | "day">("class");
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.id || "");
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [searchSubject, setSearchSubject] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("all");
  const printRef = useRef<HTMLDivElement>(null);

  // Slot edit dialog state
  const [editTarget, setEditTarget] = useState<{ day: string; period: number; classId: string } | null>(null);

  // Drag-and-drop state
  const dragSource = useRef<{ day: string; period: number; classId: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ day: string; period: number; classId: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Color Maps ────────────────────────────────────────────────────────────
  const allSubjects = [...new Set(timetable.map((s) => s.subject))];
  const paletteMap: Record<string, typeof SUBJECT_PALETTES[0]> = {};
  allSubjects.forEach((s, i) => {
    paletteMap[s] = isLab(s) ? LAB_PALETTE : SUBJECT_PALETTES[i % SUBJECT_PALETTES.length];
  });

  // ── Filtering helpers ─────────────────────────────────────────────────────
  const matchesSearch = (slot: TimetableSlot) => {
    const q = searchSubject.trim().toLowerCase();
    if (!q) return true;
    return slot.subject.toLowerCase().includes(q);
  };
  const matchesTeacher = (slot: TimetableSlot) => {
    if (filterTeacherId === "all") return true;
    return slot.teacherId === filterTeacherId;
  };
  const isHighlighted = (slot: TimetableSlot | undefined) => {
    if (!slot) return false;
    return matchesSearch(slot) && matchesTeacher(slot);
  };
  const isFiltering = searchSubject.trim() !== "" || filterTeacherId !== "all";


  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleCellClick = (day: string, period: number, classId: string) => {
    if (isDragging) return;
    setEditTarget({ day, period, classId });
  };

  const handleDragStart = (e: React.DragEvent, cell: { day: string; period: number; classId: string }) => {
    dragSource.current = cell;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    const ghost = document.createElement("div");
    ghost.style.position = "absolute";
    ghost.style.top = "-9999px";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragOver = (e: React.DragEvent, cell: { day: string; period: number; classId: string }) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(cell);
  };

  const handleDrop = (e: React.DragEvent, target: { day: string; period: number; classId: string }) => {
    e.preventDefault();
    const src = dragSource.current;
    if (!src || (src.day === target.day && src.period === target.period)) {
      cleanupDrag(); return;
    }
    const srcSlot = timetable.find(s => s.day === src.day && s.period === src.period && s.classId === src.classId);
    const tgtSlot = timetable.find(s => s.day === target.day && s.period === target.period && s.classId === target.classId);
    if (!srcSlot) { cleanupDrag(); return; }

    // ── Lab drag: move both halves together ───────────────────────────────
    if (srcSlot.isLab) {
      // Find the partner (other half of the 2-period block)
      const partner = timetable.find(
        s => s.classId === srcSlot.classId && s.day === srcSlot.day &&
          s.subject === srcSlot.subject && s.isLab && s.period !== srcSlot.period
      );
      const offset = partner ? partner.period - srcSlot.period : 1;
      const newP1 = target.period;
      const newP2 = target.period + offset;

      // Check both target periods are free for this class (except the source slots)
      const srcPeriods = new Set([srcSlot.period, partner?.period].filter(Boolean) as number[]);
      const conflict = timetable.some(s =>
        s.classId === src.classId && s.day === target.day &&
        (s.period === newP1 || s.period === newP2) &&
        !srcPeriods.has(s.period)
      );
      if (conflict) { cleanupDrag(); return; }

      setTimetable(timetable.map(s => {
        if (s.classId === src.classId && s.day === src.day && s.subject === srcSlot.subject && s.isLab) {
          const isFirst = s.period === Math.min(srcSlot.period, partner?.period ?? srcSlot.period);
          return { ...s, day: target.day, period: isFirst ? Math.min(newP1, newP2) : Math.max(newP1, newP2) };
        }
        return s;
      }));
      cleanupDrag();
      return;
    }

    // ── Regular slot drag ─────────────────────────────────────────────────
    const srcConflict = timetable.some(s => s.teacherId === srcSlot.teacherId && s.day === target.day && s.period === target.period && s.classId !== target.classId);
    const tgtConflict = tgtSlot && timetable.some(s => s.teacherId === tgtSlot.teacherId && s.day === src.day && s.period === src.period && s.classId !== src.classId);
    if (srcConflict || tgtConflict) { cleanupDrag(); return; }
    setTimetable(timetable.map(s => {
      if (s.day === src.day && s.period === src.period && s.classId === src.classId) return { ...s, day: target.day, period: target.period };
      if (tgtSlot && s.day === target.day && s.period === target.period && s.classId === target.classId) return { ...s, day: src.day, period: src.period };
      return s;
    }));
    cleanupDrag();
  };

  const cleanupDrag = () => {
    dragSource.current = null;
    setDropTarget(null);
    setTimeout(() => setIsDragging(false), 100);
  };

  // Helper: find lunch break period number (teaching period that immediately precedes lunch)
  const getLunchAdjacentPeriod = (slots: TimeSlot[]): number | null => {
    let periodIdx = 0;
    let lastTeachingPeriod: number | null = null;
    for (const ts of slots) {
      if (ts.isBreak) {
        if (ts.breakLabel === "LUNCH" && lastTeachingPeriod !== null) {
          return lastTeachingPeriod;
        }
      } else {
        periodIdx++;
        lastTeachingPeriod = periodIdx;
      }
    }
    return null;
  };

  // Shift lunch break to start at 11:30 when a lab occupies the adjacent slot
  const shiftLunchIfNeeded = (newTimetable: TimetableSlot[]) => {
    const lunchAdj = getLunchAdjacentPeriod(timeSlots);
    if (lunchAdj === null) return;
    const labAtLunch = newTimetable.some(s => s.period === lunchAdj && s.isLab);
    if (!labAtLunch) return;
    // Only shift if lunch startTime is NOT already 11:30
    const updatedSlots = timeSlots.map(ts => {
      if (ts.isBreak && ts.breakLabel === "LUNCH" && ts.startTime !== "11:30") {
        return { ...ts, startTime: "11:30", endTime: "12:30" };
      }
      return ts;
    });
    setTimeSlots(updatedSlots);
  };

  const handleSlotSave = (updated: TimetableSlot | null) => {
    if (!editTarget) return;
    const filtered = timetable.filter(s => !(s.day === editTarget.day && s.period === editTarget.period && s.classId === editTarget.classId));
    const newTimetable = updated ? [...filtered, updated] : filtered;
    setTimetable(newTimetable);
    shiftLunchIfNeeded(newTimetable);
    setEditTarget(null);
  };

  // Save a 2-period lab block (removes any existing slots at both periods for this class)
  const handleSlotSaveLab = (first: TimetableSlot, second: TimetableSlot) => {
    const filtered = timetable.filter(
      s => !(
        s.classId === first.classId &&
        s.day === first.day &&
        (s.period === first.period || s.period === second.period)
      )
    );
    const newTimetable = [...filtered, first, second];
    setTimetable(newTimetable);
    shiftLunchIfNeeded(newTimetable);
    setEditTarget(null);
  };

  const getExistingSlot = () => {
    if (!editTarget) return null;
    return timetable.find(s => s.day === editTarget.day && s.period === editTarget.period && s.classId === editTarget.classId) || null;
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Timetable</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: center; font-size: 11px; }
        th { background: #1e3a5f; color: white; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .break-cell { background: #f3f4f6; }
        .free-cell { background: #f9fafb; color: #9ca3af; }
        .subject-cell { font-weight: bold; }
        .sub-text { font-size: 9px; color: #666; margin-top: 2px; }
        h2 { margin-bottom: 4px; font-size: 18px; }
        h3 { margin: 16px 0 8px; font-size: 14px; }
        p { font-size: 12px; color: #555; margin-bottom: 8px; }
        .college-header { text-align: center; margin-bottom: 16px; }
        .college-header h1 { font-size: 22px; font-weight: bold; margin: 0; }
        .college-header .dept { font-size: 14px; color: #333; margin: 2px 0; }
        .college-header .sem { font-size: 12px; color: #666; }
        @media print { body { padding: 10px; } }
      </style></head><body>`);
    if (collegeName || department || semester) {
      printWindow.document.write(`<div class="college-header">`);
      if (collegeName) printWindow.document.write(`<h1>${collegeName}</h1>`);
      if (department) printWindow.document.write(`<p class="dept">${department}</p>`);
      if (semester) printWindow.document.write(`<p class="sem">${semester}</p>`);
      printWindow.document.write(`</div>`);
    }
    const currentView = viewMode === "class" ? renderPrintClassView() : renderPrintTeacherView();
    printWindow.document.write(currentView);
    printWindow.document.write(`<h3>Faculty Details</h3><table><thead><tr><th>S.No</th><th>Faculty Name</th><th>Subject</th><th>Contact</th></tr></thead><tbody>`);
    teachers.forEach((t, i) => {
      printWindow.document.write(`<tr><td>${i + 1}</td><td>${t.name}</td><td>${t.subject}</td><td>${t.phone || "—"}</td></tr>`);
    });
    printWindow.document.write(`</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  // ── Column builder ────────────────────────────────────────────────────────
  let periodIdx = 0;
  const columns = timeSlots.map((ts) => {
    if (ts.isBreak) return { type: "break" as const, slot: ts, periodNum: undefined as number | undefined };
    periodIdx++;
    return { type: "period" as const, slot: ts, periodNum: periodIdx };
  });

  // Map break columns to a "virtual" period number for lunch-hour lab placement.
  // We assign break columns a periodNum = the next teaching period's number - 0.5 (conceptually),
  // but for drag-drop we use a special negative sentinel: -(breakIndex).
  // Actually simpler: give each break column a unique negative periodNum so drops work.
  let breakIdx = 0;
  const columnsWithBreakPeriods = columns.map(col => {
    if (col.type === "break") {
      breakIdx--;
      return { ...col, periodNum: breakIdx };
    }
    return col;
  });

  // ── Print helpers ─────────────────────────────────────────────────────────
  const renderPrintTableHeader = () =>
    `<tr>${["Day", ...columnsWithBreakPeriods.map(col => col.type === "break"
      ? `${col.slot.breakLabel}<br/><span style="font-size:9px">${col.slot.startTime}-${col.slot.endTime}</span>`
      : `${col.slot.startTime}<br/><span style="font-size:9px">to ${col.slot.endTime}</span>`)
    ].map(h => `<th>${h}</th>`).join("")}</tr>`;

  const renderPrintClassView = () => {
    const cls = classes.find(c => c.id === selectedClassId);
    const classSlots = timetable.filter(s => s.classId === selectedClassId);
    let html = `<h2>Class Timetable — ${cls?.name || ""}</h2><p>Room: ${cls?.room || ""}</p><table><thead>${renderPrintTableHeader()}</thead><tbody>`;
    DAYS.forEach(day => {
      html += `<tr><td style="font-weight:bold;text-align:left">${day}</td>`;
      columnsWithBreakPeriods.forEach(col => {
        if (col.type === "break") { html += `<td class="break-cell">☕</td>`; return; }
        const slot = classSlots.find(s => s.day === day && s.period === col.periodNum);
        const teacher = slot ? teachers.find(t => t.id === slot.teacherId) : null;
        html += slot ? `<td class="subject-cell">${slot.subject}<div class="sub-text">${teacher?.name || ""}</div></td>` : `<td class="free-cell">Free Period</td>`;
      });
      html += `</tr>`;
    });
    return html + `</tbody></table>`;
  };

  const renderPrintTeacherView = () => {
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    const teacherSlots = timetable.filter(s => s.teacherId === selectedTeacherId);
    let html = `<h2>Teacher Schedule — ${teacher?.name || ""}</h2><p>Subject: ${teacher?.subject || ""} | ${teacherSlots.length} periods/week</p><table><thead>${renderPrintTableHeader()}</thead><tbody>`;
    DAYS.forEach(day => {
      html += `<tr><td style="font-weight:bold;text-align:left">${day}</td>`;
      columnsWithBreakPeriods.forEach(col => {
        if (col.type === "break") { html += `<td class="break-cell">☕</td>`; return; }
        const slot = teacherSlots.find(s => s.day === day && s.period === col.periodNum);
        const cls = slot ? classes.find(c => c.id === slot.classId) : null;
        html += slot ? `<td class="subject-cell">${slot.subject}<div class="sub-text">${cls?.name} · Room ${slot.room}</div></td>` : `<td class="free-cell">Free</td>`;
      });
      html += `</tr>`;
    });
    return html + `</tbody></table>`;
  };

  // ── Shared table header ───────────────────────────────────────────────────
  const renderTableHeader = () => (
    <thead>
      <tr className="gradient-primary text-primary-foreground">
        <th className="px-3 py-3 border border-border/30 text-left font-bold text-xs uppercase tracking-wider min-w-[90px]">Day</th>
        {columnsWithBreakPeriods.map((col, i) =>
          col.type === "break" ? (
            <th key={`break-${i}`} className="px-2 py-3 border border-border/30 text-center min-w-[60px] bg-foreground/10">
              <div className="text-[10px] font-bold uppercase">{col.slot.breakLabel}</div>
              <div className="text-[9px] opacity-80">{col.slot.startTime}-{col.slot.endTime}</div>
            </th>
          ) : (
            <th key={`p-${i}`} className="px-2 py-3 border border-border/30 text-center min-w-[110px]">
              <div className="text-xs font-bold">{col.slot.startTime}</div>
              <div className="text-[10px] opacity-80">to {col.slot.endTime}</div>
            </th>
          )
        )}
      </tr>
    </thead>
  );

  // ── Slot cell renderer (shared) ───────────────────────────────────────────
  const renderSlotCell = (
    slot: TimetableSlot | undefined,
    cell: { day: string; period: number; classId: string },
    subLabel: string,
    draggable?: boolean,
  ) => {
    const palette = slot ? (slot.isLab ? LAB_PALETTE : paletteMap[slot.subject]) : null;
    const lab = slot?.isLab || (slot ? isLab(slot.subject) : false);
    const highlighted = slot ? isHighlighted(slot) : false;
    const dimmed = isFiltering && slot && !highlighted;
    const isTarget = dropTarget?.day === cell.day && dropTarget?.period === cell.period && dropTarget?.classId === cell.classId;
    const isSource = dragSource.current?.day === cell.day && dragSource.current?.period === cell.period && dragSource.current?.classId === cell.classId;

    // Red indicator: cell is occupied AND something is being dragged onto it
    const isOccupiedDropTarget = isTarget && !!slot && !isSource;

    // For lab slots with multiple teachers
    const labTeacherNames = slot?.isLab && slot.teacherIds
      ? slot.teacherIds.map(id => teachers.find(t => t.id === id)?.name || id)
      : null;

    return (
      <td
        key={`${cell.day}-${cell.period}-${cell.classId}`}
        className={`px-1.5 py-1.5 border border-border text-center group transition-all relative
          ${isOccupiedDropTarget ? "bg-red-50 ring-2 ring-red-400 ring-inset" : isTarget ? "bg-primary/10 ring-2 ring-primary/50 ring-inset" : ""}`}
        onDragOver={(e) => handleDragOver(e, cell)}
        onDragLeave={() => setDropTarget(null)}
        onDrop={(e) => handleDrop(e, cell)}
        onClick={() => handleCellClick(cell.day, cell.period, cell.classId)}
      >
        {/* Red "occupied" badge shown when dragging over a filled cell */}
        {isOccupiedDropTarget && (
          <span className="absolute top-0.5 right-0.5 z-10 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
        )}
        {slot && palette ? (
          <div
            draggable={draggable}
            onDragStart={draggable ? (e) => handleDragStart(e, cell) : undefined}
            onDragEnd={draggable ? cleanupDrag : undefined}
            className={`rounded-lg px-2 py-2 border-2 transition-all relative select-none
              ${palette.bg} ${palette.text} ${palette.border}
              ${dimmed ? "opacity-30 saturate-0" : ""}
              ${isSource ? "opacity-40 scale-95" : ""}
              ${isFiltering && highlighted ? `ring-2 ${palette.ring} shadow-sm` : ""}
              ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
              ${!dimmed ? `group-hover:ring-2 ${palette.ring} group-hover:shadow-sm` : ""}
            `}
          >
            {/* Lab badge */}
            {lab && (
              <span className="absolute -top-1.5 -right-1.5 bg-teal-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full leading-none flex items-center gap-0.5">
                LAB{slot.isLab ? ` ${slot.labBlock === "first" ? "1" : "2"}/2` : ""}
              </span>
            )}
            {slot.isLab && (
              <span className="absolute -top-1.5 -left-1.5 bg-teal-600 text-white text-[8px] font-bold px-1 py-0.5 rounded-full leading-none">2hr</span>
            )}
            <p className="font-bold text-xs leading-tight truncate">{slot.subject}</p>
            {/* Multi-teacher display for labs */}
            {labTeacherNames ? (
              <div className="mt-0.5">
                {labTeacherNames.map((name, i) => (
                  <p key={i} className="text-[9px] opacity-75 leading-tight truncate flex items-center gap-0.5">
                    <Users className="w-2 h-2 shrink-0" /> {name}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[10px] opacity-70 mt-0.5 truncate">{subLabel}</p>
            )}
            {draggable && <span className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-60 transition-opacity text-[10px]">⠿</span>}
          </div>
        ) : (
          <div className={`rounded-lg px-2 py-2 bg-muted/40 border border-dashed transition-all
            ${isTarget ? "border-primary bg-primary/10" : "border-border/70 group-hover:border-primary/40 group-hover:bg-primary/5 cursor-pointer"}
          `}>
            <p className={`text-xs font-medium transition-colors ${isTarget ? "text-primary" : "text-muted-foreground/60 group-hover:text-primary"}`}>
              {isTarget ? "Drop here" : "+ Add"}
            </p>
          </div>
        )}
      </td>
    );
  };

  // ── Class-wise view ───────────────────────────────────────────────────────
  const renderClassView = () => {
    const classSlots = timetable.filter(s => s.classId === selectedClassId);
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const getSlot = (day: string, period: number) => classSlots.find(s => s.day === day && s.period === period);

    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">📅 Class Timetable</h2>
            {selectedClass && (
              <p className="text-sm text-muted-foreground mt-1">
                Section: <strong>{selectedClass.name}</strong> | Room: <strong>{selectedClass.room}</strong>
              </p>
            )}
          </div>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-input bg-background text-foreground font-medium text-sm min-w-[180px]"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} (Room {c.room})</option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1.5">
          ⠿ <span>Drag slots to move or swap · Click to edit / reassign</span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-border">
            {renderTableHeader()}
            <tbody>
              {DAYS.map((day, dayIdx) => (
                <tr key={day} className={dayIdx % 2 === 0 ? "bg-card" : "bg-secondary/30"}>
                  <td className="px-3 py-3 font-bold text-foreground border border-border text-sm">{day}</td>
                  {columnsWithBreakPeriods.map((col, i) => {
                    if (col.type === "break") {
                      const breakCell = { day, period: col.periodNum!, classId: selectedClassId };
                      const isBreakTarget = dropTarget?.day === day && dropTarget?.period === col.periodNum && dropTarget?.classId === selectedClassId;
                      return (
                        <td
                          key={`${day}-break-${i}`}
                          className={`px-1 py-3 border border-border text-center transition-all ${isBreakTarget ? "bg-teal-100 ring-2 ring-teal-400 ring-inset" : "bg-muted/50"}`}
                          onDragOver={(e) => { e.preventDefault(); setDropTarget(breakCell); }}
                          onDragLeave={() => setDropTarget(null)}
                          onDrop={(e) => handleDrop(e, breakCell)}
                        >
                          <span className="text-lg">☕</span>
                          {isBreakTarget && <div className="text-[9px] text-teal-700 font-bold mt-0.5">Drop lab here</div>}
                        </td>
                      );
                    }
                    const slot = getSlot(day, col.periodNum!);
                    const teacher = slot ? teachers.find(t => t.id === slot.teacherId) : null;
                    return renderSlotCell(slot, { day, period: col.periodNum!, classId: selectedClassId }, teacher?.name || "", true);
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── Teacher-wise view ─────────────────────────────────────────────────────
  const renderTeacherView = () => {
    const teacherSlots = timetable.filter(s => s.teacherId === selectedTeacherId);
    const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
    const getSlot = (day: string, period: number) => teacherSlots.find(s => s.day === day && s.period === period);
    const totalPeriods = teacherSlots.length;
    const classesHandled = new Set(teacherSlots.map(s => s.classId)).size;

    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">👨‍🏫 Teacher Schedule</h2>
            {selectedTeacher && (
              <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                <p>Faculty: <strong>{selectedTeacher.name}</strong> | Subject: <strong>{selectedTeacher.subject}</strong></p>
                <p>{totalPeriods} periods/week · {classesHandled} section{classesHandled !== 1 ? "s" : ""}</p>
              </div>
            )}
          </div>
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-input bg-background text-foreground font-medium text-sm min-w-[180px]"
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1">✏️ <span>Click any cell to edit or reassign a slot</span></p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-border">
            {renderTableHeader()}
            <tbody>
              {DAYS.map((day, dayIdx) => (
                <tr key={day} className={dayIdx % 2 === 0 ? "bg-card" : "bg-secondary/30"}>
                  <td className="px-3 py-3 font-bold text-foreground border border-border text-sm">{day}</td>
                  {columnsWithBreakPeriods.map((col, i) => {
                    if (col.type === "break") {
                      return <td key={`${day}-break-${i}`} className="px-1 py-3 border border-border bg-muted/50 text-center"><span className="text-lg">☕</span></td>;
                    }
                    const slot = getSlot(day, col.periodNum!);
                    const cls = slot ? classes.find(c => c.id === slot.classId) : null;
                    const cellClassId = slot?.classId || selectedClassId;
                    return renderSlotCell(slot, { day, period: col.periodNum!, classId: cellClassId }, cls ? `${cls.name} · Room ${slot!.room}` : "");
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── Day-wise view ─────────────────────────────────────────────────────────
  const renderDayView = () => {
    const daySlots = timetable.filter(s => s.day === selectedDay);

    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">🗓️ Day-wise View</h2>
            <p className="text-sm text-muted-foreground mt-1">{daySlots.length} periods scheduled on <strong>{selectedDay}</strong></p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedDay === d
                  ? "gradient-primary text-primary-foreground border-transparent shadow-md"
                  : "bg-secondary text-secondary-foreground border-border hover:opacity-80"
                  }`}
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Period cards grid */}
        <div className="grid grid-cols-1 gap-3">
          {columns.map((col, i) => {
            if (col.type === "break") {
              return (
                <div key={`break-${i}`} className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-xl border border-dashed border-border">
                  <span className="text-base">☕</span>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{col.slot.breakLabel}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{col.slot.startTime} – {col.slot.endTime}</span>
                </div>
              );
            }
            const periodSlots = daySlots.filter(s => s.period === col.periodNum);

            return (
              <div key={`period-${i}`} className="border border-border rounded-xl overflow-hidden">
                {/* Period header */}
                <div className="bg-secondary/60 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Period {col.periodNum}</span>
                  <span className="text-xs text-muted-foreground">{col.slot.startTime} – {col.slot.endTime}</span>
                </div>
                {/* Class cards */}
                {periodSlots.length > 0 ? (
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {periodSlots.map(slot => {
                      const palette = slot.isLab ? LAB_PALETTE : paletteMap[slot.subject];
                      const lab = slot.isLab || isLab(slot.subject);
                      const highlighted = isHighlighted(slot);
                      const dimmed = isFiltering && !highlighted;
                      const teacher = teachers.find(t => t.id === slot.teacherId);
                      const cls = classes.find(c => c.id === slot.classId);
                      // All lab teachers
                      const labTeacherNames = slot.isLab && slot.teacherIds
                        ? slot.teacherIds.map(id => teachers.find(t => t.id === id)?.name || id)
                        : null;
                      return (
                        <div
                          key={`${slot.classId}-${slot.period}`}
                          className={`rounded-lg px-3 py-3 border-2 relative transition-all
                            ${palette?.bg} ${palette?.text} ${palette?.border}
                            ${dimmed ? "opacity-30 saturate-0" : ""}
                            ${isFiltering && highlighted ? `ring-2 ${palette?.ring} shadow-sm` : ""}
                          `}
                        >
                          {lab && (
                            <span className="absolute -top-2 -right-2 bg-teal-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                              {slot.isLab ? `LAB ${slot.labBlock === "first" ? "1" : "2"}/2` : "LAB"}
                            </span>
                          )}
                          {slot.isLab && (
                            <span className="absolute -top-2 -left-2 bg-teal-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none">2hr</span>
                          )}
                          <p className="font-bold text-sm leading-tight">{slot.subject}</p>
                          {labTeacherNames ? (
                            <div className="mt-1 space-y-0.5">
                              {labTeacherNames.map((name, i) => (
                                <p key={i} className="text-xs opacity-75 flex items-center gap-1">
                                  <Users className="w-3 h-3 shrink-0" /> {name}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs opacity-75 mt-1">👤 {teacher?.name || "—"}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] font-medium opacity-70">🏫 {cls?.name}</span>
                            <span className="text-[10px] opacity-60">Room {slot.room}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">No classes scheduled</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in" ref={printRef}>

      {/* College Info Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> College / Institution Name
            </label>
            <input type="text" value={collegeName} onChange={(e) => setCollegeName(e.target.value)}
              placeholder="e.g. St. Xavier's College of Engineering"
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground font-semibold text-sm placeholder:text-muted-foreground/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Department
            </label>
            <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science & Engineering"
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground font-semibold text-sm placeholder:text-muted-foreground/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Semester / Year
            </label>
            <input type="text" value={semester} onChange={(e) => setSemester(e.target.value)}
              placeholder="e.g. IV Semester — 2025-26"
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground font-semibold text-sm placeholder:text-muted-foreground/50" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Subject search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
              placeholder="Search by subject name…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {searchSubject && (
              <button onClick={() => setSearchSubject("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Teacher filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={filterTeacherId}
              onChange={(e) => setFilterTeacherId(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm min-w-[200px] focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
            >
              <option value="all">All Teachers</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>
              ))}
            </select>
          </div>

          {/* Clear filters */}
          {isFiltering && (
            <button
              onClick={() => { setSearchSubject(""); setFilterTeacherId("all"); }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-all border border-destructive/20"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}

          {isFiltering && (
            <span className="text-xs text-muted-foreground bg-secondary px-3 py-2 rounded-xl border border-border whitespace-nowrap">
              {timetable.filter(s => matchesSearch(s) && matchesTeacher(s)).length} slots matched
            </span>
          )}
        </div>
      </div>

      {/* View Mode Tabs + Print */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(["class", "teacher", "day"] as const)
            .filter(mode => mode !== "teacher" || isTeacher)
            .map(mode => {
              const labels: Record<"class" | "teacher" | "day", string> = { class: "📅 Class-wise", teacher: "👨‍🏫 Teacher-wise", day: "🗓️ Day-wise" };
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${viewMode === mode
                    ? "gradient-primary text-primary-foreground shadow-lg"
                    : "bg-secondary text-secondary-foreground hover:opacity-80"
                    }`}
                >
                  {labels[mode]}
                </button>
              );
            })}
          {!isTeacher && (
            <span className="text-xs px-3 py-2 rounded-xl bg-secondary text-muted-foreground border border-border">
              👨‍🏫 Teacher-wise view is for teachers only
            </span>
          )}
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-accent text-accent-foreground hover:opacity-90 transition-all shadow-md"
        >
          <Printer className="w-4 h-4" />
          Print / Export PDF
        </button>
      </div>

      {/* Selected View */}
      {viewMode === "class" && renderClassView()}
      {viewMode === "teacher" && renderTeacherView()}
      {viewMode === "day" && renderDayView()}

      {/* Legend */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Color Legend</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {allSubjects.map((s) => {
            const p = paletteMap[s];
            const lab = isLab(s);
            return (
              <span key={s} className={`text-xs px-3 py-1.5 rounded-full border-2 font-semibold flex items-center gap-1.5 ${p?.badge}`}>
                {lab ? <FlaskConical className="w-3 h-3" /> : <BookOpenCheck className="w-3 h-3" />}
                {s}
                {lab && <span className="text-[9px] font-bold bg-teal-500/20 px-1 rounded">LAB</span>}
              </span>
            );
          })}
          <span className="text-xs px-3 py-1.5 rounded-full border-2 border-dashed border-border bg-muted/40 text-muted-foreground font-medium">Free Period</span>
        </div>
      </div>

      {/* Faculty Details Table */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">👨‍🏫 Faculty Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-border">
            <thead>
              <tr className="bg-secondary">
                {["S.No", "Faculty Name", "Subject", "Contact Number"].map(h => (
                  <th key={h} className="px-4 py-2.5 border border-border text-left font-bold text-xs uppercase tracking-wider text-secondary-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachers.map((t, i) => {
                const p = paletteMap[t.subject];
                return (
                  <tr key={t.id} className={i % 2 === 0 ? "bg-card" : "bg-secondary/30"}>
                    <td className="px-4 py-2.5 border border-border text-foreground">{i + 1}</td>
                    <td className="px-4 py-2.5 border border-border text-foreground font-medium">{t.name}</td>
                    <td className="px-4 py-2.5 border border-border">
                      <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${p?.badge || "bg-muted text-muted-foreground border-border"}`}>
                        {t.subject}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 border border-border text-foreground">{t.phone || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slot Edit Dialog */}
      <SlotEditDialog
        slot={editTarget}
        existingSlot={getExistingSlot()}
        teachers={teachers}
        classes={classes}
        timetable={timetable}
        timeSlots={timeSlots}
        onSave={handleSlotSave}
        onSaveLab={handleSlotSaveLab}
        onClose={() => setEditTarget(null)}
      />
    </div>
  );
};

export default TimetableView;
