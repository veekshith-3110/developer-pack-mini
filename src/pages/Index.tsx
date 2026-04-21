import { useState, useEffect, useRef, useCallback } from "react";
import { Teacher, ClassSection, SubjectAssignment, LabAssignment, TimetableSlot, TimeSlot, DEFAULT_TIME_SLOTS, GlobalFixedSubject } from "@/types/timetable";
import { generateTimetable } from "@/lib/scheduler";
import TeacherForm from "@/components/TeacherForm";
import ClassForm from "@/components/ClassForm";
import AssignmentForm from "@/components/AssignmentForm";
import PEOEConfig from "@/components/PEOEConfig";
import TimetableView from "@/components/TimetableView";
import TimeSlotConfig from "@/components/TimeSlotConfig";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap, AlertTriangle, CheckCircle, GraduationCap, RotateCcw, LogOut, User, Sparkles, CloudOff, Cloud, ArrowLeft, Save, History, X, FolderOpen, Plus, BookOpen } from "lucide-react";

interface Props {
  onBack: () => void;
}

type Screen = "picker" | "editor";

interface SaveEntry { id: string; name: string; created_at: string; updated_at?: string; }

// ── Blank state factory ────────────────────────────────────────────────────
const blankState = () => ({
  teachers: [] as Teacher[],
  classes: [] as ClassSection[],
  assignments: [] as SubjectAssignment[],
  labAssignments: [] as LabAssignment[],
  timeSlots: DEFAULT_TIME_SLOTS as TimeSlot[],
  timetable: [] as TimetableSlot[],
  collegeName: "",
  department: "",
  semester: "",
  peConfig: undefined as any,
  oeConfig: undefined as any,
  fixedSubjects: [] as GlobalFixedSubject[],
});

