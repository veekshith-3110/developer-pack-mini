import { TimeSlot, DEFAULT_TIME_SLOTS } from "@/types/timetable";
import { Clock, Plus, Trash2, RotateCcw, Coffee } from "lucide-react";

interface Props {
  timeSlots: TimeSlot[];
  setTimeSlots: (s: TimeSlot[]) => void;
}

const TimeSlotConfig = ({ timeSlots, setTimeSlots }: Props) => {
  const addSlot = (isBreak: boolean) => {
    const last = timeSlots[timeSlots.length - 1];
    const newSlot: TimeSlot = {
      label: isBreak ? "Break" : `P${timeSlots.filter(s => !s.isBreak).length + 1}`,
      startTime: last?.endTime || "09:00",
      endTime: last ? incrementTime(last.endTime, isBreak ? 20 : 55) : "09:55",
      isBreak,
      breakLabel: isBreak ? "BREAK" : undefined,
    };
    setTimeSlots([...timeSlots, newSlot]);
  };

  const incrementTime = (time: string, mins: number) => {
    const [h, m] = time.split(":").map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

  const updateSlot = (idx: number, key: keyof TimeSlot, value: string | boolean) => {
    const updated = [...timeSlots];
    (updated[idx] as any)[key] = value;
    setTimeSlots(updated);
  };

  const removeSlot = (idx: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== idx));
  };

  const teachingCount = timeSlots.filter(s => !s.isBreak).length;
  const breakCount = timeSlots.filter(s => s.isBreak).length;

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-success flex items-center justify-center">
            <Clock size={16} className="text-success-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Time Slots & Breaks</h2>
            <p className="text-xs text-muted-foreground">{teachingCount} periods · {breakCount} breaks</p>
          </div>
        </div>
        <button
          onClick={() => setTimeSlots(DEFAULT_TIME_SLOTS)}
          className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:opacity-80 flex items-center gap-1"
        >
          <RotateCcw size={12} /> Reset Default
        </button>
      </div>

      <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto pr-1">
        {timeSlots.map((slot, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${
              slot.isBreak ? "bg-warning/10 border-warning/30" : "bg-secondary/40 border-border"
            }`}
          >
            {slot.isBreak && <Coffee size={14} className="text-warning shrink-0" />}
            <span className="text-xs font-semibold text-muted-foreground w-8 shrink-0">
              {slot.isBreak ? "☕" : `P${timeSlots.slice(0, i).filter(s => !s.isBreak).length + 1}`}
            </span>
            <input
              type="time"
              value={slot.startTime}
              onChange={(e) => updateSlot(i, "startTime", e.target.value)}
              className="px-2 py-1 rounded-lg border border-input bg-background text-foreground text-xs w-[100px]"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <input
              type="time"
              value={slot.endTime}
              onChange={(e) => updateSlot(i, "endTime", e.target.value)}
              className="px-2 py-1 rounded-lg border border-input bg-background text-foreground text-xs w-[100px]"
            />
            {slot.isBreak && (
              <input
                value={slot.breakLabel || ""}
                onChange={(e) => updateSlot(i, "breakLabel", e.target.value)}
                placeholder="Label"
                className="px-2 py-1 rounded-lg border border-input bg-background text-foreground text-xs w-[80px]"
              />
            )}
            <button onClick={() => removeSlot(i)} className="text-destructive hover:opacity-70 ml-auto p-1">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={() => addSlot(false)} className="px-4 py-2 bg-success text-success-foreground rounded-xl text-xs font-medium hover-lift flex items-center gap-1">
          <Plus size={14} /> Add Period
        </button>
        <button onClick={() => addSlot(true)} className="px-4 py-2 bg-warning text-warning-foreground rounded-xl text-xs font-medium hover-lift flex items-center gap-1">
          <Coffee size={14} /> Add Break
        </button>
      </div>
    </div>
  );
};

export default TimeSlotConfig;
