import { useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useDailyLog, useUpsertDailyLog, useMeals, useCreateMeal, useDeleteMeal, useUpdateMeal } from "@/hooks/use-bimi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Utensils, Coffee, Apple, Moon, Camera, Barcode } from "lucide-react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";

export default function Meals() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: dailyLog } = useDailyLog(today);
  const { data: meals } = useMeals(today);
  const upsertLog = useUpsertDailyLog();
  const createMeal = useCreateMeal();
  const deleteMeal = useDeleteMeal();
  const updateMeal = useUpdateMeal();

  const [isMealOpen, setIsMealOpen] = useState(false);
  const [editingMealId, setEditingMealId] = useState<number | null>(null);
  const [newMeal, setNewMeal] = useState({
    name: "", calories: "", protein: "", carbs: "", fat: "", type: "breakfast"
  });

  const handleCycleUpdate = (key: string, value: string | boolean) => {
    upsertLog.mutate({
      userId: 1,
      date: today,
      ...dailyLog, // Keep existing fields
      [key]: value
    });
  };

  const handleAddMeal = async () => {
    const mealData = {
      userId: 1,
      date: today,
      name: newMeal.name,
      mealType: newMeal.type,
      calories: Number(newMeal.calories) || 0,
      protein: Number(newMeal.protein) || 0,
      carbs: Number(newMeal.carbs) || 0,
      fat: Number(newMeal.fat) || 0,
    };

    if (editingMealId) {
      await updateMeal.mutateAsync({ id: editingMealId, ...mealData });
    } else {
      await createMeal.mutateAsync(mealData);
    }
    
    setNewMeal({ name: "", calories: "", protein: "", carbs: "", fat: "", type: "breakfast" });
    setEditingMealId(null);
    setIsMealOpen(false);
  };

  const handleEditClick = (meal: any) => {
    setNewMeal({
      name: meal.name,
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fat: String(meal.fat),
      type: meal.mealType
    });
    setEditingMealId(meal.id);
    setIsMealOpen(true);
  };

  const mealTypes = [
    { id: "breakfast", label: "Colazione", icon: Coffee, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/20" },
    { id: "lunch", label: "Pranzo", icon: Utensils, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20" },
    { id: "snack", label: "Spuntino", icon: Apple, color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/20" },
    { id: "dinner", label: "Cena", icon: Moon, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/20" },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-primary">Pasti & Ciclo</h1>
        <Dialog open={isMealOpen} onOpenChange={setIsMealOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="rounded-full h-10 w-10 shadow-md bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{editingMealId ? "Modifica Pasto" : "Aggiungi Pasto"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex gap-2 mb-2">
                <Button variant="outline" className="flex-1 gap-2 rounded-xl h-12">
                  <Camera className="w-5 h-5 text-primary" /> Foto
                </Button>
                <Button variant="outline" className="flex-1 gap-2 rounded-xl h-12">
                  <Barcode className="w-5 h-5 text-primary" /> Barcode
                </Button>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Select value={newMeal.type} onValueChange={(v) => setNewMeal({...newMeal, type: v})}>
                  <SelectTrigger className="col-span-4 rounded-xl">
                    <SelectValue placeholder="Tipo pasto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Colazione</SelectItem>
                    <SelectItem value="lunch">Pranzo</SelectItem>
                    <SelectItem value="snack">Spuntino</SelectItem>
                    <SelectItem value="dinner">Cena</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input 
                placeholder="Nome alimento (es. Pasta al pesto)" 
                className="rounded-xl"
                value={newMeal.name}
                onChange={(e) => setNewMeal({...newMeal, name: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Kcal" className="rounded-xl" value={newMeal.calories} onChange={(e) => setNewMeal({...newMeal, calories: e.target.value})} />
                <Input type="number" placeholder="Prot (g)" className="rounded-xl" value={newMeal.protein} onChange={(e) => setNewMeal({...newMeal, protein: e.target.value})} />
                <Input type="number" placeholder="Carbo (g)" className="rounded-xl" value={newMeal.carbs} onChange={(e) => setNewMeal({...newMeal, carbs: e.target.value})} />
                <Input type="number" placeholder="Grassi (g)" className="rounded-xl" value={newMeal.fat} onChange={(e) => setNewMeal({...newMeal, fat: e.target.value})} />
              </div>
              <Button onClick={handleAddMeal} className="w-full rounded-xl font-bold mt-2" disabled={createMeal.isPending}>
                {createMeal.isPending ? "Salvataggio..." : "Salva Pasto"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cycle Tracking */}
      <Card className="p-6 bg-pink-50 dark:bg-pink-900/10 border-pink-100 dark:border-pink-900/30">
        <h2 className="font-display font-bold text-lg text-pink-700 dark:text-pink-400 mb-4">Monitoraggio Ciclo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Fase</label>
            <Select 
              value={dailyLog?.menstrualPhase || "follicular"} 
              onValueChange={(v) => handleCycleUpdate("menstrualPhase", v)}
            >
              <SelectTrigger className="w-full bg-white dark:bg-black/20 border-pink-200 rounded-xl">
                <SelectValue placeholder="Seleziona fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="menstrual">Mestruazioni</SelectItem>
                <SelectItem value="follicular">Follicolare</SelectItem>
                <SelectItem value="ovulation">Ovulazione</SelectItem>
                <SelectItem value="luteal">Luteale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Flusso</label>
            <Select 
              value={dailyLog?.flow || "none"} 
              onValueChange={(v) => handleCycleUpdate("flow", v)}
            >
              <SelectTrigger className="w-full bg-white dark:bg-black/20 border-pink-200 rounded-xl">
                <SelectValue placeholder="Intensità" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessuno</SelectItem>
                <SelectItem value="light">Leggero</SelectItem>
                <SelectItem value="medium">Medio</SelectItem>
                <SelectItem value="heavy">Abbondante</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
             <div className="flex items-center gap-2 bg-white dark:bg-black/20 p-2.5 rounded-xl border border-pink-200 w-full justify-center">
                <Checkbox 
                  id="intercourse" 
                  checked={dailyLog?.intercourse || false}
                  onCheckedChange={(c) => handleCycleUpdate("intercourse", !!c)}
                  className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
                />
                <label htmlFor="intercourse" className="text-sm font-medium">Rapporti</label>
             </div>
          </div>
        </div>
      </Card>

      {/* Meals List */}
      <div className="space-y-6">
        {mealTypes.map((type) => {
          const typeMeals = meals?.filter(m => m.mealType === type.id) || [];
          
          return (
            <div key={type.id}>
              <h3 className="flex items-center gap-2 font-display font-bold text-lg mb-3">
                <div className={`p-2 rounded-lg ${type.bg}`}>
                  <type.icon className={`w-4 h-4 ${type.color}`} />
                </div>
                {type.label}
              </h3>
              
              {typeMeals.length === 0 ? (
                <div className="p-4 border border-dashed border-border rounded-xl text-center">
                  <p className="text-xs text-muted-foreground">Nessun pasto registrato</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {typeMeals.map(meal => (
                    <motion.div 
                      key={meal.id} 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group bg-card p-4 rounded-xl shadow-sm border border-border flex justify-between items-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => handleEditClick(meal)}
                    >
                      <div>
                        <p className="font-bold">{meal.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {meal.calories} kcal • {meal.protein}P • {meal.carbs}C • {meal.fat}F
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMeal.mutate(meal.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
