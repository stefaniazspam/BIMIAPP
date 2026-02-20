import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { useDailyLog, useUpsertDailyLog, useMeals, usePantryItems, useReminders, useGenerateRecipe } from "@/hooks/use-bimi";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { AlertCircle, Droplets, Calendar, CheckCircle2, ArrowRight, ChefHat, Loader2 } from "lucide-react";
import { MacroChart } from "@/components/MacroChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Home() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: dailyLog, isLoading: logLoading } = useDailyLog(today);
  const { data: meals, isLoading: mealsLoading } = useMeals(today);
  const { data: pantry, isLoading: pantryLoading } = usePantryItems();
  const { data: reminders, isLoading: remindersLoading } = useReminders();
  const upsertLog = useUpsertDailyLog();
  const generateRecipe = useGenerateRecipe();

  const [recipe, setRecipe] = useState<string | null>(null);

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

  const handleGenerateRecipe = async () => {
    if (!expiringItems.length) return;
    const ingredients = expiringItems.map(i => i.name);
    try {
      const res = await generateRecipe.mutateAsync(ingredients);
      setRecipe(res.recipe);
    } catch (error) {
      console.error(error);
    }
  };

  const macros = meals?.reduce((acc, meal) => ({
    calories: acc.calories + (meal.calories || 0),
    protein: acc.protein + (meal.protein || 0),
    carbs: acc.carbs + (meal.carbs || 0),
    fat: acc.fat + (meal.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }) || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const expiringItems = pantry?.filter(item => {
    if (!item.expirationDate) return false;
    const exp = new Date(item.expirationDate);
    const limit = addDays(new Date(), 2);
    return exp <= limit;
  }) || [];

  const todayReminders = reminders?.filter(r => {
    const d = new Date(r.remindAt);
    return d.getDate() === new Date().getDate() && 
           d.getMonth() === new Date().getMonth() && 
           d.getFullYear() === new Date().getFullYear();
  }) || [];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Ciao, Bella!</h1>
          <p className="text-muted-foreground capitalize">
            {format(new Date(), "EEEE d MMMM", { locale: it })}
          </p>
        </div>
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Calendar className="text-primary w-6 h-6" />
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-br from-secondary/20 to-orange-100 dark:from-secondary/10 dark:to-orange-900/10 border-none shadow-lg">
        <h2 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
          <Droplets className="w-5 h-5 text-accent" />
          Benessere Oggi
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl backdrop-blur-sm">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Fase Ciclo</span>
            <p className="text-xl font-bold text-foreground mt-1 capitalize">
              {logLoading ? <Skeleton className="h-6 w-20" /> : (dailyLog?.menstrualPhase || "Non impostato")}
            </p>
          </div>
          
          <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl backdrop-blur-sm flex flex-col justify-between">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Toilette Check</span>
            <div className="flex items-center gap-3 mt-2">
              <Checkbox 
                id="defecated" 
                checked={dailyLog?.defecated || false}
                onCheckedChange={handleDefecatedToggle}
                className="w-6 h-6 border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
              <label htmlFor="defecated" className="text-sm font-medium cursor-pointer">
                Fatto?
              </label>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 shadow-md border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-display">Riepilogo Nutrizione</h2>
          <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
            {macros.calories} / 2000 kcal
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-full md:w-1/2">
            <MacroChart protein={macros.protein} carbs={macros.carbs} fat={macros.fat} />
          </div>
          <div className="w-full md:w-1/2 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="block text-xs text-muted-foreground">Prot</span>
              <span className="block font-bold text-green-700 dark:text-green-400">{macros.protein}g</span>
            </div>
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <span className="block text-xs text-muted-foreground">Carbo</span>
              <span className="block font-bold text-yellow-600 dark:text-yellow-400">{macros.carbs}g</span>
            </div>
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <span className="block text-xs text-muted-foreground">Grassi</span>
              <span className="block font-bold text-orange-600 dark:text-orange-400">{macros.fat}g</span>
            </div>
          </div>
        </div>
      </Card>

      {expiringItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-red-500 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              In Scadenza!
            </h3>
            <Button 
              size="sm" 
              variant="outline" 
              className="rounded-full gap-2 border-orange-200 text-orange-600"
              onClick={handleGenerateRecipe}
              disabled={generateRecipe.isPending}
            >
              {generateRecipe.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChefHat className="w-4 h-4" />}
              Genera Ricetta
            </Button>
          </div>
          <div className="grid gap-3">
            {expiringItems.map(item => (
              <div key={item.id} className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">{item.name}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Scade il: {format(new Date(item.expirationDate!), "d MMM yyyy", { locale: it })}
                  </p>
                </div>
                <span className="text-sm font-medium bg-white dark:bg-black/20 px-3 py-1 rounded-full">
                  {item.quantity} pz
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-display font-bold text-lg flex items-center justify-between">
          Promemoria di Oggi
          <Link href="/promemoria" className="text-xs text-primary font-normal hover:underline flex items-center">
            Vedi tutti <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </h3>
        
        {todayReminders.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
            <p className="text-muted-foreground text-sm">Nessun promemoria per oggi</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {todayReminders.map(reminder => (
              <div key={reminder.id} className="bg-card p-4 rounded-xl shadow-sm border border-border flex items-center gap-3">
                <CheckCircle2 className={`w-5 h-5 ${reminder.completed ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="flex-1">
                  <p className={`font-medium ${reminder.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {reminder.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(reminder.remindAt), "HH:mm")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!recipe} onOpenChange={() => setRecipe(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="text-orange-500" />
              Ricetta Bimì
            </DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {recipe}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
