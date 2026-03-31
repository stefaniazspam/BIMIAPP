import { useState, useEffect } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { useDailyLog, useDailyLogs, useUpsertDailyLog, useMeals, useDeleteMeal, useGenerateMeal, useAddToShoppingList, useCreateMeal, useCreatePantryItem } from "@/hooks/use-bimi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Utensils, Coffee, Apple, Moon, ChefHat, ShoppingCart, Loader2, Search, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Meals() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  
  const { data: meals } = useMeals();
  const { data: dailyLogs } = useDailyLogs();
  const deleteMeal = useDeleteMeal();
  const generateMeal = useGenerateMeal();
  const createMeal = useCreateMeal();
  const addToShoppingList = useAddToShoppingList();
  const createPantryItem = useCreatePantryItem();

  const [isGenOpen, setIsGenOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string, type: string } | null>(null);
  const [genPrompt, setGenPrompt] = useState("");
  const [servings, setServings] = useState(2);
  const [usePantry, setUsePantry] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToCategory, setProductToCategory] = useState<{ name: string, category: string }>({ name: "", category: "dispensa" });
  const [productSubCategory, setProductSubCategory] = useState("altro");

  const categories = [
    { id: "panificati", label: "Pane e Farine" },
    { id: "carne", label: "Carne" },
    { id: "pesce", label: "Pesce" },
    { id: "latticini", label: "Latticini e Uova" },
    { id: "frutta_verdura", label: "Frutta e Verdura" },
    { id: "conserve", label: "Conserve e Sughi" },
    { id: "bevande", label: "Bevande" },
    { id: "altro", label: "Altro" }
  ];
  
  const [viewRecipe, setViewRecipe] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get('recipe');
    if (recipeId && meals) {
      const meal = meals.find(m => m.id === Number(recipeId));
      if (meal) setViewRecipe(meal);
    }
  }, [meals]);
  const [isSelectIngOpen, setIsSelectIngOpen] = useState(false);
  const [selectedIngs, setSelectedIngs] = useState<string[]>([]);

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

  const handleSmartSearch = async () => {
    setIsSearching(true);
    try {
      const res = await fetch("/api/recipes/search", { method: "POST" });
      const data = await res.json();
      setSearchResults(data.recipes || []);
      setIsSearchOpen(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromSearch = async (recipe: any) => {
    if (!selectedSlot) return;
    await createMeal.mutateAsync({
      userId: 1,
      date: selectedSlot.date,
      mealType: selectedSlot.type,
      name: recipe.name,
      recipe: recipe.recipe,
      ingredients: recipe.ingredients,
      servings: 2,
      isPlanned: true
    });
    setIsSearchOpen(false);
    setIsGenOpen(false);
  };

  return (
    <div className="space-y-4 pb-24 max-w-7xl mx-auto px-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Piano Bimì</h1>
          <p className="text-xs text-muted-foreground">Settimana del {format(startDate, "d MMMM", { locale: it })}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>Sett. Scorsa</Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setCurrentWeek(new Date())}>Oggi</Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>Prossima</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-1">
        {weekDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const logsForDay = (dailyLogs as any[])?.filter((l: any) => l.date === dateStr);
          const hasToilet = logsForDay?.some((l: any) => l.defecated);
          const hasCycle = logsForDay?.some((l: any) => l.menstrualPhase === "menstrual");

          return (
            <div key={dateStr} className="space-y-2">
              <div className="text-center pb-1 border-b border-border flex items-center justify-center gap-1">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter leading-none">
                    {format(day, "EEE", { locale: it })}
                  </p>
                  <p className="text-sm font-display font-bold leading-none mt-1">
                    {format(day, "d")}
                  </p>
                </div>
                <div className="flex flex-col gap-0.5">
                  {hasToilet && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                  {hasCycle && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                </div>
              </div>

              {mealTypes.map((type) => {
                const dayMeals = meals?.filter(m => m.date === dateStr && m.mealType === type.id);
                
                return (
                  <Card key={type.id} className="p-1 min-h-[40px] flex flex-col justify-between group relative border-muted/30 hover:border-primary/50 transition-colors rounded-lg overflow-hidden">
                    <div className="flex items-center gap-1">
                      <type.icon className={`w-2 h-2 ${type.color}`} />
                      <span className="text-[8px] font-bold uppercase text-muted-foreground/70">{type.label}</span>
                    </div>

                    <div className="space-y-1 mt-1 flex-1 pr-7">
                      {dayMeals?.map((meal: any) => (
                        <div key={meal.id} className="flex items-center gap-1">
                          <p className="text-[10px] font-bold line-clamp-1 cursor-pointer leading-tight flex-1 hover:text-primary" onClick={() => setViewRecipe(meal)}>
                            {meal.name}
                          </p>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-4 w-4 text-destructive p-0 shrink-0" 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMeal.mutate(meal.id);
                            }}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      className="w-6 h-6 border-dashed border border-muted/50 hover:border-primary/30 p-0 absolute right-1 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setSelectedSlot({ date: dateStr, type: type.id });
                        setIsGenOpen(true);
                      }}
                    >
                      <Plus className="w-3 h-3 text-muted-foreground/50" />
                    </Button>
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
                onChange={(e) => setGenPrompt(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground">N. Persone</label>
                <Select 
                  value={String(servings)} 
                  onValueChange={(v) => {
                    setServings(Number(v));
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Persone" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1} {i === 0 ? "persona" : "persone"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-8">
                <Checkbox id="pantry" checked={usePantry} onCheckedChange={(c) => setUsePantry(!!c)} />
                <label htmlFor="pantry" className="text-sm font-medium">Usa dispensa</label>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleGenerate} className="w-full rounded-xl h-12 font-bold" disabled={generateMeal.isPending}>
                {generateMeal.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                Genera con AI
              </Button>
              <Button variant="outline" onClick={handleSmartSearch} className="w-full rounded-xl h-12 border-primary/30 text-primary" disabled={isSearching}>
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
                Cerca in Dispensa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Smart Search Results */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Sparkles className="text-primary" />
              Idee dalla tua dispensa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {searchResults.map((res, i) => (
              <Card key={i} className="p-4 border-primary/10 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => handleAddFromSearch(res)}>
                <h4 className="font-bold text-lg text-primary">{res.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">{res.description}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {res.ingredients?.slice(0, 4).map((ing: string) => (
                    <span key={ing} className="text-[10px] bg-primary/5 text-primary px-2 py-0.5 rounded-full">{ing}</span>
                  ))}
                </div>
              </Card>
            ))}
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
                  setSelectedIngs(viewRecipe.ingredients || []);
                  setIsSelectIngOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Scegli ingredienti da aggiungere alla spesa
              </Button>
            </div>

            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl border-primary/20 text-primary"
                onClick={() => {
                  setProductToCategory({ name: viewRecipe.name, category: "frigo" });
                  setProductSubCategory("altro");
                  setIsAddProductOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi piatto pronto alla dispensa
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

      {/* Ingredient Selector Dialog */}
      <Dialog open={isSelectIngOpen} onOpenChange={setIsSelectIngOpen}>
        {/* ... existing dialog content ... */}
      </Dialog>

      {/* Add Product Category Dialog */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">In quale categoria?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Posizione</label>
              <Select value={productToCategory.category} onValueChange={(v) => setProductToCategory({...productToCategory, category: v})}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dispensa">Dispensa</SelectItem>
                  <SelectItem value="frigo">Frigorifero</SelectItem>
                  <SelectItem value="freezer">Freezer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Tipo di prodotto</label>
              <Select value={productSubCategory} onValueChange={setProductSubCategory}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button 
              className="w-full rounded-xl"
              onClick={async () => {
                await createPantryItem.mutateAsync({
                  userId: 1,
                  name: productToCategory.name,
                  category: productToCategory.category,
                  subCategory: productSubCategory,
                  quantity: "1",
                  expirationDate: format(addDays(new Date(), 2), "yyyy-MM-dd")
                });
                setIsAddProductOpen(false);
              }}
            >
              Conferma
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
