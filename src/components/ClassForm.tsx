import { useState } from "react";
import { ClassSection } from "@/types/timetable";
import { Plus, Trash2, School, DoorOpen } from "lucide-react";

interface Props {
  classes: ClassSection[];
  setClasses: (c: ClassSection[]) => void;
}

const ClassForm = ({ classes, setClasses }: Props) => {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");

  const handleAdd = () => {
    if (!name.trim() || !room.trim()) return;
    setClasses([...classes, { id: Date.now().toString(), name: name.trim(), room: room.trim() }]);
    setName("");
    setRoom("");
  };

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <School size={16} className="text-accent-foreground" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Sections & Rooms</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="relative">
          <School size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Section Name (e.g., CSE-A)"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
          />
        </div>
        <div className="relative">
          <DoorOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Room Number (e.g., SMV B 302)"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
          />
        </div>
      </div>
      <button onClick={handleAdd} className="w-full sm:w-auto px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-medium text-sm hover-lift flex items-center gap-2 justify-center">
        <Plus size={16} /> Add Section
      </button>

      {classes.length > 0 && (
        <div className="mt-4 space-y-2">
          {classes.map((c, i) => (
            <div key={c.id} className="flex items-center justify-between bg-secondary/60 rounded-xl px-4 py-2.5 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">
                  {c.name.charAt(0)}
                </span>
                <span className="text-sm font-semibold text-foreground">{c.name} <span className="text-muted-foreground font-normal">— Room {c.room}</span></span>
              </div>
              <button onClick={() => setClasses(classes.filter((x) => x.id !== c.id))} className="text-destructive hover:opacity-70 transition-opacity p-1">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassForm;
