import { useState } from "react";
import { Teacher, ClassSection, SubjectAssignment, LabAssignment } from "@/types/timetable";
import { Plus, Trash2, ClipboardList, AlertTriangle, FlaskConical, Users, DoorOpen, BookOpen } from "lucide-react";

interface Props {
  teachers: Teacher[];
  classes: ClassSection[];
  assignments: SubjectAssignment[];
  setAssignments: (a: SubjectAssignment[]) => void;
  labAssignments: LabAssignment[];
  setLabAssignments: (a: LabAssignment[]) => void;
}

type Tab = "theory" | "lab";

const AssignmentForm = ({
  teachers, classes,
  assignments, setAssignments,
  labAssignments, setLabAssignments,
}: Props) => {
  const [tab, setTab] = useState<Tab>("theory");

  // ── Theory state ──────────────────────────────────────────────────────────
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [periods, setPeriods] = useState(4);

  // ── Lab state ─────────────────────────────────────────────────────────────
  const [labClassId, setLabClassId] = useState("");
  const [labSubject, setLabSubject] = useState("");
  const [labRoom, setLabRoom] = useState("");
  const [sessionsPerWeek, setSessionsPerWeek] = useState(1);
  const [teacherCount, setTeacherCount] = useState(1);
  const [labTeacherIds, setLabTeacherIds] = useState<string[]>([""]);
  const [useLunchSlot, setUseLunchSlot] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getTeacher = (id: string) => teachers.find(t => t.id === id);
  const getClass = (id: string) => classes.find(c => c.id === id);

  // ── Theory helpers ────────────────────────────────────────────────────────
  // Teachers exclusively assigned to labs (not in any theory assignment)
  const labOnlyTeacherIds = new Set(
    labAssignments.flatMap(l => l.teacherIds).filter(tid =>
      !assignments.some(a => a.teacherId === tid)
    )
  );

  const teachersInSection = new Set(
    assignments.filter(a => a.classId === classId).map(a => a.teacherId)
  );
  const teachersInOtherSections = new Map<string, string[]>();
  for (const a of assignments) {
    if (a.classId === classId) continue;
    const cls = getClass(a.classId);
    if (!teachersInOtherSections.has(a.teacherId)) teachersInOtherSections.set(a.teacherId, []);
    teachersInOtherSections.get(a.teacherId)!.push(cls?.name || "another section");
  }
  const selectedTeacherAllocated = teacherId ? teachersInOtherSections.get(teacherId) : null;
  const sectionAssignments = classId ? assignments.filter(a => a.classId === classId) : assignments;

  const handleAddTheory = () => {
    if (!classId || !teacherId) return;
    setAssignments([...assignments, { id: Date.now().toString(), classId, teacherId, periodsPerWeek: periods }]);
    setTeacherId("");
    setPeriods(4);
  };

  // ── Lab helpers ───────────────────────────────────────────────────────────
  const handleTeacherCountChange = (count: number) => {
    const c = Math.max(1, Math.min(6, count));
    setTeacherCount(c);
    setLabTeacherIds(prev => {
      const updated = [...prev];
      while (updated.length < c) updated.push("");
      return updated.slice(0, c);
    });
  };

  const handleLabTeacherSelect = (idx: number, tid: string) => {
    setLabTeacherIds(prev => { const u = [...prev]; u[idx] = tid; return u; });
  };

  const handleAddLab = () => {
    if (!labClassId || !labSubject.trim()) return;
    const validIds = labTeacherIds.filter(Boolean);
    if (validIds.length === 0) return;
    setLabAssignments([...labAssignments, {
      id: Date.now().toString(),
      classId: labClassId,
      subjectName: labSubject.trim(),
      teacherIds: validIds,
      sessionsPerWeek,
      labRoom: labRoom.trim() || undefined,
      useLunchSlot,
    }]);
    setLabSubject(""); setLabRoom(""); setSessionsPerWeek(1);
    setTeacherCount(1); setLabTeacherIds([""]); setUseLunchSlot(false);
  };

  const canAddLab = labClassId && labSubject.trim() && labTeacherIds.some(Boolean);
  const sectionLabAssignments = labClassId
    ? labAssignments.filter(l => l.classId === labClassId)
    : labAssignments;

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-warning flex items-center justify-center">
          <ClipboardList size={16} className="text-warning-foreground" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Subject Assignments</h2>
      </div>

      {/* Tab toggle */}
      <div className="flex rounded-xl overflow-hidden border border-border mb-5 text-xs font-bold">
        <button
          onClick={() => setTab("theory")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-all ${tab === "theory" ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Theory
        </button>
        <button
          onClick={() => setTab("lab")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-all ${tab === "lab" ? "bg-teal-500 text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
        >
          <FlaskConical className="w-3.5 h-3.5" /> Lab (2-hr)
        </button>
      </div>

      {/* ── THEORY TAB ── */}
      {tab === "theory" && (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Assign teachers to sections with periods per week.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Section</label>
              <select value={classId} onChange={e => { setClassId(e.target.value); setTeacherId(""); }}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm">
                <option value="">Select section</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Teacher</label>
              <select value={teacherId} onChange={e => setTeacherId(e.target.value)} disabled={!classId}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm">
                <option value="">Select teacher</option>
                {teachers.map(t => {
                  const inSection = teachersInSection.has(t.id);
                  const elsewhere = teachersInOtherSections.get(t.id);
                  const labOnly = labOnlyTeacherIds.has(t.id);
                  return (
                    <option key={t.id} value={t.id} disabled={inSection || labOnly}
                      style={elsewhere ? { color: "#d97706", fontWeight: "bold" } : labOnly ? { color: "#6b7280" } : undefined}>
                      {inSection ? "✓ " : elsewhere ? "⚠ " : labOnly ? "🔬 " : ""}
                      {t.name} — {t.subject}
                      {inSection ? " (already here)" : ""}
                      {elsewhere ? ` (also in ${elsewhere.join(", ")})` : ""}
                      {labOnly ? " (lab teacher)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Periods/Week</label>
              <input type="number" min={1} max={48} value={periods} onChange={e => setPeriods(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm" />
            </div>
            <button onClick={handleAddTheory} disabled={!classId || !teacherId}
              className="px-5 py-2.5 bg-warning text-warning-foreground rounded-xl font-medium text-sm hover-lift flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus size={16} /> Assign
            </button>
          </div>

          {selectedTeacherAllocated && (
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span><strong>{getTeacher(teacherId)?.name}</strong> is already allocated to <strong>{selectedTeacherAllocated.join(", ")}</strong>.</span>
            </div>
          )}

          {classId && sectionAssignments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {getClass(classId)?.name} — Theory Assignments
              </p>
              {sectionAssignments.map(a => {
                const t = getTeacher(a.teacherId);
                const c = getClass(a.classId);
                const elsewhere = teachersInOtherSections.get(a.teacherId);
                return (
                  <div key={a.id} className="flex items-center justify-between bg-secondary/60 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {elsewhere && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
                      <span className="text-sm text-foreground truncate">
                        <strong>{c?.name}</strong> → {t?.name} ({t?.subject}) — <span className="text-muted-foreground">{a.periodsPerWeek} periods/week</span>
                        {elsewhere && <span className="text-amber-600 text-xs ml-1">(also in {elsewhere.join(", ")})</span>}
                      </span>
                    </div>
                    <button onClick={() => setAssignments(assignments.filter(x => x.id !== a.id))}
                      className="text-destructive hover:opacity-70 p-1 shrink-0"><Trash2 size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}

          {!classId && assignments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-1">Select a section to filter.</p>
              {assignments.map(a => {
                const t = getTeacher(a.teacherId); const c = getClass(a.classId);
                return (
                  <div key={a.id} className="flex items-center justify-between bg-secondary/60 rounded-xl px-4 py-2.5">
                    <span className="text-sm text-foreground"><strong>{c?.name}</strong> → {t?.name} ({t?.subject}) — <span className="text-muted-foreground">{a.periodsPerWeek} periods/week</span></span>
                    <button onClick={() => setAssignments(assignments.filter(x => x.id !== a.id))} className="text-destructive hover:opacity-70 p-1"><Trash2 size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── LAB TAB ── */}
      {tab === "lab" && (
        <>
          <div className="mb-4 px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700/40 text-xs text-teal-800 dark:text-teal-300 flex items-center gap-2">
            <FlaskConical size={12} className="shrink-0" />
            Labs are scheduled as <strong>2 back-to-back periods</strong>. Use Step 4 to configure PE 3, PE 4, and OE fixed slots.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Lab Subject Name</label>
              <div className="relative">
                <FlaskConical size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={labSubject} onChange={e => setLabSubject(e.target.value)} placeholder="e.g. Physics Lab"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Section</label>
              <select value={labClassId} onChange={e => setLabClassId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50">
                <option value="">Select section</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Sessions/Week <span className="text-teal-600 font-normal normal-case">(1 = 2 periods)</span>
              </label>
              <input type="number" min={1} max={6} value={sessionsPerWeek} onChange={e => setSessionsPerWeek(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Lab Room <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
              </label>
              <div className="relative">
                <DoorOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={labRoom} onChange={e => setLabRoom(e.target.value)} placeholder="e.g. Lab 101"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50" />
              </div>
            </div>
          </div>

          {/* Lunch slot option */}
          <div className="flex flex-wrap gap-4 mb-4 p-3 rounded-xl bg-secondary/40 border border-border">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useLunchSlot}
                onChange={e => setUseLunchSlot(e.target.checked)}
                className="w-4 h-4 rounded accent-teal-500"
              />
              <span className="text-xs font-semibold text-foreground">
                Allow scheduling in lunch hour <span className="font-normal text-muted-foreground">(lab spans P5 + LUNCH break)</span>
              </span>
            </label>
          </div>

          {/* Teacher count */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider flex items-center gap-1">
              <Users size={12} /> Number of Teachers
            </label>            <div className="flex items-center gap-3">
              <button type="button" onClick={() => handleTeacherCountChange(teacherCount - 1)}
                className="w-8 h-8 rounded-lg border border-border bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 flex items-center justify-center">−</button>
              <span className="text-sm font-bold text-foreground w-4 text-center">{teacherCount}</span>
              <button type="button" onClick={() => handleTeacherCountChange(teacherCount + 1)}
                className="w-8 h-8 rounded-lg border border-border bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 flex items-center justify-center">+</button>
              <span className="text-xs text-muted-foreground ml-1">teacher{teacherCount > 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Teacher selects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {Array.from({ length: teacherCount }).map((_, idx) => (
              <div key={idx}>
                <label className="block text-xs text-muted-foreground mb-1">Teacher {idx + 1}</label>
                <select value={labTeacherIds[idx] || ""} onChange={e => handleLabTeacherSelect(idx, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50">
                  <option value="">— Select teacher —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id} disabled={labTeacherIds.includes(t.id) && labTeacherIds[idx] !== t.id}>
                      {t.name} · {t.subject}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button onClick={handleAddLab} disabled={!canAddLab}
            className="w-full sm:w-auto px-5 py-2.5 bg-teal-500 text-white rounded-xl font-medium text-sm hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 justify-center transition-all mb-5">
            <Plus size={16} /> Add Lab Subject
          </button>

          {/* Lab list filtered by section */}
          {labClassId && sectionLabAssignments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {getClass(labClassId)?.name} — Lab Assignments
              </p>
              {sectionLabAssignments.map((lab, i) => {
                const cls = getClass(lab.classId);
                const teacherNames = lab.teacherIds.map(id => getTeacher(id)?.name || id).join(", ");
                return (
                  <div key={lab.id} className="flex items-start justify-between bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700/40 rounded-xl px-4 py-3 gap-2" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        <FlaskConical size={12} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{lab.subjectName}</p>
                        <p className="text-xs text-muted-foreground">{cls?.name} · {lab.sessionsPerWeek} session{lab.sessionsPerWeek > 1 ? "s" : ""}/week · {lab.teacherIds.length} teacher{lab.teacherIds.length > 1 ? "s" : ""}</p>
                        <p className="text-xs text-teal-700 dark:text-teal-400 truncate">👤 {teacherNames}</p>
                        {lab.labRoom && <p className="text-xs text-muted-foreground">🏫 {lab.labRoom}</p>}
                        {lab.useLunchSlot && <span className="inline-block text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-300 rounded px-1.5 py-0.5 mt-0.5">Lunch slot allowed</span>}
                      </div>
                    </div>
                    <button onClick={() => setLabAssignments(labAssignments.filter(x => x.id !== lab.id))}
                      className="text-destructive hover:opacity-70 p-1 shrink-0 mt-0.5"><Trash2 size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}

          {!labClassId && labAssignments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-1">Select a section to filter lab assignments.</p>
              {labAssignments.map(lab => {
                const cls = getClass(lab.classId);
                const teacherNames = lab.teacherIds.map(id => getTeacher(id)?.name || id).join(", ");
                return (
                  <div key={lab.id} className="flex items-start justify-between bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700/40 rounded-xl px-4 py-3 gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{lab.subjectName}</p>
                      <p className="text-xs text-muted-foreground">{cls?.name} · {lab.sessionsPerWeek} session{lab.sessionsPerWeek > 1 ? "s" : ""}/week</p>
                      <p className="text-xs text-teal-700 dark:text-teal-400 truncate">👤 {teacherNames}</p>
                    </div>
                    <button onClick={() => setLabAssignments(labAssignments.filter(x => x.id !== lab.id))}
                      className="text-destructive hover:opacity-70 p-1 shrink-0"><Trash2 size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AssignmentForm;
