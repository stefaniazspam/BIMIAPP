import { useState } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { useDailyLog, useUpsertDailyLog, useMeals, useDeleteMeal, useGenerateMeal, useAddToShoppingList } from "@/hooks/use-bimi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Utensils, Coffee, Apple, Moon, ChefHat, ShoppingCart, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Meals() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  
  const { data: meals } = useMeals();
  const deleteMeal = useDeleteMeal();
  const generateMeal = useGenerateMeal();
  const addToShoppingList = useAddToShoppingList();

  const [isGenOpen, setIsGenOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string, type: string } | null>(null);
  const [genPrompt, setGenPrompt] = useState("");
  const [servings, setServings] = useState(2);
  const [usePantry, setUsePantry] = useState(false);
  
  const [viewRecipe, setViewRecipe] = useState<any>(null);

  const mealTypes = [
    { id: "breakfast", label: "Colazione", icon: Coffee, color: "text-orange-500", bg: "bg-orange-100" },
    { id: "lunch", label: "Pranzo", icon: Utensils, color: "text-green-600", bg: "bg-green-100" },
    { id: "snack", label: "Spuntino", icon: Apple, color: "text-yellow-600", bg: "bg-yellow-100" },
    { id: "dinner", label: "Cena", icon: Moon, color: "text-purple-600", bg: "bg-purple-100" },
  ];

  const handleGenerate = async () => {
    if (!selectedSlot || !genPrompt) return;
    try {
      await generateMeal.mutateAsync({
        prompt: genPrompt,
        date: selectedSlot.date,
        mealType: selectedSlot.type,
        servings,
        usePantry
      });
      setGenPrompt("");
      setIsGenOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-primary">Piano Alimentare</h1>
          <p className="text-muted-foreground">Settimana del {format(startDate, "d MMMM", { locale: it })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>Precedente</Button>
          <Button variant="outline" onClick={() => setCurrentWeek(new Date())}>Oggi</Button>
          <Button variant="outline" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>Successiva</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          return (
            <div key={dateStr} className="space-y-4">
              <div className="text-center pb-2 border-b border-border">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-tighter">
                  {format(day, "EEEE", { locale: it })}
                </p>
                <p className="text-lg font-display font-bold">
                  {format(day, "d")}
                </p>
              </div>

              {mealTypes.map((type) => {
                const dayMeal = meals?.find(m => m.date === dateStr && m.mealType === type.id);
                
                return (
                  <Card key={type.id} className="p-2 min-h-[100px] flex flex-col justify-between group relative border-muted/50 hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-1 mb-1">
                      <type.icon className={`w-3 h-3 ${type.color}`} />
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">{type.label}</span>
                    </div>

                    {dayMeal ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold line-clamp-2 cursor-pointer hover:text-primary" onClick={() => setViewRecipe(dayMeal)}>
                          {dayMeal.name}
                        </p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => deleteMeal.mutate(dayMeal.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        variant="ghost" 
                        className="w-full h-12 dashed border-2 border-dashed border-muted hover:border-primary/30 text-muted-foreground hover:text-primary p-0"
                        onClick={() => {
                          setSelectedSlot({ date: dateStr, type: type.id });
                          setIsGenOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Generator Dialog */}
      <Dialog open={isGenOpen} onOpenChange={setIsGenOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <ChefHat className="text-primary" />
              Di cosa hai voglia oggi?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Descrivi il pasto perfetto</label>
              <Input 
                placeholder="es: Una cena leggera a base di salmone e verdure..." 
                className="rounded-xl h-12"
                value={genPrompt}
                onChange={(e) => {
                  e.stopPropagation();
                  setGenPrompt(e.target.value);
                }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">N. Persone</label>
                <Input 
                  type="number" 
                  min="1" 
                  value={servings} 
                  onChange={(e) => {
                    e.stopPropagation();
                    setServings(Number(e.target.value));
                  }} 
                  className="rounded-xl" 
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <Checkbox id="pantry" checked={usePantry} onCheckedChange={(c) => setUsePantry(!!c)} />
                <label htmlFor="pantry" className="text-sm font-medium">Usa dispensa</label>
              </div>
            </div>

            <Button onClick={handleGenerate} className="w-full rounded-xl h-12 font-bold text-lg" disabled={generateMeal.isPending}>
              {generateMeal.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ChefHat className="w-5 h-5 mr-2" />}
              Genera Pasto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recipe Viewer Dialog */}
      <Dialog open={!!viewRecipe} onOpenChange={() => setViewRecipe(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary">{viewRecipe?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="bg-muted/30 p-4 rounded-2xl">
              <h4 className="font-bold flex items-center gap-2 mb-3">
                <ShoppingCart className="w-4 h-4 text-primary" /> Ingredienti ({viewRecipe?.servings} persone)
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {viewRecipe?.ingredients?.map((ing: string, i: number) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    {ing}
                  </li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                className="w-full mt-4 rounded-xl gap-2 border-primary/20 text-primary hover:bg-primary/5"
                onClick={() => {
                  addToShoppingList.mutate(viewRecipe.ingredients);
                  setViewRecipe(null);
                }}
                disabled={addToShoppingList.isPending}
              >
                {addToShoppingList.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Aggiungi ingredienti mancanti alla spesa
              </Button>
            </div>

            <div>
              <h4 className="font-bold flex items-center gap-2 mb-3">
                <ChefHat className="w-4 h-4 text-primary" /> Procedimento
              </h4>
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {viewRecipe?.recipe}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
