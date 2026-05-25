import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, differenceInDays, isToday, isTomorrow } from "date-fns";
import { it } from "date-fns/locale";
import {
  useDailyLog, useDailyLogs, useUpsertDailyLog, useMeals, usePantryItems, useReminders, useUser, useUpdateUser,
  useDailyChecks, useCreateDailyCheck, useUpdateDailyCheck, useDeleteDailyCheck,
  useDailyCheckLogs, useToggleDailyCheckLog,
} from "@/hooks/use-bimi";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { GlassWater } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { AlertCircle, Droplets, Calendar as CalendarIcon, CheckCircle2, ArrowRight, ChefHat, Utensils, Settings, ChevronLeft, ChevronRight, X, Plus, Trash2, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const getExpirationLabel = (date: string) => {
  const exp = new Date(date);
  const today = new Date();
  const diff = differenceInDays(exp, today);
  if (isToday(exp)) return "OGGI";
  if (isTomorrow(exp)) return "DOMANI";
  if (diff === 2) return "DOPODOMANI";
  if (diff >= 3 && diff <= 6) return `FRA ${diff} GG`;
  if (diff === 7) return "FRA 1 SETTIMANA";
  return `IL ${format(exp, "dd/MM")}`;
};

export default function Home() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: user } = useUser();
  const { data: dailyLog, isLoading: logLoading } = useDailyLog(today);
  const { data: dailyLogs } = useDailyLogs();
  const { data: meals, isLoading: mealsLoading } = useMeals();
  const { data: pantry } = usePantryItems();
  const { data: reminders } = useReminders();
  const { data: dailyChecks } = useDailyChecks();
  const { data: dailyCheckLogs } = useDailyCheckLogs();
  const createDailyCheck = useCreateDailyCheck();
  const updateDailyCheck = useUpdateDailyCheck();
  const deleteDailyCheck = useDeleteDailyCheck();
  const toggleCheckLog = useToggleDailyCheckLog();
  const upsertLog = useUpsertDailyLog();
  const updateUser = useUpdateUser();

  const isCheckedOnDate = (checkId: number, dateStr: string) =>
    (dailyCheckLogs || []).some((l: any) => l.checkId === checkId && l.date === dateStr);

  const isCheckedToday = (checkId: number) => isCheckedOnDate(checkId, today);

  const daysSinceLastCheck = (checkId: number): number | null => {
    const logs = (dailyCheckLogs || []).filter((l: any) => l.checkId === checkId).map((l: any) => l.date).sort().reverse();
    if (logs.length === 0) return null;
    const last = logs[0];
    if (last === today) return 0;
    return differenceInDays(new Date(today), new Date(last));
  };

  const [newCheckName, setNewCheckName] = useState("");
  const [newCheckColor, setNewCheckColor] = useState("#10b981");
  const [newCheckStyle, setNewCheckStyle] = useState<"filled" | "outline" | "triangle" | "diamond">("filled");
  const [newCheckTrack, setNewCheckTrack] = useState(false);

  const PRESET_COLORS = [
    // Rossi/Arancioni
    "#ef4444", "#dc2626", "#f97316", "#ea580c", "#fb923c",
    // Gialli/Verdi lime
    "#eab308", "#ca8a04", "#84cc16", "#65a30d",
    // Verdi
    "#22c55e", "#16a34a", "#10b981", "#059669",
    // Ciano/Azzurri
    "#06b6d4", "#0891b2", "#38bdf8", "#0284c7",
    // Blu/Indigo
    "#3b82f6", "#2563eb", "#6366f1", "#4f46e5",
    // Viola/Rosa
    "#8b5cf6", "#7c3aed", "#a855f7", "#ec4899", "#db2777",
    // Toni neutri/caldi
    "#f43f5e", "#e11d48", "#78716c", "#57534e",
  ];

  // SVG-based shape renderer — supports circle filled, circle outline, triangle, diamond
  const CheckDot = ({ color, dotStyle, size = "sm", checked }: {
    color: string; dotStyle: string; size?: "sm" | "md" | "lg"; checked: boolean;
  }) => {
    const s = size === "sm" ? 24 : size === "md" ? 28 : 32;
    const sw = 2;
    const pad = sw + 1;
    const half = s / 2;
    // Checkmark path scaled to the SVG viewBox
    const ck = `M${s*0.22},${s*0.52} L${s*0.42},${s*0.72} L${s*0.78},${s*0.28}`;
    const ckColor = (dotStyle === "outline") ? color : "white";

    let shape: React.ReactNode;
    if (dotStyle === "outline") {
      shape = (
        <circle cx={half} cy={half} r={half - sw}
          fill="none" stroke={color} strokeWidth={checked ? 3 : sw} />
      );
    } else if (dotStyle === "triangle") {
      shape = (
        <polygon points={`${half},${pad} ${pad},${s - pad} ${s - pad},${s - pad}`}
          fill={checked ? color : "none"} stroke={color} strokeWidth={sw} />
      );
    } else if (dotStyle === "diamond") {
      shape = (
        <polygon points={`${half},${pad} ${s - pad},${half} ${half},${s - pad} ${pad},${half}`}
          fill={checked ? color : "none"} stroke={color} strokeWidth={sw} />
      );
    } else {
      // default: "filled" circle
      shape = (
        <circle cx={half} cy={half} r={half - sw}
          fill={checked ? color : "none"} stroke={color} strokeWidth={sw} />
      );
    }

    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="shrink-0">
        {shape}
        {checked && (
          <path d={ck} fill="none" stroke={ckColor} strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    );
  };

  // Mini dot for the calendar (6×6 SVG)
  const CalDot = ({ color, dotStyle }: { color: string; dotStyle: string }) => {
    const s = 6;
    const half = 3;
    const pad = 0.5;
    if (dotStyle === "outline") {
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={half - pad} fill="none" stroke={color} strokeWidth={1} /></svg>;
    }
    if (dotStyle === "triangle") {
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},${pad} ${pad},${s-pad} ${s-pad},${s-pad}`} fill={color} /></svg>;
    }
    if (dotStyle === "diamond") {
      return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},${pad} ${s-pad},${half} ${half},${s-pad} ${pad},${half}`} fill={color} /></svg>;
    }
    return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={half - pad} fill={color} /></svg>;
  };

  const queryClient = useQueryClient();
  const updateReminder = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/reminders/${id}`, { completed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    }
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [newName, setNewName] = useState(user?.username || "Stefania");

  const handleNameUpdate = () => {
    updateUser.mutate({ username: newName });
    setIsNameEditing(false);
  };

  const handleDefecatedToggle = (checked: boolean) => {
    const currentLog = dailyLog || {};
    upsertLog.mutate({
      userId: 1,
      date: today,
      ...currentLog,
      defecated: checked,
      waterIntake: currentLog.waterIntake || 0,
    });
  };

  const handleCycleUpdate = (key: string, value: any) => {
    upsertLog.mutate({ userId: 1, date: today, ...dailyLog, [key]: value });
  };

  const calculatePhaseFromLastPeriod = (lastPeriodDateStr: string): string => {
    const lastPeriod = new Date(lastPeriodDateStr);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
    const cycleDur = user?.cycleDuration || 28;
    const periodDur = user?.periodDuration || 5;
    const dayInCycle = daysSince % cycleDur;
    if (dayInCycle < periodDur) return "menstrual";
    if (dayInCycle < cycleDur * 0.5 - 1) return "follicular";
    if (dayInCycle < cycleDur * 0.5 + 1) return "ovulation";
    return "luteal";
  };

  const handleLastPeriodSave = (dateStr: string) => {
    if (!dateStr) return;
    updateUser.mutate({ lastPeriodDate: dateStr });
    const phase = calculatePhaseFromLastPeriod(dateStr);
    upsertLog.mutate({ userId: 1, date: today, ...dailyLog, menstrualPhase: phase });
  };

  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  // Italian week starts Monday: offset 0=Mon, 6=Sun
  const firstDayOffset = (monthStart.getDay() + 6) % 7;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          {isNameEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-2xl font-display font-bold text-primary h-10 w-48 bg-transparent border-b-2 border-primary rounded-none focus-visible:ring-0 px-0"
                autoFocus
                onBlur={handleNameUpdate}
                onKeyDown={(e) => e.key === 'Enter' && handleNameUpdate()}
              />
            </div>
          ) : (
            <h1
              className="text-3xl font-display font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => { setNewName(user?.username || "Stefania"); setIsNameEditing(true); }}
            >
              Ciao, {user?.username || "Stefania"}!
            </h1>
          )}
          <p className="text-muted-foreground capitalize">
            {format(new Date(), "EEEE d MMMM", { locale: it })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center"
          onClick={() => setIsCalendarOpen(true)}
        >
          <CalendarIcon className="text-primary w-6 h-6" />
        </Button>
      </div>

      <Card className="p-6 bg-gradient-to-br from-secondary/20 to-orange-100 dark:from-secondary/10 dark:to-orange-900/10 border-none shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-display flex items-center gap-2">
            <Droplets className="w-5 h-5 text-accent" />
            Benessere Oggi
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Check di oggi</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-primary font-bold"
                onClick={() => setIsSettingsOpen(true)}
                data-testid="button-manage-checks"
              >
                <Plus className="w-3 h-3 mr-1" /> Gestisci
              </Button>
            </div>
            {(!dailyChecks || dailyChecks.length === 0) ? (
              <p className="text-xs text-muted-foreground italic py-2">Nessun check creato. Tocca "Gestisci" per crearne uno.</p>
            ) : (
              <div className="space-y-2">
                {dailyChecks.map((check: any) => {
                  const checked = isCheckedToday(check.id);
                  const daySince = check.trackDays ? daysSinceLastCheck(check.id) : null;
                  return (
                    <div key={check.id} className="flex items-center justify-between gap-2" data-testid={`check-row-${check.id}`}>
                      <button
                        onClick={() => toggleCheckLog.mutate({ checkId: check.id, date: today, checked: !checked })}
                        className="flex items-center gap-3 flex-1 min-w-0 group"
                      >
                        <div className={`transition-all ${checked ? "scale-100" : "scale-95 opacity-70 group-hover:opacity-100"}`}>
                          <CheckDot color={check.color} dotStyle={check.dotStyle || "filled"} size="sm" checked={checked} />
                        </div>
                        <span className={`text-sm font-medium text-left ${checked ? "" : "text-muted-foreground"}`}>{check.name}</span>
                      </button>
                      {check.trackDays && daySince !== null && (
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full shrink-0"
                          style={{ backgroundColor: `${check.color}20`, color: check.color }}
                          title={daySince === 0 ? "Oggi" : `${daySince} ${daySince === 1 ? "giorno" : "giorni"} dall'ultimo check`}
                        >
                          {daySince === 0 ? "oggi" : `${daySince}g`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Reminders Widget */}
      <Card className="p-6 shadow-md border-border/50 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
        <h2 className="text-lg font-bold font-display mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <span>Promemoria</span>
          </div>
          <Link href="/promemoria">
            <Button variant="ghost" size="sm" className="text-xs text-primary font-bold">Vedi tutti</Button>
          </Link>
        </h2>
        {(() => {
          const now = new Date();
          const todayStr = format(now, "yyyy-MM-dd");
          const incomplete = (reminders || []).filter(r => !r.completed)
            .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());

          // Today = today's date items; Overdue = past days items (not today)
          const todayItems = incomplete.filter(r => format(new Date(r.remindAt), "yyyy-MM-dd") >= todayStr);
          const overdueItems = incomplete.filter(r => format(new Date(r.remindAt), "yyyy-MM-dd") < todayStr);
          const upcomingItems = incomplete.filter(r => format(new Date(r.remindAt), "yyyy-MM-dd") > todayStr).slice(0, 3);

          const renderItem = (reminder: any, forceRed = false) => {
            const remindDate = new Date(reminder.remindAt);
            const isExpired = remindDate < now;
            const showRed = isExpired || forceRed;
            return (
              <div
                key={reminder.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${showRed ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30" : "border-transparent hover:bg-muted/30"}`}
                data-testid={`home-reminder-${reminder.id}`}
              >
                <Checkbox
                  checked={reminder.completed}
                  onCheckedChange={(checked) => updateReminder.mutate({ id: reminder.id, completed: !!checked })}
                  className="w-5 h-5 border-2 border-primary mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm break-words ${showRed ? "text-red-700 dark:text-red-400 font-bold" : ""}`}>
                    {reminder.title}
                  </p>
                  {reminder.description && (
                    <p className="text-[11px] text-muted-foreground break-words mt-0.5">{reminder.description}</p>
                  )}
                  <p className={`text-[10px] mt-1 ${showRed ? "text-red-600 dark:text-red-400 font-bold" : "text-muted-foreground"}`}>
                    {showRed && "SCADUTO · "}
                    {format(remindDate, "d MMM, HH:mm", { locale: it })}
                  </p>
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-4">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Oggi e in ritardo</h3>
                <div className="space-y-1">
                  {overdueItems.map(r => renderItem(r, true))}
                  {todayItems.filter(r => format(new Date(r.remindAt), "yyyy-MM-dd") === todayStr).map(r => renderItem(r))}
                  {overdueItems.length === 0 && todayItems.filter(r => format(new Date(r.remindAt), "yyyy-MM-dd") === todayStr).length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 italic">Nulla per oggi</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Prossimi</h3>
                <div className="space-y-1">
                  {upcomingItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 italic">Nessun prossimo promemoria</p>
                  ) : (
                    upcomingItems.map(r => renderItem(r))
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Today's Meals */}
      <Card className="p-6 shadow-md border-border/50">
        <h2 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
          <Utensils className="w-5 h-5 text-primary" />
          I miei pasti di oggi
        </h2>
        {mealsLoading ? (
          <div className="space-y-3"><Skeleton className="h-12 w-full rounded-xl" /></div>
        ) : meals?.filter(m => m.date === today && m.isPlanned).length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-muted rounded-2xl">
            <p className="text-sm text-muted-foreground mb-3">Nessuna ricetta per oggi</p>
            <Link href="/pasti"><Button size="sm" variant="outline" className="rounded-full">Pianifica</Button></Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {meals?.filter(m => m.date === today && m.isPlanned).map(meal => (
              <div key={meal.id} className="bg-card p-4 rounded-xl shadow-sm border border-border flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors" onClick={() => window.location.href = `/pasti?recipe=${meal.id}`}>
                <div className="flex items-center gap-3">
                  <ChefHat className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-bold text-sm">{meal.name}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-3">
        <h3 className="font-display font-bold text-lg text-primary flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Prossime Scadenze
        </h3>
        <div className="grid gap-3">
          {pantry?.filter(item => {
            if (!item.expirationDate) return false;
            const expDate = new Date(item.expirationDate);
            const todayDate = new Date(today);
            const threeDaysFromNow = addDays(todayDate, 3);
            return expDate >= todayDate && expDate <= threeDaysFromNow;
          }).sort((a, b) => (a.expirationDate || "").localeCompare(b.expirationDate || ""))
          .map(item => (
            <div key={`food-${item.id}`} className={`border p-4 rounded-xl flex items-center justify-between ${item.expirationDate === today ? 'bg-red-50 dark:bg-red-900/10 border-red-100' : 'bg-orange-50 dark:bg-orange-900/10 border-orange-100'}`}>
              <div className="flex items-center gap-3">
                <AlertCircle className={`w-5 h-5 ${item.expirationDate === today ? 'text-red-500' : 'text-orange-500'}`} />
                <div>
                  <p className="font-bold text-sm">SCADE {getExpirationLabel(item.expirationDate!)}: {item.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{item.subCategory || item.category}</p>
                </div>
              </div>
            </div>
          ))}
          {!pantry?.some(item => {
            if (!item.expirationDate) return false;
            const expDate = new Date(item.expirationDate);
            const todayDate = new Date(today);
            return expDate >= todayDate && expDate <= addDays(todayDate, 3);
          }) && (
            <p className="text-sm text-muted-foreground text-center py-4">Nulla in scadenza nei prossimi 3 giorni</p>
          )}
        </div>
      </div>

      {/* Calendar Dialog */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="max-w-md p-0 rounded-3xl overflow-hidden">
          <div className="p-6 bg-primary text-primary-foreground">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold font-display capitalize">{format(calendarMonth, "MMMM yyyy", { locale: it })}</h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(addDays(monthStart, -1))}><ChevronLeft /></Button>
                <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(addDays(monthEnd, 1))}><ChevronRight /></Button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-bold opacity-70">
              {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => <div key={i}>{d}</div>)}
            </div>
          </div>
          <div className="p-4 bg-background">
            <div className="grid grid-cols-7 gap-1">
              {/* Empty offset cells so the 1st falls on the correct weekday */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {days.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const checkIdsForDay = new Set(
                  (dailyCheckLogs || []).filter((l: any) => l.date === dateStr).map((l: any) => l.checkId)
                );
                const checksForDay = (dailyChecks || [])
                  .filter((c: any) => checkIdsForDay.has(c.id))
                  .slice(0, 5);
                const isSelected = dateStr === today;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedCalDay(dateStr)}
                    className={`aspect-square flex flex-col items-center justify-center relative rounded-lg transition-colors hover:bg-primary/10 ${isSelected ? "bg-primary/20 ring-2 ring-primary" : ""}`}
                  >
                    <span className={`text-sm font-medium ${isSelected ? "text-primary font-bold" : ""}`}>{format(day, "d")}</span>
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-full">
                      {checksForDay.map((check: any, idx: number) => (
                        <CalDot key={idx} color={check.color} dotStyle={check.dotStyle || "filled"} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-3">Tocca un giorno per vedere o modificare i check</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day Check Toggle Dialog */}
      <Dialog open={!!selectedCalDay} onOpenChange={() => setSelectedCalDay(null)}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl capitalize">
              {selectedCalDay ? format(new Date(selectedCalDay + "T12:00:00"), "EEEE d MMMM", { locale: it }) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(!dailyChecks || dailyChecks.length === 0) ? (
              <p className="text-sm text-muted-foreground italic">Nessun check configurato.</p>
            ) : (
              dailyChecks.map((check: any) => {
                const checked = selectedCalDay ? isCheckedOnDate(check.id, selectedCalDay) : false;
                return (
                  <button
                    key={check.id}
                    onClick={() => {
                      if (!selectedCalDay) return;
                      toggleCheckLog.mutate({ checkId: check.id, date: selectedCalDay, checked: !checked });
                    }}
                    className="flex items-center gap-3 w-full p-3 rounded-xl border transition-all hover:bg-muted/30"
                    style={{ borderColor: checked ? check.color : undefined }}
                    data-testid={`day-check-toggle-${check.id}`}
                  >
                    <CheckDot color={check.color} dotStyle={check.dotStyle || "filled"} size="md" checked={checked} />
                    <span className={`text-sm font-medium flex-1 text-left ${checked ? "font-bold" : "text-muted-foreground"}`}>{check.name}</span>
                    <span className="text-xs font-bold" style={{ color: checked ? check.color : "#aaa" }}>
                      {checked ? "Fatto" : "Non fatto"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Daily Checks Management Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Gestisci Check Giornalieri</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <h4 className="font-bold text-sm text-muted-foreground uppercase">I tuoi check</h4>
              {(!dailyChecks || dailyChecks.length === 0) ? (
                <p className="text-xs text-muted-foreground italic">Nessun check ancora creato.</p>
              ) : (
                <div className="space-y-2">
                  {dailyChecks.map((check: any) => (
                    <div key={check.id} className="space-y-3 p-3 rounded-xl border bg-card" data-testid={`manage-check-${check.id}`}>
                      {/* Row 1: preview dot + name input + giorni + delete */}
                      <div className="flex items-center gap-2">
                        <CheckDot color={check.color} dotStyle={check.dotStyle || "filled"} size="sm" checked={true} />
                        <Input
                          defaultValue={check.name}
                          className="rounded-lg h-8 flex-1"
                          onBlur={(e) => {
                            if (e.target.value && e.target.value !== check.name) {
                              updateDailyCheck.mutate({ id: check.id, name: e.target.value });
                            }
                          }}
                          data-testid={`input-check-name-${check.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 px-2 text-[10px] shrink-0 ${check.trackDays ? "text-primary font-bold" : "text-muted-foreground"}`}
                          onClick={() => updateDailyCheck.mutate({ id: check.id, trackDays: !check.trackDays })}
                          title="Conta giorni dall'ultimo check"
                        >
                          {check.trackDays ? "GG ON" : "GG OFF"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive shrink-0"
                          onClick={() => {
                            if (confirm(`Eliminare "${check.name}"? Tutti i log saranno persi.`)) {
                              deleteDailyCheck.mutate(check.id);
                            }
                          }}
                          data-testid={`button-delete-check-${check.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {/* Row 2: shape selector 2×2 grid */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { val: "filled", label: "Cerchio" },
                          { val: "outline", label: "Bordo" },
                          { val: "triangle", label: "Triangolo" },
                          { val: "diamond", label: "Rombo" },
                        ].map(({ val, label }) => {
                          const active = (check.dotStyle || "filled") === val;
                          return (
                            <button
                              key={val}
                              onClick={() => updateDailyCheck.mutate({ id: check.id, dotStyle: val })}
                              className={`flex flex-col items-center gap-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-muted text-muted-foreground hover:border-muted-foreground"}`}
                            >
                              <CheckDot color={check.color} dotStyle={val} size="sm" checked={true} />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {/* Row 3: color palette grid */}
                      <div className="flex gap-1 flex-wrap">
                        {PRESET_COLORS.map(c => (
                          <button
                            key={c}
                            className={`w-5 h-5 rounded-full transition-transform ${check.color === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : "hover:scale-110"}`}
                            style={{ backgroundColor: c }}
                            onClick={() => updateDailyCheck.mutate({ id: check.id, color: c })}
                            data-testid={`color-swatch-${check.id}-${c}`}
                          />
                        ))}
                        {/* Custom color picker */}
                        <label
                          className="w-5 h-5 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                          title="Colore personalizzato"
                        >
                          <span className="text-[8px] font-bold text-muted-foreground">+</span>
                          <input
                            type="color"
                            className="sr-only"
                            value={check.color}
                            onChange={(e) => updateDailyCheck.mutate({ id: check.id, color: e.target.value })}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 border-t pt-4">
              <h4 className="font-bold text-sm text-muted-foreground uppercase">Nuovo check</h4>

              {/* Preview */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <CheckDot color={newCheckColor} dotStyle={newCheckStyle} size="md" checked={true} />
                <span className="text-sm font-medium text-muted-foreground">{newCheckName || "Anteprima"}</span>
              </div>

              <Input
                placeholder="Nome del check..."
                value={newCheckName}
                onChange={(e) => setNewCheckName(e.target.value)}
                className="rounded-xl"
                data-testid="input-new-check-name"
              />

              {/* Shape selector */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { val: "filled" as const, label: "Cerchio" },
                  { val: "outline" as const, label: "Bordo" },
                  { val: "triangle" as const, label: "Triangolo" },
                  { val: "diamond" as const, label: "Rombo" },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    onClick={() => setNewCheckStyle(val)}
                    className={`flex flex-col items-center gap-1.5 py-2 rounded-xl border text-[10px] font-bold transition-all ${newCheckStyle === val ? "border-primary bg-primary/10 text-primary" : "border-muted text-muted-foreground hover:border-muted-foreground"}`}
                    data-testid={`style-${val}`}
                  >
                    <CheckDot color={newCheckColor} dotStyle={val} size="sm" checked={true} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Color palette */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Colore</p>
                <div className="flex gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      className={`w-6 h-6 rounded-full transition-transform ${newCheckColor === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : "hover:scale-110"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewCheckColor(c)}
                      data-testid={`new-color-${c}`}
                    />
                  ))}
                  {/* Custom color picker */}
                  <label
                    className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                    title="Colore personalizzato"
                  >
                    <span className="text-[9px] font-bold text-muted-foreground leading-none">+</span>
                    <input
                      type="color"
                      className="sr-only"
                      value={newCheckColor}
                      onChange={(e) => setNewCheckColor(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="trackDays"
                  checked={newCheckTrack}
                  onChange={(e) => setNewCheckTrack(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="trackDays" className="text-sm">Conta giorni dall'ultimo check</label>
              </div>

              <Button
                onClick={() => {
                  if (!newCheckName.trim()) return;
                  createDailyCheck.mutate({
                    name: newCheckName.trim(),
                    color: newCheckColor,
                    dotStyle: newCheckStyle,
                    trackDays: newCheckTrack,
                    order: (dailyChecks || []).length,
                  });
                  setNewCheckName("");
                  setNewCheckColor("#10b981");
                  setNewCheckStyle("filled");
                  setNewCheckTrack(false);
                }}
                disabled={!newCheckName.trim() || createDailyCheck.isPending}
                className="w-full rounded-xl font-bold"
                data-testid="button-create-check"
              >
                <Plus className="w-4 h-4 mr-2" /> Crea check
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