const Index = ({ onBack }: Props) => {
  const { user, signOut, role } = useAuth();

  // ── Screen: picker (landing) or editor ────────────────────────────────────
  const [screen, setScreen] = useState<Screen>("picker");
  const [activeSaveId, setActiveSaveId] = useState<string | null>(null); // which named save is open

  // ── Timetable state ────────────────────────────────────────────────────────
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
  const [peConfig, setPEConfig] = useState<any>(undefined);
  const [oeConfig, setOEConfig] = useState<any>(undefined);
  const [fixedSubjects, setFixedSubjects] = useState<GlobalFixedSubject[]>([]);

  // ── Save/load state ────────────────────────────────────────────────────────
  const [saves, setSaves] = useState<SaveEntry[]>([]);
  const [savesLoading, setSavesLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Save-name dialog (shown after generating) ──────────────────────────────
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url;

  // ── Load saves list ────────────────────────────────────────────────────────
  const loadSavesList = useCallback(async () => {
    if (!user) return;
    setSavesLoading(true);
    const { data } = await (supabase.database as any)
      .from("timetable_saves")
      .select("id, name, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setSaves(data || []);
    setSavesLoading(false);
  }, [user]);

  useEffect(() => { loadSavesList(); }, [loadSavesList]);

  // ── Debounced auto-save (only in editor, only for named saves) ─────────────
  const saveSnapshot = useCallback(async (name: string, id: string | null) => {
    if (!user) return;
    setSaveStatus("saving");
    const snapshot = { teachers, classes, assignments, labAssignments, timeSlots, timetable, collegeName, department, semester, fixedSubjects };

    if (id) {
      // Update existing named save
      const { error } = await (supabase.database as any)
        .from("timetable_saves")
        .update({ snapshot, name, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) { setSaveStatus("unsaved"); return; }
    } else {
      // Insert new named save
      const { data, error } = await (supabase.database as any)
        .from("timetable_saves")
        .insert([{ user_id: user.id, name, snapshot }])
        .select("id")
        .limit(1);
      if (error) { setSaveStatus("unsaved"); return; }
      if (data?.[0]?.id) setActiveSaveId(data[0].id);
    }
    setSaveStatus("saved");
    loadSavesList();
  }, [user, teachers, classes, assignments, labAssignments, timeSlots, timetable, collegeName, department, semester, fixedSubjects, loadSavesList]);

  // Auto-save debounced whenever state changes in editor
  const isEditing = screen === "editor";
  useEffect(() => {
    if (!isEditing || !activeSaveId) return;
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveSnapshot(saves.find(s => s.id === activeSaveId)?.name || "Untitled", activeSaveId);
    }, 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers, classes, assignments, labAssignments, timeSlots, timetable, collegeName, department, semester, fixedSubjects]);

  // ── Open a named save ──────────────────────────────────────────────────────
  const handleOpenSave = async (saveId: string) => {
    const { data, error } = await (supabase.database as any)
      .from("timetable_saves")
      .select("snapshot")
      .eq("id", saveId)
      .limit(1);
    if (error || !data?.[0]) { toast.error("Failed to load timetable"); return; }
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
    setPEConfig(s.peConfig || undefined);
    setOEConfig(s.oeConfig || undefined);
    setFixedSubjects(s.fixedSubjects || []);
    setGenerated((s.timetable || []).length > 0);
    setActiveSaveId(saveId);
    setScreen("editor");
    setSaveStatus("saved");
  };

  // ── Create new timetable ───────────────────────────────────────────────────
  const handleNewTimetable = () => {
    const b = blankState();
    setTeachers(b.teachers); setClasses(b.classes); setAssignments(b.assignments);
    setLabAssignments(b.labAssignments); setTimeSlots(b.timeSlots); setTimetable(b.timetable);
    setCollegeName(b.collegeName); setDepartment(b.department); setSemester(b.semester);
    setFixedSubjects(b.fixedSubjects || []);
    setGenerated(false); setErrors([]); setSelectedClassId("");
    setActiveSaveId(null);
    setSaveStatus("unsaved");
    setScreen("editor");
  };

  // ── Delete a save ──────────────────────────────────────────────────────────
  const handleDeleteSave = async (saveId: string) => {
    await (supabase.database as any).from("timetable_saves").delete().eq("id", saveId);
    loadSavesList();
    if (activeSaveId === saveId) {
      setActiveSaveId(null);
      setScreen("picker");
    }
  };

  // ── Generate timetable ─────────────────────────────────────────────────────
  const handleGenerate = () => {
    if (teachers.length === 0 || classes.length === 0 || (assignments.length === 0 && labAssignments.length === 0)) return;
    const result = generateTimetable(teachers, classes, assignments, timeSlots, labAssignments, fixedSubjects);
    setTimetable(result.timetable);
    setErrors(result.errors);
    if (result.updatedTimeSlots !== timeSlots) setTimeSlots(result.updatedTimeSlots);
    setGenerated(true);
    if (classes.length > 0 && !selectedClassId) setSelectedClassId(classes[0].id);
    // Prompt to save if not yet named
    if (!activeSaveId) {
      setSaveName(`${collegeName || "Timetable"} — ${new Date().toLocaleDateString()}`);
      setShowSaveDialog(true);
    }
  };

  // ── Save dialog confirm ────────────────────────────────────────────────────
  const handleConfirmSave = async () => {
    if (!saveName.trim()) return;
    await saveSnapshot(saveName.trim(), activeSaveId);
    setShowSaveDialog(false);
    toast.success(`Saved as "${saveName.trim()}"`);
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    const b = blankState();
    setTeachers(b.teachers); setClasses(b.classes); setAssignments(b.assignments);
    setLabAssignments(b.labAssignments); setTimeSlots(b.timeSlots); setTimetable(b.timetable);
    setCollegeName(b.collegeName); setDepartment(b.department); setSemester(b.semester);
    setFixedSubjects(b.fixedSubjects || []);
    setGenerated(false); setErrors([]); setSelectedClassId("");
  };

  const canGenerate = teachers.length > 0 && classes.length > 0 && (assignments.length > 0 || labAssignments.length > 0);
  const activeSaveName = saves.find(s => s.id === activeSaveId)?.name;


  // ── PICKER SCREEN ──────────────────────────────────────────────────────────
  if (screen === "picker") {
    return (
      <div className="min-h-screen bg-background pattern-dots">
        <header className="gradient-primary py-6 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-foreground/10 text-primary-foreground text-sm hover:bg-primary-foreground/20 transition-all border border-primary-foreground/20">
                <ArrowLeft size={15} /><span className="hidden sm:inline">Dashboard</span>
              </button>
              <div className="w-10 h-10 rounded-2xl bg-primary-foreground/10 flex items-center justify-center border border-primary-foreground/20">
                <GraduationCap size={22} className="text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">Timetable Manager</h1>
                <p className="text-primary-foreground/60 text-xs">Your saved timetables</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-primary-foreground/10 rounded-2xl px-3 py-1.5 border border-primary-foreground/20">
                {avatarUrl ? <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full" /> : <User className="w-4 h-4 text-primary-foreground" />}
                <span className="text-primary-foreground text-sm">{displayName}</span>
              </div>
              <button onClick={signOut} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-foreground/10 text-primary-foreground text-sm hover:bg-primary-foreground/20 border border-primary-foreground/20">
                <LogOut size={15} /><span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-10">
          {/* New timetable card */}
          <button
            onClick={handleNewTimetable}
            className="w-full mb-8 p-6 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Plus size={24} className="text-primary-foreground" />
            </div>
            <div className="text-left">
              <p className="text-base font-bold text-foreground">Create New Timetable</p>
              <p className="text-sm text-muted-foreground">Start fresh with a blank schedule</p>
            </div>
          </button>

          {/* Saved timetables */}
          {savesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : saves.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No saved timetables yet. Create your first one above.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <History size={16} className="text-muted-foreground" />
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your Timetables</p>
              </div>
              <div className="space-y-3">
                {saves.map(s => (
                  <div key={s.id} className="glass-card rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-foreground truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(s.updated_at || s.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenSave(s.id)}
                        className="flex items-center gap-1.5 px-4 py-2 gradient-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90"
                      >
                        <FolderOpen size={14} /> Open & Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSave(s.id)}
                        className="px-3 py-2 bg-destructive/10 text-destructive rounded-xl text-sm font-bold hover:bg-destructive/20"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }


  // ── EDITOR SCREEN ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pattern-dots">
      {/* Save-name dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-bold text-foreground">Name this timetable</h3>
            <input
              autoFocus
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConfirmSave()}
              placeholder="e.g. CSE 2025 Semester 1"
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-3">
              <button
                onClick={handleConfirmSave}
                disabled={!saveName.trim()}
                className="flex-1 py-2.5 gradient-primary text-primary-foreground rounded-xl font-bold text-sm disabled:opacity-40"
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 py-2.5 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="gradient-primary py-5 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setScreen("picker")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-foreground/10 text-primary-foreground text-sm hover:bg-primary-foreground/20 border border-primary-foreground/20"
              >
                <ArrowLeft size={15} /><span className="hidden sm:inline">My Timetables</span>
              </button>
              <div className="w-10 h-10 rounded-2xl bg-primary-foreground/10 flex items-center justify-center border border-primary-foreground/20">
                <GraduationCap size={22} className="text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-primary-foreground truncate max-w-[200px] sm:max-w-none">
                  {activeSaveName || "New Timetable"}
                </h1>
                <p className="text-primary-foreground/60 text-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Timetable Manager
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-primary-foreground/70 text-xs">
                {saveStatus === "saving" && <><Cloud className="w-3.5 h-3.5 animate-pulse" /> Saving…</>}
                {saveStatus === "saved" && <><Cloud className="w-3.5 h-3.5" /> Saved</>}
                {saveStatus === "unsaved" && <><CloudOff className="w-3.5 h-3.5" /> Unsaved</>}
              </div>
              {/* Manual save button */}
              <button
                onClick={() => { setSaveName(activeSaveName || `${collegeName || "Timetable"} — ${new Date().toLocaleDateString()}`); setShowSaveDialog(true); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-foreground/10 text-primary-foreground text-sm hover:bg-primary-foreground/20 border border-primary-foreground/20"
              >
                <Save size={14} /><span className="hidden sm:inline">Save</span>
              </button>
              <div className="hidden sm:flex items-center gap-2 bg-primary-foreground/10 rounded-2xl px-3 py-1.5 border border-primary-foreground/20">
                {avatarUrl ? <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full" /> : <User className="w-4 h-4 text-primary-foreground" />}
                <span className="text-primary-foreground text-sm">{displayName}</span>
              </div>
              <button onClick={signOut} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-foreground/10 text-primary-foreground text-sm hover:bg-primary-foreground/20 border border-primary-foreground/20">
                <LogOut size={15} /><span className="hidden sm:inline">Sign Out</span>
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
            <div><h3 className="text-base font-bold text-foreground">Configure Schedule</h3><p className="text-xs text-muted-foreground">Set period timings and break slots</p></div>
          </div>
          <TimeSlotConfig timeSlots={timeSlots} setTimeSlots={setTimeSlots} />
        </div>

        {/* Step 2 */}
        <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-9 h-9 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-md">2</span>
            <div><h3 className="text-base font-bold text-foreground">Add Faculty & Sections</h3><p className="text-xs text-muted-foreground">Register teachers and class sections</p></div>
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
              <div><h3 className="text-base font-bold text-foreground">Assign Subjects</h3><p className="text-xs text-muted-foreground">Link teachers to sections with period counts</p></div>
            </div>
            <AssignmentForm
              teachers={teachers} classes={classes}
              assignments={assignments} setAssignments={setAssignments}
              labAssignments={labAssignments} setLabAssignments={setLabAssignments}
            />
          </div>
        )}

        {/* Step 4 */}
        {teachers.length > 0 && classes.length > 0 && (
          <div className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-9 h-9 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-md">4</span>
              <div><h3 className="text-base font-bold text-foreground">Professional Elective & Open Elective</h3><p className="text-xs text-muted-foreground">Set fixed cross-section slots and assign teachers</p></div>
            </div>
            <PEOEConfig
              teachers={teachers} classes={classes}
              fixedSubjects={fixedSubjects}
              setFixedSubjects={setFixedSubjects}
              totalPeriods={timeSlots.filter(s => !s.isBreak).length}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <button onClick={handleGenerate} disabled={!canGenerate}
            className="px-10 py-4 gradient-primary text-primary-foreground rounded-2xl font-bold text-base hover-lift disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2.5 shadow-xl">
            <Zap size={20} /> Generate Timetable
          </button>
          <button onClick={handleReset}
            className="px-6 py-4 bg-secondary text-secondary-foreground rounded-2xl font-medium text-base hover:bg-secondary/80 transition-all flex items-center gap-2 border border-border">
            <RotateCcw size={18} /> Reset
          </button>
        </div>
        {!canGenerate && <p className="text-center text-sm text-muted-foreground">Add at least one teacher, one section, and one assignment to generate.</p>}

        {/* Errors */}
        {generated && errors.length > 0 && (
          <div className="bg-destructive/8 border border-destructive/20 rounded-2xl p-5 animate-fade-in">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle size={18} className="text-destructive" /><span className="font-bold text-destructive">Some conflicts found</span></div>
            {errors.map((e, i) => <p key={i} className="text-sm text-destructive/80">• {e}</p>)}
          </div>
        )}

        {/* Success */}
        {generated && errors.length === 0 && (
          <div className="bg-success/8 border border-success/20 rounded-2xl p-5 flex items-center gap-3 animate-fade-in">
            <CheckCircle size={22} className="text-success shrink-0" />
            <span className="font-bold text-success">Timetable generated successfully — No conflicts!</span>
          </div>
        )}

        {/* Timetable view */}
        {generated && timetable.length > 0 && (
          <TimetableView
            timetable={timetable} setTimetable={setTimetable}
            classes={classes} teachers={teachers}
            timeSlots={timeSlots} setTimeSlots={setTimeSlots}
            selectedClassId={selectedClassId} setSelectedClassId={setSelectedClassId}
            collegeName={collegeName} setCollegeName={setCollegeName}
            department={department} setDepartment={setDepartment}
            semester={semester} setSemester={setSemester}
            role={role}
          />
        )}
      </div>

      <footer className="border-t border-border py-6 mt-12">
        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" /> Students Developer Pack
        </p>
      </footer>
    </div>
  );
};

export default Index;
