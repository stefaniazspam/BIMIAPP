import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addHours } from "date-fns";
import { it } from "date-fns/locale";
import { useDailyLog, useDailyLogs, useUpsertDailyLog, useMeals, usePantryItems, useReminders, useUser, useUpdateUser } from "@/hooks/use-bimi";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { AlertCircle, Droplets, Calendar as CalendarIcon, CheckCircle2, ArrowRight, ChefHat, Utensils, Settings, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function Home() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: user } = useUser();
  const { data: dailyLog, isLoading: logLoading } = useDailyLog(today);
  const { data: dailyLogs } = useDailyLogs();
  const { data: meals, isLoading: mealsLoading } = useMeals(); // Fetch all for calendar
  const { data: pantry } = usePantryItems();
  const { data: reminders } = useReminders();
  const upsertLog = useUpsertDailyLog();
  const updateUser = useUpdateUser();
  
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
    upsertLog.mutate({
      userId: 1,
      date: today,
      defecated: checked,
      ...dailyLog,
      menstrualPhase: dailyLog?.menstrualPhase || null,
      flow: dailyLog?.flow || null,
      notes: dailyLog?.notes || null
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
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl backdrop-blur-sm cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Fase Ciclo</span>
            <p className="text-xl font-bold text-foreground mt-1 capitalize">
              {logLoading ? <Skeleton className="h-6 w-20" /> : (dailyLog?.menstrualPhase || "Follicolare")}
            </p>
          </div>
          
          <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl backdrop-blur-sm flex flex-col justify-between">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Toilette Check</span>
            <div className="flex items-center gap-3 mt-2">
              <Checkbox 
                id="defecated" 
                checked={dailyLog?.defecated || false}
                onCheckedChange={handleDefecatedToggle}
                className="w-6 h-6 border-2 border-primary data-[state=checked]:bg-primary"
              />
              <label htmlFor="defecated" className="text-sm font-medium cursor-pointer">Fatto?</label>
            </div>
          </div>
        </div>
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
          Prossimi Promemoria e Scadenze
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
                  <p className="font-bold text-sm">{item.expirationDate === today ? 'SCADE OGGI' : `SCADE IL ${format(new Date(item.expirationDate!), "dd/MM")}`}: {item.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{item.subCategory || item.category}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Today's reminders */}
          {reminders?.filter(r => format(new Date(r.remindAt), "yyyy-MM-dd") === today).map(reminder => (
            <div key={`rem-${reminder.id}`} className="bg-card p-4 rounded-xl shadow-sm border border-border flex items-center gap-3 group">
              <Checkbox 
                checked={reminder.completed || false} 
                onCheckedChange={(checked) => updateReminder.mutate({ id: reminder.id, completed: !!checked })}
                className="w-5 h-5 border-2 border-primary data-[state=checked]:bg-primary"
              />
              <div className="flex-1">
                <p className={`font-medium text-sm ${reminder.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {reminder.title}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(reminder.remindAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })}
                </p>
              </div>
            </div>
          ))}

          {(!reminders?.some(r => format(new Date(r.remindAt), "yyyy-MM-dd") === today) && 
            !pantry?.some(i => i.expirationDate === today)) && (
            <p className="text-sm text-muted-foreground text-center py-4">Nulla in scadenza oggi</p>
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
                const logsForDay = (dailyLogs as any[])?.filter((l: any) => l.date === dateStr);
                const hasToilet = logsForDay?.some((l: any) => l.defecated);
                const hasCycle = logsForDay?.some((l: any) => l.menstrualPhase === "menstrual");
                
                return (
                  <div key={dateStr} className="aspect-square flex flex-col items-center justify-center relative rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-medium">{format(day, "d")}</span>
                    <div className="flex gap-0.5 mt-1">
                      {hasToilet && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                      {hasCycle && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Impostazioni Ciclo</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-muted-foreground uppercase">Durata media</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold">Ciclo totale (gg)</label>
                  <Input type="number" value={user?.cycleDuration || 33} onChange={(e) => updateUser.mutate({ cycleDuration: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold">Mestruazioni (gg)</label>
                  <Input type="number" value={user?.periodDuration || 5} onChange={(e) => updateUser.mutate({ periodDuration: Number(e.target.value) })} />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-muted-foreground uppercase">Stato mestruazioni</h4>
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="justify-start gap-2 rounded-xl" onClick={() => handleCycleUpdate("menstrualPhase", "menstrual")}>
                  <Droplets className="w-4 h-4 text-red-500" /> Sono iniziate oggi
                </Button>
                <Button variant="outline" className="justify-start gap-2 rounded-xl" onClick={() => handleCycleUpdate("menstrualPhase", "follicular")}>
                  <X className="w-4 h-4 text-muted-foreground" /> Sono finite oggi
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
