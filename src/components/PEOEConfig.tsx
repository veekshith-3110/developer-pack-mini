import { useState } from "react";
import { Teacher, ClassSection, GlobalFixedSubject, GlobalFixedSlot, DAYS } from "@/types/timetable";
import { Plus, Trash2, Activity, BookMarked, X, BookOpen } from "lucide-react";

interface Props {
  teachers: Teacher[];
  classes: ClassSection[];
  fixedSubjects: GlobalFixedSubject[];
  setFixedSubjects: (s: GlobalFixedSubject[]) => void;
  totalPeriods: number;
}

const PRESET_NAMES = ["PE 3", "PE 4", "OE"];
const COLORS: Record<string, { bg: string; border: string; text: string; btn: string }> = {
  "PE 3":  { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-700/40", text: "text-orange-800 dark:text-orange-300", btn: "bg-orange-500 hover:bg-orange-600" },
  "PE 4":  { bg: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-200 dark:border-amber-700/40",   text: "text-amber-800 dark:text-amber-300",   btn: "bg-amber-500 hover:bg-amber-600" },
  "OE":    { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-700/40", text: "text-purple-800 dark:text-purple-300", btn: "bg-purple-500 hover:bg-purple-600" },
};
const DEFAULT_COLOR = { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-700/40", text: "text-blue-800 dark:text-blue-300", btn: "bg-blue-500 hover:bg-blue-600" };
const getColor = (name: string) => COLORS[name] || DEFAULT_COLOR;

const PEOEConfig = ({ teachers, classes, fixedSubjects, setFixedSubjects, totalPeriods }: Props) => {
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(fixedSubjects[0]?.id || null);
  const [newSubjectName, setNewSubjectName] = useState("");

  // New slot form
  const [newSlotDay, setNewSlotDay] = useState(DAYS[0]);
  const [newSlotPeriod, setNewSlotPeriod] = useState(1);

  // New teacher assignment form
  const [assignClassId, setAssignClassId] = useState("");
  const [assignTeacherId, setAssignTeacherId] = useState("");

  const periods = Array.from({ length: totalPeriods }, (_, i) => i + 1);
  const activeSubject = fixedSubjects.find(s => s.id === activeSubjectId) || null;

  const updateSubject = (updated: GlobalFixedSubject) => {
    setFixedSubjects(fixedSubjects.map(s => s.id === updated.id ? updated : s));
  };

  // Add a new fixed subject
  const handleAddSubject = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = Date.now().toString();
    const newSubject: GlobalFixedSubject = { id, name: trimmed, slots: [], sectionTeachers: {} };
    setFixedSubjects([...fixedSubjects, newSubject]);
    setActiveSubjectId(id);
    setNewSubjectName("");
  };

  // Remove a fixed subject
  const handleRemoveSubject = (id: string) => {
    const remaining = fixedSubjects.filter(s => s.id !== id);
    setFixedSubjects(remaining);
    if (activeSubjectId === id) setActiveSubjectId(remaining[0]?.id || null);
  };

  // Add a slot to the active subject
  const handleAddSlot = () => {
    if (!activeSubject) return;
    // Prevent duplicate
    if (activeSubject.slots.some(s => s.day === newSlotDay && s.period === newSlotPeriod)) return;
    updateSubject({ ...activeSubject, slots: [...activeSubject.slots, { day: newSlotDay, period: newSlotPeriod }] });
  };

  // Remove a slot
  const handleRemoveSlot = (slot: GlobalFixedSlot) => {
    if (!activeSubject) return;
    updateSubject({ ...activeSubject, slots: activeSubject.slots.filter(s => !(s.day === slot.day && s.period === slot.period)) });
  };

  // Assign teacher to a section
  const handleAssignTeacher = () => {
    if (!activeSubject || !assignClassId || !assignTeacherId) return;
    updateSubject({ ...activeSubject, sectionTeachers: { ...activeSubject.sectionTeachers, [assignClassId]: assignTeacherId } });
    setAssignClassId(""); setAssignTeacherId("");
  };

  // Remove teacher assignment
  const handleRemoveTeacher = (classId: string) => {
    if (!activeSubject) return;
    const updated = { ...activeSubject.sectionTeachers };
    delete updated[classId];
    updateSubject({ ...activeSubject, sectionTeachers: updated });
  };

  const getTeacher = (id: string) => teachers.find(t => t.id === id);
  const getClass = (id: string) => classes.find(c => c.id === id);

  const color = activeSubject ? getColor(activeSubject.name) : DEFAULT_COLOR;
  const sectionsWithoutTeacher = activeSubject
    ? classes.filter(c => !activeSubject.sectionTeachers[c.id])
    : [];

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
          <Activity size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Fixed Subjects (PE 3, PE 4, OE…)</h2>
          <p className="text-xs text-muted-foreground">Same day & period across ALL sections — each section has its own teacher</p>
        </div>
      </div>

      {/* Subject tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {fixedSubjects.map(s => {
          const c = getColor(s.name);
          return (
            <button
              key={s.id}
              onClick={() => setActiveSubjectId(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
                ${activeSubjectId === s.id ? `${c.btn} text-white border-transparent` : `bg-secondary text-muted-foreground border-border hover:bg-secondary/80`}`}
            >
              {s.name}
              <span
                onClick={e => { e.stopPropagation(); handleRemoveSubject(s.id); }}
                className="ml-0.5 opacity-60 hover:opacity-100"
              ><X size={10} /></span>
            </button>
          );
        })}

        {/* Add preset buttons */}
        {PRESET_NAMES.filter(n => !fixedSubjects.some(s => s.name === n)).map(n => (
          <button key={n} onClick={() => handleAddSubject(n)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-border text-muted-foreground hover:bg-secondary/60 transition-all">
            <Plus size={10} /> {n}
          </button>
        ))}

        {/* Custom subject */}
        <div className="flex items-center gap-1">
          <input
            value={newSubjectName}
            onChange={e => setNewSubjectName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddSubject(newSubjectName)}
            placeholder="Custom…"
            className="px-2 py-1.5 rounded-xl border border-input bg-background text-foreground text-xs w-24 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button onClick={() => handleAddSubject(newSubjectName)} disabled={!newSubjectName.trim()}
            className="px-2 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold disabled:opacity-40">
            <Plus size={12} />
          </button>
        </div>
      </div>

      {!activeSubject ? (
        <p className="text-sm text-muted-foreground text-center py-6">Add a subject above to configure it.</p>
      ) : (
        <div className={`rounded-xl p-4 border ${color.bg} ${color.border} space-y-5`}>
          <p className={`text-xs font-bold uppercase tracking-wider ${color.text}`}>{activeSubject.name}</p>

          {/* ── Slots config ── */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Fixed Slots (same for all sections)</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {activeSubject.slots.map((slot, i) => (
                <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-background border border-border rounded-lg text-xs font-medium">
                  {slot.day} · P{slot.period}
                  <button onClick={() => handleRemoveSlot(slot)} className="text-destructive hover:opacity-70 ml-0.5"><X size={10} /></button>
                </span>
              ))}
              {activeSubject.slots.length === 0 && <p className="text-xs text-muted-foreground">No slots added yet.</p>}
            </div>
            <div className="flex gap-2 items-end flex-wrap">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Day</label>
                <select value={newSlotDay} onChange={e => setNewSlotDay(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs">
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Period</label>
                <select value={newSlotPeriod} onChange={e => setNewSlotPeriod(Number(e.target.value))}
                  className="px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs">
                  {periods.map(p => <option key={p} value={p}>P{p}</option>)}
                </select>
              </div>
              <button onClick={handleAddSlot}
                className={`px-3 py-1.5 text-white rounded-lg text-xs font-bold flex items-center gap-1 ${color.btn}`}>
                <Plus size={12} /> Add Slot
              </button>
            </div>
          </div>

          {/* ── Teacher per section ── */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Teacher per Section</p>

            {/* Existing assignments */}
            {Object.entries(activeSubject.sectionTeachers).length > 0 && (
              <div className="space-y-1.5 mb-3">
                {Object.entries(activeSubject.sectionTeachers).map(([classId, teacherId]) => {
                  const cls = getClass(classId);
                  const t = getTeacher(teacherId);
                  return (
                    <div key={classId} className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-foreground">{cls?.name || classId}</span>
                        <span className="text-muted-foreground">→ {t?.name} ({t?.subject})</span>
                      </div>
                      <button onClick={() => handleRemoveTeacher(classId)} className="text-destructive hover:opacity-70 p-0.5">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add assignment */}
            <div className="flex gap-2 items-end flex-wrap">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Section</label>
                <select value={assignClassId} onChange={e => setAssignClassId(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs min-w-[120px]">
                  <option value="">Select section</option>
                  {sectionsWithoutTeacher.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  {classes.filter(c => activeSubject.sectionTeachers[c.id]).map(c => (
                    <option key={c.id} value={c.id}>✓ {c.name} (reassign)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Teacher</label>
                <select value={assignTeacherId} onChange={e => setAssignTeacherId(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs min-w-[140px]">
                  <option value="">Select teacher</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name} · {t.subject}</option>)}
                </select>
              </div>
              <button onClick={handleAssignTeacher} disabled={!assignClassId || !assignTeacherId}
                className={`px-3 py-1.5 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-40 ${color.btn}`}>
                <Plus size={12} /> Assign
              </button>
            </div>

            {sectionsWithoutTeacher.length > 0 && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠ {sectionsWithoutTeacher.length} section{sectionsWithoutTeacher.length > 1 ? "s" : ""} without teacher: {sectionsWithoutTeacher.map(c => c.name).join(", ")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PEOEConfig;
