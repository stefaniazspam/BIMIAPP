import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addHours, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  useDailyLog, useDailyLogs, useUpsertDailyLog, useMeals, usePantryItems, useReminders, useUser, useUpdateUser,
  useDailyChecks, useCreateDailyCheck, useUpdateDailyCheck, useDeleteDailyCheck,
  useDailyCheckLogs, useToggleDailyCheckLog,
} from "@/hooks/use-bimi";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { differenceInDays, isToday, isTomorrow } from "date-fns";
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
  const { data: meals, isLoading: mealsLoading } = useMeals(); // Fetch all for calendar
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

  const isCheckedToday = (checkId: number) =>
    (dailyCheckLogs || []).some((l: any) => l.checkId === checkId && l.date === today);

  const daysSinceLastCheck = (checkId: number): number | null => {
    const logs = (dailyCheckLogs || []).filter((l: any) => l.checkId === checkId).map((l: any) => l.date).sort().reverse();
    if (logs.length === 0) return null;
    const last = logs[0];
    if (last === today) return 0;
    return differenceInDays(new Date(today), new Date(last));
  };

  const [newCheckName, setNewCheckName] = useState("");
  const [newCheckColor, setNewCheckColor] = useState("#10b981");
  const [newCheckTrack, setNewCheckTrack] = useState(false);

  const PRESET_COLORS = ["#ef4444", "#f97316", "#eab308", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
  
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
    upsertLog.mutate({
      userId: 1,
      date: today,
      ...dailyLog,
      [key]: value
    });
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

  const handleWaterUpdate = (amount: number) => {
    const currentWater = dailyLog?.waterIntake || 0;
    upsertLog.mutate({
      userId: 1,
      date: today,
      ...dailyLog,
      waterIntake: Math.max(0, currentWater + amount)
    });
  };

  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

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
              onClick={() => {
                setNewName(user?.username || "Stefania");
                setIsNameEditing(true);
              }}
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
          {/* Daily Checks personalizzati */}
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
                  const days = check.trackDays ? daysSinceLastCheck(check.id) : null;
                  return (
                    <div key={check.id} className="flex items-center justify-between gap-2" data-testid={`check-row-${check.id}`}>
                      <button
                        onClick={() => toggleCheckLog.mutate({ checkId: check.id, date: today, checked: !checked })}
                        className="flex items-center gap-3 flex-1 min-w-0 group"
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${checked ? "scale-100" : "scale-95 opacity-70 group-hover:opacity-100"}`}
                          style={{
                            borderColor: check.color,
                            backgroundColor: checked ? check.color : "transparent"
                          }}
                        >
                          {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </div>
                        <span className={`text-sm font-medium text-left ${checked ? "" : "text-muted-foreground"}`}>{check.name}</span>
                      </button>
                      {check.trackDays && days !== null && (
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full shrink-0"
                          style={{ backgroundColor: `${check.color}20`, color: check.color }}
                          title={days === 0 ? "Oggi" : `${days} ${days === 1 ? "giorno" : "giorni"} dall'ultimo check`}
                        >
                          {days === 0 ? "oggi" : `${days}g`}
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
          const todayItems = incomplete.filter(r => format(new Date(r.remindAt), "yyyy-MM-dd") === todayStr);
          const upcomingItems = incomplete.filter(r => format(new Date(r.remindAt), "yyyy-MM-dd") > todayStr).slice(0, 3);

          const renderItem = (reminder: any) => {
            const remindDate = new Date(reminder.remindAt);
            const isExpired = remindDate < now;
            return (
              <div
                key={reminder.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  isExpired
                    ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30"
                    : "border-transparent hover:bg-muted/30"
                }`}
                data-testid={`home-reminder-${reminder.id}`}
              >
                <Checkbox
                  checked={reminder.completed}
                  onCheckedChange={(checked) => updateReminder.mutate({ id: reminder.id, completed: !!checked })}
                  className="w-5 h-5 border-2 border-primary mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm break-words ${isExpired ? "text-red-700 dark:text-red-400 font-bold" : ""}`}>
                    {reminder.title}
                  </p>
                  {reminder.description && (
                    <p className="text-[11px] text-muted-foreground break-words mt-0.5">{reminder.description}</p>
                  )}
                  <p className={`text-[10px] mt-1 ${isExpired ? "text-red-600 dark:text-red-400 font-bold" : "text-muted-foreground"}`}>
                    {isExpired && "⚠ SCADUTO · "}
                    {format(remindDate, "d MMM, HH:mm", { locale: it })}
                  </p>
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-4">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Oggi</h3>
                <div className="space-y-1">
                  {todayItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 italic">Nulla per oggi</p>
                  ) : (
                    todayItems.map(renderItem)
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Prossimi</h3>
                <div className="space-y-1">
                  {upcomingItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 italic">Nessun prossimo promemoria</p>
                  ) : (
                    upcomingItems.map(renderItem)
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
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
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
                    <div className="flex gap-1 mt-1">
                      {dailyLog?.defecated && <div className="w-2 h-2 rounded-full bg-green-500" title="Toilette Check" />}
                      {dailyLog?.menstrualPhase === "menstrual" && <div className="w-2 h-2 rounded-full bg-red-500" title="Ciclo" />}
                    </div>
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
            const threeDaysFromNow = addDays(todayDate, 3);
            return expDate >= todayDate && expDate <= threeDaysFromNow;
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
              {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(d => <div key={d}>{d}</div>)}
            </div>
          </div>
          <div className="p-4 bg-background">
            <div className="grid grid-cols-7 gap-1">
              {days.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const checkIdsForDay = new Set(
                  (dailyCheckLogs || []).filter((l: any) => l.date === dateStr).map((l: any) => l.checkId)
                );
                const dotColors = (dailyChecks || [])
                  .filter((c: any) => checkIdsForDay.has(c.id))
                  .map((c: any) => c.color)
                  .slice(0, 4);

                return (
                  <div key={dateStr} className="aspect-square flex flex-col items-center justify-center relative rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-medium">{format(day, "d")}</span>
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-full">
                      {dotColors.map((color: string, idx: number) => (
                        <div key={idx} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
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
            {/* Lista check esistenti */}
            <div className="space-y-2">
              <h4 className="font-bold text-sm text-muted-foreground uppercase">I tuoi check</h4>
              {(!dailyChecks || dailyChecks.length === 0) ? (
                <p className="text-xs text-muted-foreground italic">Nessun check ancora creato.</p>
              ) : (
                <div className="space-y-2">
                  {dailyChecks.map((check: any) => (
                    <div
                      key={check.id}
                      className="flex items-center gap-2 p-3 rounded-xl border bg-card"
                      data-testid={`manage-check-${check.id}`}
                    >
                      <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: check.color }} />
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
                        className={`h-8 px-2 text-[10px] ${check.trackDays ? "text-primary font-bold" : "text-muted-foreground"}`}
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
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Crea nuovo check */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-bold text-sm text-muted-foreground uppercase">Nuovo check</h4>
              <Input
                placeholder="Nome (es. Mestruazioni, Yoga...)"
                value={newCheckName}
                onChange={(e) => setNewCheckName(e.target.value)}
                className="rounded-xl"
                data-testid="input-new-check-name"
              />
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCheckColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${newCheckColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    data-testid={`color-${c}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="track-days"
                  checked={newCheckTrack}
                  onCheckedChange={(v) => setNewCheckTrack(!!v)}
                  data-testid="checkbox-track-days"
                />
                <label htmlFor="track-days" className="text-sm cursor-pointer">
                  Mostra contatore giorni dall'ultimo check
                </label>
              </div>
              <Button
                className="w-full rounded-xl"
                disabled={!newCheckName.trim() || createDailyCheck.isPending}
                onClick={() => {
                  createDailyCheck.mutate(
                    { name: newCheckName.trim(), color: newCheckColor, trackDays: newCheckTrack },
                    {
                      onSuccess: () => {
                        setNewCheckName("");
                        setNewCheckColor("#10b981");
                        setNewCheckTrack(false);
                      },
                    }
                  );
                }}
                data-testid="button-create-check"
              >
                <Plus className="w-4 h-4 mr-2" /> Aggiungi check
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
