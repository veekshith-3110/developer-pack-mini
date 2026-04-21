import { useState, useEffect } from "react";
import { TimetableSlot, Teacher, ClassSection, TimeSlot } from "@/types/timetable";
import { X, Pencil, Trash2, Save, AlertTriangle, FlaskConical, Users, BookOpen } from "lucide-react";

interface Props {
  slot: { day: string; period: number; classId: string } | null;
  existingSlot: TimetableSlot | null;
  teachers: Teacher[];
  classes: ClassSection[];
  timetable: TimetableSlot[];
  timeSlots: TimeSlot[];
  onSave: (updated: TimetableSlot | null) => void;
  onSaveLab: (first: TimetableSlot, second: TimetableSlot) => void;
  onClose: () => void;
}

type EditMode = "regular" | "lab";

const SlotEditDialog = ({ slot, existingSlot, teachers, classes, timetable, timeSlots, onSave, onSaveLab, onClose }: Props) => {
  const [editMode, setEditMode] = useState<EditMode>("regular");

  // Regular slot state
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [conflictWarning, setConflictWarning] = useState("");
  const [subjectConflict, setSubjectConflict] = useState<{ classNames: string[] } | null>(null);

  // Lab slot state
  const [labSubject, setLabSubject] = useState("");
  const [labTeacherIds, setLabTeacherIds] = useState<string[]>([]);
  const [labRoom, setLabRoom] = useState("");
  const [labCompanionPeriod, setLabCompanionPeriod] = useState<number | "">("");

  // Teaching periods list (non-break slots) + break slots for lab companion
  const teachingPeriods: { periodNum: number; label: string; isBreak?: boolean }[] = [];
  let pIdx = 0;
  for (const ts of timeSlots) {
    if (!ts.isBreak) {
      pIdx++;
      teachingPeriods.push({ periodNum: pIdx, label: `Period ${pIdx} (${ts.startTime}–${ts.endTime})` });
    } else {
      // Include break/lunch as a selectable companion so labs can span into lunch hour
      teachingPeriods.push({
        periodNum: -(teachingPeriods.length + 1), // negative sentinel
        label: `${ts.breakLabel || "Break"} (${ts.startTime}–${ts.endTime}) — lunch/break hour`,
        isBreak: true,
      });
    }
  }

  useEffect(() => {
    if (existingSlot?.isLab) {
      // Pre-fill lab edit fields
      setEditMode("lab");
      setLabSubject(existingSlot.subject);
      setLabTeacherIds(existingSlot.teacherIds || (existingSlot.teacherId ? [existingSlot.teacherId] : []));
      setLabRoom(existingSlot.room || "");
      // Find partner period
      const partner = timetable.find(
        s =>
          s.day === existingSlot.day &&
          s.classId === existingSlot.classId &&
          s.subject === existingSlot.subject &&
          s.isLab &&
          s.period !== existingSlot.period
      );
      if (partner) {
        setLabCompanionPeriod(partner.period);
      } else {
        // Default companion: current period + 1 if possible
        const currentPNum = slot?.period ?? existingSlot.period;
        const nextP = teachingPeriods.find(p => p.periodNum === currentPNum + 1);
        setLabCompanionPeriod(nextP ? nextP.periodNum : "");
      }
    } else {
      setEditMode("regular");
      setSelectedTeacherId(existingSlot?.teacherId || "");
      setLabSubject("");
      setLabTeacherIds([]);
      setLabRoom("");
      setLabCompanionPeriod("");
    }
    setConflictWarning("");
    setSubjectConflict(null);
  }, [existingSlot, slot]);

  if (!slot) return null;

  const cls = classes.find((c) => c.id === slot.classId);
  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  // ── Conflict helpers ───────────────────────────────────────────────────────
  const conflictingSubjectsAtSlot = new Set(
    timetable
      .filter(s => s.day === slot.day && s.period === slot.period && s.classId !== slot.classId)
      .map(s => s.subject.toLowerCase())
  );

  const subjectToConflictClasses = (subject: string): string[] =>
    timetable
      .filter(
        s => s.day === slot.day && s.period === slot.period && s.classId !== slot.classId &&
          s.subject.toLowerCase() === subject.toLowerCase()
      )
      .map(s => classes.find(c => c.id === s.classId)?.name || "another section");

  const checkTeacherConflict = (teacherId: string) => {
    if (!teacherId) return "";
    const conflict = timetable.find(
      s => s.teacherId === teacherId && s.day === slot.day && s.period === slot.period && s.classId !== slot.classId
    );
    if (conflict) {
      const cc = classes.find(c => c.id === conflict.classId);
      return `⚠️ This teacher already has ${conflict.subject} in ${cc?.name || "another class"} at this time.`;
    }
    return "";
  };

  const handleTeacherChange = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setConflictWarning(checkTeacherConflict(teacherId));
    if (teacherId) {
      const teacher = teachers.find(t => t.id === teacherId);
      if (teacher) {
        const cc = subjectToConflictClasses(teacher.subject);
        setSubjectConflict(cc.length > 0 ? { classNames: cc } : null);
      } else {
        setSubjectConflict(null);
      }
    } else {
      setSubjectConflict(null);
    }
  };

  const handleSaveRegular = () => {
    if (!selectedTeacherId || !selectedTeacher) return;
    onSave({
      day: slot.day,
      period: slot.period,
      classId: slot.classId,
      teacherId: selectedTeacher.id,
      subject: selectedTeacher.subject,
      room: cls?.room || "",
    });
  };

  const handleClear = () => onSave(null);

  // ── Lab save ───────────────────────────────────────────────────────────────
  const handleSaveLab = () => {
    if (!labSubject.trim() || labTeacherIds.length === 0 || labCompanionPeriod === "") return;
    const primaryTeacher = labTeacherIds[0];
    const room = labRoom.trim() || cls?.room || "Lab";

    const p1 = slot.period;
    const p2 = labCompanionPeriod as number;

    const [first, second]: [number, number] = p1 < p2 ? [p1, p2] : [p2, p1];

    const firstSlot: TimetableSlot = {
      day: slot.day,
      period: first,
      classId: slot.classId,
      teacherId: primaryTeacher,
      teacherIds: labTeacherIds,
      subject: labSubject.trim(),
      room,
      isLab: true,
      labBlock: "first",
    };
    const secondSlot: TimetableSlot = {
      day: slot.day,
      period: second,
      classId: slot.classId,
      teacherId: primaryTeacher,
      teacherIds: labTeacherIds,
      subject: labSubject.trim(),
      room,
      isLab: true,
      labBlock: "second",
    };
    onSaveLab(firstSlot, secondSlot);
  };

  const toggleLabTeacher = (tid: string) => {
    setLabTeacherIds(prev =>
      prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid]
    );
  };

  const canSaveLab = labSubject.trim().length > 0 && labTeacherIds.length > 0 && labCompanionPeriod !== "";

  // ── Mode toggle header ─────────────────────────────────────────────────────
  const renderModeToggle = () => (
    <div className="flex rounded-xl overflow-hidden border border-border mb-5 text-xs font-bold">
      <button
        onClick={() => setEditMode("regular")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-all ${editMode === "regular" ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
      >
        <BookOpen className="w-3.5 h-3.5" /> Regular
      </button>
      <button
        onClick={() => setEditMode("lab")}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-all ${editMode === "lab" ? "bg-teal-500 text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
      >
        <FlaskConical className="w-3.5 h-3.5" /> Lab (2-hr)
      </button>
    </div>
  );

  // ── Lab edit form ──────────────────────────────────────────────────────────
  const renderLabForm = () => (
    <>
      <div className="space-y-3 mb-4">
        {/* Lab Subject Name */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lab Subject Name</label>
          <input
            type="text"
            value={labSubject}
            onChange={e => setLabSubject(e.target.value)}
            placeholder="e.g. Physics Lab"
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        {/* Lab Room */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lab Room</label>
          <input
            type="text"
            value={labRoom}
            onChange={e => setLabRoom(e.target.value)}
            placeholder={cls?.room || "Lab Room"}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        {/* Companion Period */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            2nd Half Period (companion)
          </label>
          <select
            value={labCompanionPeriod}
            onChange={e => setLabCompanionPeriod(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="">— Select companion period —</option>
            {teachingPeriods
              .filter(p => p.periodNum !== slot.period)
              .map(p => (
                <option key={p.periodNum} value={p.periodNum}
                  style={p.isBreak ? { color: "#0d9488", fontStyle: "italic" } : undefined}>
                  {p.isBreak ? "☕ " : ""}{p.label}
                </option>
              ))}
          </select>
          <p className="text-[10px] text-muted-foreground">
            Current slot: Period {slot.period} · Companion forms the 2-hr lab block.
          </p>
          {labCompanionPeriod !== "" && Math.abs((labCompanionPeriod as number) - slot.period) !== 1 && (labCompanionPeriod as number) > 0 && (
            <p className="text-[10px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Periods are not adjacent — consider using consecutive periods.
            </p>
          )}
          {labCompanionPeriod !== "" && (labCompanionPeriod as number) < 0 && (
            <p className="text-[10px] text-teal-600 flex items-center gap-1">
              ☕ Lab will span into the lunch/break hour.
            </p>
          )}
        </div>

        {/* Teachers multi-select */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Lab Teachers (select one or more)
          </label>
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border max-h-44 overflow-y-auto">
            {teachers.map(t => (
              <label
                key={t.id}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer text-xs transition-colors ${labTeacherIds.includes(t.id) ? "bg-teal-50 dark:bg-teal-900/20" : "hover:bg-secondary/50"}`}
              >
                <input
                  type="checkbox"
                  checked={labTeacherIds.includes(t.id)}
                  onChange={() => toggleLabTeacher(t.id)}
                  className="accent-teal-500 w-3.5 h-3.5 shrink-0"
                />
                <span className="font-medium text-foreground">{t.name}</span>
                <span className="text-muted-foreground ml-auto">{t.subject}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Note about lunch shift */}
      <p className="text-[10px] text-muted-foreground mb-4 flex items-start gap-1 px-1">
        <span className="text-amber-500 shrink-0 mt-0.5">💡</span>
        If you place this lab in the period adjacent to the lunch break, lunch will be shifted to start at 11:30.
      </p>

      <div className="flex gap-2">
        <button
          onClick={handleSaveLab}
          disabled={!canSaveLab}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <FlaskConical className="w-3.5 h-3.5" /> Save Lab
        </button>
        {existingSlot?.isLab && (
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-destructive/10 text-destructive rounded-xl text-sm font-bold hover:bg-destructive/20 transition-all border border-destructive/20"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        )}
        <button
          onClick={onClose}
          className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-all"
        >
          Cancel
        </button>
      </div>
    </>
  );

  // ── Regular edit form ──────────────────────────────────────────────────────
  const renderRegularForm = () => (
    <>
      {existingSlot && !existingSlot.isLab && (
        <div className="mb-4 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{existingSlot.subject}</span>
          {" · "}
          {teachers.find(t => t.id === existingSlot.teacherId)?.name || "Unknown teacher"}
        </div>
      )}

      <div className="space-y-1.5 mb-4">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Assign Teacher / Subject
        </label>
        <select
          value={selectedTeacherId}
          onChange={e => handleTeacherChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">— Select teacher —</option>
          {teachers.map(t => {
            const hasSubjectConflict = conflictingSubjectsAtSlot.has(t.subject.toLowerCase());
            return (
              <option
                key={t.id}
                value={t.id}
                style={hasSubjectConflict ? { color: "#dc2626", fontWeight: "bold" } : undefined}
              >
                {hasSubjectConflict ? "🔴 " : ""}{t.name} · {t.subject}
                {hasSubjectConflict ? " (subject in another section)" : ""}
              </option>
            );
          })}
        </select>
        {conflictingSubjectsAtSlot.size > 0 && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            <span className="text-red-500 font-bold">🔴</span>
            Subject already scheduled in another section at this slot
          </p>
        )}
      </div>

      {subjectConflict && !conflictWarning && (
        <div className="mb-4 px-3 py-2.5 rounded-xl bg-red-50 border border-red-300 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" />
          <span>
            <span className="font-bold">{selectedTeacher?.subject}</span> is already scheduled in{" "}
            <span className="font-bold">{subjectConflict.classNames.join(", ")}</span> at this day &amp; period.
          </span>
        </div>
      )}

      {conflictWarning && (
        <div className="mb-4 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          {conflictWarning}
        </div>
      )}

      {cls && (
        <div className="mb-5 text-xs text-muted-foreground">
          Room: <span className="font-semibold text-foreground">{cls.room}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSaveRegular}
          disabled={!selectedTeacherId}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 gradient-primary text-primary-foreground rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all"
        >
          <Save className="w-3.5 h-3.5" /> Save
        </button>
        {existingSlot && !existingSlot.isLab && (
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-destructive/10 text-destructive rounded-xl text-sm font-bold hover:bg-destructive/20 transition-all border border-destructive/20"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        )}
        <button
          onClick={onClose}
          className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-all"
        >
          Cancel
        </button>
      </div>
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        className={`relative glass-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border-2 animate-fade-in ${editMode === "lab" ? "border-teal-300/50" : "border-border"}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${editMode === "lab" ? "bg-teal-500" : "gradient-primary"}`}>
              {editMode === "lab"
                ? <FlaskConical className="w-4 h-4 text-white" />
                : <Pencil className="w-4 h-4 text-primary-foreground" />}
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">
                {editMode === "lab" ? "Edit Lab Slot" : "Edit Slot"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {slot.day} · Period {slot.period} · {cls?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-secondary-foreground" />
          </button>
        </div>

        {/* Mode toggle (always visible) */}
        {renderModeToggle()}

        {/* Form content */}
        {editMode === "lab" ? renderLabForm() : renderRegularForm()}
      </div>
    </div>
  );
};

export default SlotEditDialog;
