import { useState } from "react";
import { Teacher, ClassSection, LabAssignment, GlobalPEConfig, GlobalOEConfig, DAYS } from "@/types/timetable";
import { Plus, Trash2, Users, Activity, BookMarked } from "lucide-react";

interface Props {
  teachers: Teacher[];
  classes: ClassSection[];
  labAssignments: LabAssignment[];
  setLabAssignments: (a: LabAssignment[]) => void;
  peConfig: GlobalPEConfig | undefined;
  setPEConfig: (c: GlobalPEConfig | undefined) => void;
  oeConfig: GlobalOEConfig | undefined;
  setOEConfig: (c: GlobalOEConfig | undefined) => void;
  totalPeriods: number; // number of teaching periods available
}

type ActiveTab = "pe" | "oe";

const PEOEConfig = ({
  teachers, classes, labAssignments, setLabAssignments,
  peConfig, setPEConfig, oeConfig, setOEConfig, totalPeriods,
}: Props) => {
  const [tab, setTab] = useState<ActiveTab>("pe");

  // PE form state
  const [peDay, setPeDay] = useState(peConfig?.day || "Wednesday");
  const [pePeriod1, setPePeriod1] = useState(peConfig?.period1 || 3);
  const [pePeriod2, setPePeriod2] = useState(peConfig?.period2 || 4);

  // OE form state
  const [oeDay, setOeDay] = useState(oeConfig?.day || "Friday");
  const [oePeriod, setOePeriod] = useState(oeConfig?.period || 5);

  // Per-section teacher assignment
  const [peClassId, setPeClassId] = useState("");
  const [peTeacherId, setPeTeacherId] = useState("");
  const [oeClassId, setOeClassId] = useState("");
  const [oeTeacherId, setOeTeacherId] = useState("");

  const periods = Array.from({ length: totalPeriods }, (_, i) => i + 1);

  const getTeacher = (id: string) => teachers.find(t => t.id === id);
  const getClass = (id: string) => classes.find(c => c.id === id);

  const peLabs = labAssignments.filter(l => l.isPE);
  const oeLabs = labAssignments.filter(l => l.isOE);

  // Save PE global config
  const handleSavePEConfig = () => {
    setPEConfig({ day: peDay, period1: pePeriod1, period2: pePeriod2 });
  };

  // Save OE global config
  const handleSaveOEConfig = () => {
    setOEConfig({ day: oeDay, period: oePeriod });
  };

  // Add PE assignment for a section
  const handleAddPE = () => {
    if (!peClassId || !peTeacherId) return;
    // Remove existing PE for this class if any
    const filtered = labAssignments.filter(l => !(l.isPE && l.classId === peClassId));
    setLabAssignments([...filtered, {
      id: Date.now().toString(),
      classId: peClassId,
      subjectName: "Professional Elective",
      teacherIds: [peTeacherId],
      sessionsPerWeek: 1,
      isPE: true,
    }]);
    setPeClassId(""); setPeTeacherId("");
  };

  // Add OE assignment for a section
  const handleAddOE = () => {
    if (!oeClassId || !oeTeacherId) return;
    const filtered = labAssignments.filter(l => !(l.isOE && l.classId === oeClassId));
    setLabAssignments([...filtered, {
      id: Date.now().toString(),
      classId: oeClassId,
      subjectName: "Open Elective",
      teacherIds: [oeTeacherId],
      sessionsPerWeek: 1,
      isOE: true,
    }]);
    setOeClassId(""); setOeTeacherId("");
  };

  const removeLab = (id: string) => setLabAssignments(labAssignments.filter(l => l.id !== id));

  // Sections not yet assigned PE/OE
  const sectionsWithoutPE = classes.filter(c => !peLabs.some(l => l.classId === c.id));
  const sectionsWithoutOE = classes.filter(c => !oeLabs.some(l => l.classId === c.id));

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
          <Activity size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Professional Elective & Open Elective</h2>
          <p className="text-xs text-muted-foreground">Fixed slots shared across all sections</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex rounded-xl overflow-hidden border border-border mb-5 text-xs font-bold">
        <button
          onClick={() => setTab("pe")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-all ${tab === "pe" ? "bg-orange-500 text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
        >
          📘 Professional Elective
        </button>
        <button
          onClick={() => setTab("oe")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-all ${tab === "oe" ? "bg-purple-500 text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
        >
          <BookMarked className="w-3.5 h-3.5" /> Open Elective
        </button>
      </div>

      {/* ── PE TAB ── */}
      {tab === "pe" && (
        <>
          {/* Global PE slot config */}
          <div className="mb-5 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/40">
            <p className="text-xs font-bold text-orange-800 dark:text-orange-300 mb-3 uppercase tracking-wider">
              Global Professional Elective Slot — same for ALL sections
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Day</label>
                <select value={peDay} onChange={e => setPeDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm">
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Period 1</label>
                <select value={pePeriod1} onChange={e => setPePeriod1(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm">
                  {periods.map(p => <option key={p} value={p}>P{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Period 2</label>
                <select value={pePeriod2} onChange={e => setPePeriod2(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm">
                  {periods.map(p => <option key={p} value={p}>P{p}</option>)}
                </select>
              </div>
              <button onClick={handleSavePEConfig}
                className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all">
                Set Prof. Elective Slot
              </button>
            </div>
            {peConfig && (
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-2 font-medium">
                ✓ Prof. Elective fixed: {peConfig.day} · P{peConfig.period1} & P{peConfig.period2}
              </p>
            )}
          </div>

          {/* Assign PE teacher per section */}
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Assign Prof. Elective Teacher per Section
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Section</label>
              <select value={peClassId} onChange={e => setPeClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm">
                <option value="">Select section</option>
                {sectionsWithoutPE.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                {peLabs.map(l => {
                  const c = getClass(l.classId);
                  return <option key={l.classId} value={l.classId}>✓ {c?.name} (reassign)</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Prof. Elective Teacher</label>
              <select value={peTeacherId} onChange={e => setPeTeacherId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm">
                <option value="">Select teacher</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name} · {t.subject}</option>)}
              </select>
            </div>
            <button onClick={handleAddPE} disabled={!peClassId || !peTeacherId}
              className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 disabled:opacity-40 flex items-center gap-1.5 justify-center">
              <Plus size={14} /> Add PE
            </button>
          </div>

          {/* PE assignments list */}
          {peLabs.length > 0 && (
            <div className="space-y-2">
              {peLabs.map(lab => {
                const cls = getClass(lab.classId);
                const t = getTeacher(lab.teacherIds[0]);
                return (
                  <div key={lab.id} className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/40 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{cls?.name}</span>
                      <span className="text-xs text-muted-foreground">→ {t?.name} ({t?.subject})</span>
                    </div>
                    <button onClick={() => removeLab(lab.id)} className="text-destructive hover:opacity-70 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {sectionsWithoutPE.length > 0 && (
            <p className="text-xs text-amber-600 mt-3">
              ⚠ {sectionsWithoutPE.length} section{sectionsWithoutPE.length > 1 ? "s" : ""} without Prof. Elective: {sectionsWithoutPE.map(c => c.name).join(", ")}
            </p>
          )}
        </>
      )}

      {/* ── OE TAB ── */}
      {tab === "oe" && (
        <>
          {/* Global OE slot config */}
          <div className="mb-5 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/40">
            <p className="text-xs font-bold text-purple-800 dark:text-purple-300 mb-3 uppercase tracking-wider">
              Global OE Slot — same for ALL sections
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Day</label>
                <select value={oeDay} onChange={e => setOeDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm">
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Period</label>
                <select value={oePeriod} onChange={e => setOePeriod(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm">
                  {periods.map(p => <option key={p} value={p}>P{p}</option>)}
                </select>
              </div>
              <button onClick={handleSaveOEConfig}
                className="px-4 py-2 bg-purple-500 text-white rounded-xl text-xs font-bold hover:bg-purple-600 transition-all">
                Set OE Slot
              </button>
            </div>
            {oeConfig && (
              <p className="text-xs text-purple-700 dark:text-purple-400 mt-2 font-medium">
                ✓ OE fixed: {oeConfig.day} · P{oeConfig.period}
              </p>
            )}
          </div>

          {/* Assign OE teacher per section */}
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Assign OE Teacher per Section
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Section</label>
              <select value={oeClassId} onChange={e => setOeClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm">
                <option value="">Select section</option>
                {sectionsWithoutOE.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                {oeLabs.map(l => {
                  const c = getClass(l.classId);
                  return <option key={l.classId} value={l.classId}>✓ {c?.name} (reassign)</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">OE Teacher</label>
              <select value={oeTeacherId} onChange={e => setOeTeacherId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm">
                <option value="">Select teacher</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name} · {t.subject}</option>)}
              </select>
            </div>
            <button onClick={handleAddOE} disabled={!oeClassId || !oeTeacherId}
              className="px-4 py-2 bg-purple-500 text-white rounded-xl text-xs font-bold hover:bg-purple-600 disabled:opacity-40 flex items-center gap-1.5 justify-center">
              <Plus size={14} /> Add OE
            </button>
          </div>

          {/* OE assignments list */}
          {oeLabs.length > 0 && (
            <div className="space-y-2">
              {oeLabs.map(lab => {
                const cls = getClass(lab.classId);
                const t = getTeacher(lab.teacherIds[0]);
                return (
                  <div key={lab.id} className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/40 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{cls?.name}</span>
                      <span className="text-xs text-muted-foreground">→ {t?.name} ({t?.subject})</span>
                    </div>
                    <button onClick={() => removeLab(lab.id)} className="text-destructive hover:opacity-70 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {sectionsWithoutOE.length > 0 && (
            <p className="text-xs text-amber-600 mt-3">
              ⚠ {sectionsWithoutOE.length} section{sectionsWithoutOE.length > 1 ? "s" : ""} without OE: {sectionsWithoutOE.map(c => c.name).join(", ")}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default PEOEConfig;
