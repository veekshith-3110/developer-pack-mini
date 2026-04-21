import { useState } from "react";
import { Teacher } from "@/types/timetable";
import { Plus, Trash2, User, BookOpen, Phone } from "lucide-react";

interface Props {
  teachers: Teacher[];
  setTeachers: (t: Teacher[]) => void;
  assignments?: { teacherId: string; periodsPerWeek: number }[];
  labAssignments?: { teacherIds: string[]; sessionsPerWeek: number }[];
}

const TeacherForm = ({ teachers, setTeachers, assignments = [], labAssignments = [] }: Props) => {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [phone, setPhone] = useState("");

  const handleAdd = () => {
    if (!name.trim() || !subject.trim()) return;
    setTeachers([...teachers, { id: Date.now().toString(), name: name.trim(), subject: subject.trim(), phone: phone.trim() }]);
    setName("");
    setSubject("");
    setPhone("");
  };

  // Calculate weekly hours per teacher (1 period ≈ 1 hour, lab session = 2 hours)
  const getWeeklyHours = (teacherId: string): number => {
    const regularHours = assignments
      .filter(a => a.teacherId === teacherId)
      .reduce((sum, a) => sum + a.periodsPerWeek, 0);
    const labHours = labAssignments
      .filter(la => la.teacherIds.includes(teacherId))
      .reduce((sum, la) => sum + la.sessionsPerWeek * 2, 0);
    return regularHours + labHours;
  };

  const getWorkloadColor = (hours: number) => {
    if (hours === 0) return "text-muted-foreground";
    if (hours < 18) return "text-blue-600";
    if (hours <= 21) return "text-green-600";
    return "text-red-600";
  };

  const getWorkloadLabel = (hours: number) => {
    if (hours === 0) return "No assignments";
    if (hours < 18) return `${hours}h/wk — under minimum`;
    if (hours <= 21) return `${hours}h/wk ✓`;
    return `${hours}h/wk — over limit`;
  };

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
          <User size={16} className="text-primary-foreground" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Faculty Members</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="relative">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Teacher Name"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
          />
        </div>
        <div className="relative">
          <BookOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
          />
        </div>
        <div className="relative">
          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
          />
        </div>
      </div>
      <button onClick={handleAdd} className="w-full sm:w-auto px-5 py-2.5 gradient-primary text-primary-foreground rounded-xl font-medium text-sm hover-lift flex items-center gap-2 justify-center">
        <Plus size={16} /> Add Teacher
      </button>

      {teachers.length > 0 && (
        <div className="mt-4 space-y-2">
          {teachers.map((t, i) => (
            <div key={t.id} className="flex items-center justify-between bg-secondary/60 rounded-xl px-4 py-2.5 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {t.name.charAt(0)}
                </span>
                <div>
                  <span className="text-sm font-semibold text-foreground">{t.name}</span>
                  <span className="text-muted-foreground text-sm"> — {t.subject}</span>
                  {t.phone && <span className="text-muted-foreground text-xs ml-2">📞 {t.phone}</span>}
                  <div className={`text-xs font-medium mt-0.5 ${getWorkloadColor(getWeeklyHours(t.id))}`}>
                    {getWorkloadLabel(getWeeklyHours(t.id))}
                  </div>
                </div>
              </div>
              <button onClick={() => setTeachers(teachers.filter((x) => x.id !== t.id))} className="text-destructive hover:opacity-70 transition-opacity p-1">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherForm;
