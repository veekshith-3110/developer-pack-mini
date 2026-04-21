import { useState } from "react";
import { Teacher, ClassSection, LabAssignment } from "@/types/timetable";
import { Plus, Trash2, FlaskConical, Users, DoorOpen } from "lucide-react";

interface Props {
    teachers: Teacher[];
    classes: ClassSection[];
    labAssignments: LabAssignment[];
    setLabAssignments: (a: LabAssignment[]) => void;
}

const LabAssignmentForm = ({ teachers, classes, labAssignments, setLabAssignments }: Props) => {
    const [classId, setClassId] = useState("");
    const [subjectName, setSubjectName] = useState("");
    const [teacherCount, setTeacherCount] = useState(1);
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([""]);
    const [sessionsPerWeek, setSessionsPerWeek] = useState(1);
    const [labRoom, setLabRoom] = useState("");

    const handleTeacherCountChange = (count: number) => {
        const clamped = Math.max(1, Math.min(6, count));
        setTeacherCount(clamped);
        setSelectedTeacherIds(prev => {
            const updated = [...prev];
            while (updated.length < clamped) updated.push("");
            return updated.slice(0, clamped);
        });
    };

    const handleTeacherSelect = (idx: number, teacherId: string) => {
        setSelectedTeacherIds(prev => {
            const updated = [...prev];
            updated[idx] = teacherId;
            return updated;
        });
    };

    const handleAdd = () => {
        if (!classId || !subjectName.trim()) return;
        const validTeacherIds = selectedTeacherIds.filter(Boolean);
        if (validTeacherIds.length === 0) return;

        setLabAssignments([
            ...labAssignments,
            {
                id: Date.now().toString(),
                classId,
                subjectName: subjectName.trim(),
                teacherIds: validTeacherIds,
                sessionsPerWeek,
                labRoom: labRoom.trim() || undefined,
            },
        ]);

        // Reset form
        setSubjectName("");
        setSelectedTeacherIds([""]);
        setTeacherCount(1);
        setSessionsPerWeek(1);
        setLabRoom("");
    };

    const getClass = (id: string) => classes.find(c => c.id === id);
    const getTeacher = (id: string) => teachers.find(t => t.id === id);

    const canAdd = classId && subjectName.trim() && selectedTeacherIds.some(Boolean);

    return (
        <div className="glass-card rounded-2xl p-6 animate-fade-in border-2 border-teal-200/50 dark:border-teal-700/40">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
                    <FlaskConical size={16} className="text-white" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-foreground">Lab Subjects</h2>
                    <p className="text-xs text-muted-foreground">2 consecutive periods · Multiple teachers · No lunch-break overlap</p>
                </div>
            </div>

            {/* Info banner */}
            <div className="mb-5 px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700/40 text-xs text-teal-800 dark:text-teal-300 flex items-center gap-2">
                <FlaskConical size={12} className="shrink-0" />
                Labs are automatically scheduled as <strong>2 back-to-back periods</strong>. They will never straddle a break or lunch slot.
            </div>

            {/* Form grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {/* Lab name */}
                <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                        Lab Subject Name
                    </label>
                    <div className="relative">
                        <FlaskConical size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={subjectName}
                            onChange={e => setSubjectName(e.target.value)}
                            placeholder="e.g. Physics Lab / CS Lab"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 transition-all"
                        />
                    </div>
                </div>

                {/* Section */}
                <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                        Section
                    </label>
                    <select
                        value={classId}
                        onChange={e => setClassId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                    >
                        <option value="">Select section</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* Sessions per week */}
                <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                        Sessions / Week <span className="text-teal-600 font-normal normal-case">(1 session = 2 periods)</span>
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={6}
                        value={sessionsPerWeek}
                        onChange={e => setSessionsPerWeek(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                    />
                </div>

                {/* Lab room */}
                <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                        Lab Room <span className="text-muted-foreground/60 font-normal normal-case">(optional, else uses section room)</span>
                    </label>
                    <div className="relative">
                        <DoorOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={labRoom}
                            onChange={e => setLabRoom(e.target.value)}
                            placeholder="e.g. Lab 101"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Number of teachers */}
            <div className="mb-3">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider flex items-center gap-1">
                    <Users size={12} /> Number of Teachers for this Lab
                </label>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => handleTeacherCountChange(teacherCount - 1)}
                        className="w-8 h-8 rounded-lg border border-border bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 transition-all flex items-center justify-center"
                    >
                        −
                    </button>
                    <span className="text-sm font-bold text-foreground w-4 text-center">{teacherCount}</span>
                    <button
                        type="button"
                        onClick={() => handleTeacherCountChange(teacherCount + 1)}
                        className="w-8 h-8 rounded-lg border border-border bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 transition-all flex items-center justify-center"
                    >
                        +
                    </button>
                    <span className="text-xs text-muted-foreground ml-1">teacher{teacherCount > 1 ? "s" : ""} handle this lab</span>
                </div>
            </div>

            {/* Dynamic teacher selects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {Array.from({ length: teacherCount }).map((_, idx) => (
                    <div key={idx}>
                        <label className="block text-xs text-muted-foreground mb-1">
                            Teacher {idx + 1}
                        </label>
                        <select
                            value={selectedTeacherIds[idx] || ""}
                            onChange={e => handleTeacherSelect(idx, e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                        >
                            <option value="">— Select teacher —</option>
                            {teachers.map(t => (
                                <option
                                    key={t.id}
                                    value={t.id}
                                    disabled={selectedTeacherIds.includes(t.id) && selectedTeacherIds[idx] !== t.id}
                                >
                                    {t.name} · {t.subject}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>

            {/* Add button */}
            <button
                onClick={handleAdd}
                disabled={!canAdd}
                className="w-full sm:w-auto px-5 py-2.5 bg-teal-500 text-white rounded-xl font-medium text-sm hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 justify-center transition-all"
            >
                <Plus size={16} /> Add Lab Subject
            </button>

            {/* List */}
            {labAssignments.length > 0 && (
                <div className="mt-5 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Configured Lab Subjects</p>
                    {labAssignments.map((lab, i) => {
                        const cls = getClass(lab.classId);
                        const teacherNames = lab.teacherIds.map(id => getTeacher(id)?.name || id).join(", ");
                        return (
                            <div
                                key={lab.id}
                                className="flex items-start justify-between bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700/40 rounded-xl px-4 py-3 animate-fade-in gap-2"
                                style={{ animationDelay: `${i * 50}ms` }}
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <span className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                        <FlaskConical size={12} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-foreground truncate">{lab.subjectName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {cls?.name} · {lab.sessionsPerWeek} session{lab.sessionsPerWeek > 1 ? "s" : ""}/week · {lab.teacherIds.length} teacher{lab.teacherIds.length > 1 ? "s" : ""}
                                        </p>
                                        <p className="text-xs text-teal-700 dark:text-teal-400 truncate">👤 {teacherNames}</p>
                                        {lab.labRoom && <p className="text-xs text-muted-foreground">🏫 {lab.labRoom}</p>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setLabAssignments(labAssignments.filter(x => x.id !== lab.id))}
                                    className="text-destructive hover:opacity-70 transition-opacity p-1 shrink-0 mt-0.5"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LabAssignmentForm;
