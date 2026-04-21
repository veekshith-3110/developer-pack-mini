import { useState, useEffect, useRef, useCallback } from "react";
import { Teacher, ClassSection, SubjectAssignment, LabAssignment, TimetableSlot, TimeSlot, DEFAULT_TIME_SLOTS } from "@/types/timetable";
import { generateTimetable } from "@/lib/scheduler";
import TeacherForm from "@/components/TeacherForm";
import ClassForm from "@/components/ClassForm";
import AssignmentForm from "@/components/AssignmentForm";
import TimetableView from "@/components/TimetableView";
import TimeSlotConfig from "@/components/TimeSlotConfig";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap, AlertTriangle, CheckCircle, GraduationCap, RotateCcw, LogOut, User, Sparkles, CloudOff, Cloud, ArrowLeft, Save, History, X, FolderOpen } from "lucide-react";

interface Props {
  onBack: () => void;
}

const Index = ({ onBack }: Props) => {
  const { user, signOut, role } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([]);
  const [labAssignments, setLabAssignments] = useState<LabAssignment[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(DEFAULT_TIME_SLOTS);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [generated, setGenerated] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");

  // Loading / saving status
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoad = useRef(true);

  // Named saves / history
  const [saves, setSaves] = useState<{ id: string; name: string; created_at: string }[]>([]);
  const [saveName, setSaveName] = useState("");

  // ── Load from DB on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.database
        .from("timetable_state")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load timetable:", error);
      } else if (data) {
        setTeachers((data.teachers as unknown as Teacher[]) || []);
        setClasses((data.classes as unknown as ClassSection[]) || []);
        setAssignments((data.assignments as unknown as SubjectAssignment[]) || []);
        setLabAssignments((data.lab_assignments as unknown as LabAssignment[]) || []);
        setTimeSlots((data.time_slots as unknown as TimeSlot[])?.length ? (data.time_slots as unknown as TimeSlot[]) : DEFAULT_TIME_SLOTS);
        const tt = (data.timetable as unknown as TimetableSlot[]) || [];
        setTimetable(tt);
        setCollegeName(data.college_name || "");
        setDepartment(data.department || "");
        setSemester(data.semester || "");
        if (tt.length > 0) setGenerated(true);
      }
      setLoading(false);
      initialLoad.current = false;
    };
    load();
  }, [user]);

  // ── Auto-save to DB (debounced 1.5 s) ─────────────────────────────────────
  const saveToDb = useCallback(async (state: {
    teachers: Teacher[];
    classes: ClassSection[];
    assignments: SubjectAssignment[];
    labAssignments: LabAssignment[];
    timeSlots: TimeSlot[];
    timetable: TimetableSlot[];
    collegeName: string;
    department: string;
    semester: string;
  }) => {
    if (!user) return;
    setSaveStatus("saving");
    const { error } = await supabase.database
      .from("timetable_state")
      .upsert([{
        user_id: user.id,
        teachers: state.teachers as unknown as never,
        classes: state.classes as unknown as never,
        assignments: state.assignments as unknown as never,
        lab_assignments: state.labAssignments as unknown as never,
        time_slots: state.timeSlots as unknown as never,
        timetable: state.timetable as unknown as never,
        college_name: state.collegeName,
        department: state.department,
        semester: state.semester,
      }], { onConflict: "user_id" });

    if (error) {
      console.error("Save failed:", error);
      setSaveStatus("unsaved");
    } else {
      setSaveStatus("saved");
    }
  }, [user]);

  // Debounced save whenever state changes (skip initial load)
  useEffect(() => {
    if (initialLoad.current || loading) return;
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToDb({ teachers, classes, assignments, labAssignments, timeSlots, timetable, collegeName, department, semester });
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [teachers, classes, assignments, labAssignments, timeSlots, timetable, collegeName, department, semester, saveToDb, loading]);

  // ── Named saves ────────────────────────────────────────────────────────────
  const loadSavesList = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase.database as any)
      .from("timetable_saves")
      .select("id, name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSaves(data || []);
  }, [user]);

  useEffect(() => { loadSavesList(); }, [loadSavesList]);

  const handleSaveSnapshot = async () => {
    if (!user || !saveName.trim()) return;
    const snapshot = { teachers, classes, assignments, labAssignments, timeSlots, timetable, collegeName, department, semester };
    const { error } = await (supabase.database as any)
      .from("timetable_saves")
      .insert([{ user_id: user.id, name: saveName.trim(), snapshot }]);
    if (error) { toast.error("Failed to save snapshot"); return; }
    toast.success(`Saved as "${saveName.trim()}"`);
    setSaveName("");
    setShowSaveDialog(false);
    loadSavesList();
  };

  const handleLoadSnapshot = async (saveId: string, name: string) => {
    const { data, error } = await (supabase.database as any)
      .from("timetable_saves")
      .select("snapshot")
      .eq("id", saveId)
      .limit(1);
    if (error || !data?.[0]) { toast.error("Failed to load snapshot"); return; }
    const s = data[0].snapshot;
    setTeachers(s.teachers || []);
    setClasses(s.classes || []);
    setAssignments(s.assignments || []);
    setLabAssignments(s.labAssignments || []);
    setTimeSlots(s.timeSlots?.length ? s.timeSlots : DEFAULT_TIME_SLOTS);
    setTimetable(s.timetable || []);
    setCollegeName(s.collegeName || "");
    setDepartment(s.department || "");
    setSemester(s.semester || "");
    if ((s.timetable || []).length > 0) setGenerated(true);
    setShowHistory(false);
    toast.success(`Loaded "${name}"`);
  };

  const handleDeleteSnapshot = async (saveId: string) => {
    await (supabase.database as any).from("timetable_saves").delete().eq("id", saveId);
    loadSavesList();
  };

  const handleGenerate = () => {
    if (teachers.length === 0 || classes.length === 0 || (assignments.length === 0 && labAssignments.length === 0)) return;
    const result = generateTimetable(teachers, classes, assignments, timeSlots, labAssignments);
    setTimetable(result.timetable);
    setErrors(result.errors);
    setGenerated(true);
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  };

  const handleReset = () => {
    setTeachers([]);
    setClasses([]);
    setAssignments([]);
    setLabAssignments([]);
    setTimeSlots(DEFAULT_TIME_SLOTS);
    setTimetable([]);
    setErrors([]);
    setGenerated(false);
    setSelectedClassId("");
    setCollegeName("");
    setDepartment("");
    setSemester("");
  };

  const canGenerate = teachers.length > 0 && classes.length > 0 && (assignments.length > 0 || labAssignments.length > 0);
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mx-auto animate-pulse">
            <GraduationCap size={24} className="text-primary-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Loading your timetable…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pattern-dots">
      {/* Header */}
      <header className="gradient-primary py-6 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzEuMSAwIDItLjkgMi0ycy0uOS0yLTItMi0yIC45LTIgMiAuOSAyIDIgMnptMTIgLjljLjYgMCAxLS40IDEtMXMtLjQtMS0xLTEtMSAuNC0xIDEgLjQgMSAxIDF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-foreground/10 backdrop-blur-sm text-primary-foreground text-sm hover:bg-primary-foreground/20 transition-all border border-primary-foreground/20"
              >
                <ArrowLeft size={15} />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              <div className="w-12 h-12 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/20">
                <GraduationCap size={28} className="text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Timetable Manager
                </h1>
                <p className="text-primary-foreground/60 text-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Professional Schedule Generator
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Save status indicator */}
              <div className="hidden sm:flex items-center gap-1.5 text-primary-foreground/70 text-xs">
                {saveStatus === "saving" && (
                  <><Cloud className="w-3.5 h-3.5 animate-pulse" /> Saving…</>
                )}
                {saveStatus === "saved" && (
                  <><Cloud className="w-3.5 h-3.5" /> Saved</>
                )}
                {saveStatus === "unsaved" && (
                  <><CloudOff className="w-3.5 h-3.5" /> Unsaved</>
                )}
              </div>
              {/* History button removed — saved timetables shown inline below */}
              <div className="hidden sm:flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm rounded-2xl px-4 py-2 border border-primary-foreground/20">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <span className="text-primary-foreground text-sm font-medium">{displayName}</span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm text-primary-foreground text-sm font-medium hover:bg-primary-foreground/20 transition-all border border-primary-foreground/20"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Step 1 */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-9 h-9 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-md">1</span>
            <div>
              <h3 className="text-base font-bold text-foreground">Configure Schedule</h3>
              <p className="text-xs text-muted-foreground">Set period timings and break slots</p>
            </div>
          </div>
          <TimeSlotConfig timeSlots={timeSlots} setTimeSlots={setTimeSlots} />
        </div>

        {/* Step 2 */}
        <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-9 h-9 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-md">2</span>
            <div>
              <h3 className="text-base font-bold text-foreground">Add Faculty & Sections</h3>
              <p className="text-xs text-muted-foreground">Register teachers and class sections</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TeacherForm teachers={teachers} setTeachers={setTeachers} assignments={assignments} labAssignments={labAssignments} />
            <ClassForm classes={classes} setClasses={setClasses} />
          </div>
        </div>

        {/* Step 3 */}
        {teachers.length > 0 && classes.length > 0 && (
          <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-9 h-9 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-md">3</span>
              <div>
                <h3 className="text-base font-bold text-foreground">Assign Subjects</h3>
                <p className="text-xs text-muted-foreground">Link teachers to sections with period counts</p>
              </div>
            </div>
            <div className="space-y-6">
              <AssignmentForm
                teachers={teachers}
                classes={classes}
                assignments={assignments}
                setAssignments={setAssignments}
                labAssignments={labAssignments}
                setLabAssignments={setLabAssignments}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="px-10 py-4 gradient-primary text-primary-foreground rounded-2xl font-bold text-base hover-lift disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5 shadow-xl"
          >
            <Zap size={20} /> Generate Timetable
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-4 bg-secondary text-secondary-foreground rounded-2xl font-medium text-base hover:bg-secondary/80 transition-all flex items-center gap-2 border border-border"
          >
            <RotateCcw size={18} /> Reset All
          </button>
        </div>
        {!canGenerate && (
          <p className="text-center text-sm text-muted-foreground">Add at least one teacher, one section, and one assignment to generate.</p>
        )}

        {/* Errors */}
        {generated && errors.length > 0 && (
          <div className="bg-destructive/8 border border-destructive/20 rounded-2xl p-5 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-destructive" />
              <span className="font-bold text-destructive">Some conflicts found</span>
            </div>
            {errors.map((e, i) => (
              <p key={i} className="text-sm text-destructive/80">• {e}</p>
            ))}
          </div>
        )}

        {/* Success */}
        {generated && errors.length === 0 && (
          <div className="bg-success/8 border border-success/20 rounded-2xl p-5 flex items-center gap-3 animate-fade-in">
            <CheckCircle size={22} className="text-success shrink-0" />
            <span className="font-bold text-success">
              Timetable generated successfully — No conflicts! All subjects assigned.
            </span>
          </div>
        )}

        {/* Timetable */}
        {generated && timetable.length > 0 && (
          <TimetableView
            timetable={timetable}
            setTimetable={setTimetable}
            classes={classes}
            teachers={teachers}
            timeSlots={timeSlots}
            setTimeSlots={setTimeSlots}
            selectedClassId={selectedClassId}
            setSelectedClassId={setSelectedClassId}
            collegeName={collegeName}
            setCollegeName={setCollegeName}
            department={department}
            setDepartment={setDepartment}
            semester={semester}
            setSemester={setSemester}
            role={role}
          />
        )}
        {/* ── Save & Saved Timetables section ── */}
        {generated && (
          <div className="glass-card rounded-2xl p-6 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Save size={18} className="text-success" />
              <h3 className="text-base font-bold text-foreground">Save This Timetable</h3>
            </div>
            <div className="flex gap-3 mb-6">
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSaveSnapshot()}
                placeholder={`${collegeName || "Timetable"} — ${new Date().toLocaleDateString()}`}
                className="flex-1 px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleSaveSnapshot}
                disabled={!saveName.trim()}
                className="px-5 py-2.5 bg-success text-success-foreground rounded-xl font-bold text-sm disabled:opacity-40 flex items-center gap-1.5 hover:opacity-90 transition-all"
              >
                <Save size={14} /> Save
              </button>
            </div>

            {/* Saved timetables list */}
            {saves.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <History size={15} className="text-muted-foreground" />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Saved Timetables</p>
                </div>
                <div className="space-y-2">
                  {saves.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-secondary/60 rounded-xl px-4 py-3 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleLoadSnapshot(s.id, s.name)}
                          className="flex items-center gap-1 px-3 py-1.5 gradient-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90"
                        >
                          <FolderOpen size={12} /> Open & Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSnapshot(s.id)}
                          className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-bold hover:bg-destructive/20"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Saved timetables (shown even before generating) */}
        {!generated && saves.length > 0 && (
          <div className="glass-card rounded-2xl p-6 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <History size={18} className="text-primary" />
              <h3 className="text-base font-bold text-foreground">Your Saved Timetables</h3>
            </div>
            <div className="space-y-2">
              {saves.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-secondary/60 rounded-xl px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleLoadSnapshot(s.id, s.name)}
                      className="flex items-center gap-1 px-3 py-1.5 gradient-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90"
                    >
                      <FolderOpen size={12} /> Open & Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSnapshot(s.id)}
                      className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-bold hover:bg-destructive/20"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" /> Students Developer Pack
        </p>
      </footer>
    </div>
  );
};

export default Index;
