import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { useDailyLog, useUpsertDailyLog, useMeals, usePantryItems, useReminders, useUser, useUpdateUser } from "@/hooks/use-bimi";
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
  const { data: meals, isLoading: mealsLoading } = useMeals(); // Fetch all for calendar
  const { data: pantry } = usePantryItems();
  const { data: reminders } = useReminders();
  const upsertLog = useUpsertDailyLog();
  const updateUser = useUpdateUser();

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
          <h1 className="text-3xl font-display font-bold text-primary">Ciao, Stefania!</h1>
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
              <div key={meal.id} className="bg-card p-4 rounded-xl shadow-sm border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ChefHat className="w-4 h-4 text-primary" />
                  <p className="font-bold text-sm">{meal.name}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            ))}
          </div>
        )}
      </Card>

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
                const hasCycle = false; // logic for cycle dots
                const hasToilet = dailyLog?.date === dateStr && dailyLog.defecated;
                
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
