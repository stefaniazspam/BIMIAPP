import { useState, useEffect, useRef } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { useDailyLog, useDailyLogs, useUpsertDailyLog, useMeals, useDeleteMeal, useGenerateMeal, useAddToShoppingList, useCreateMeal, useUpdateMeal, useCreatePantryItem, useCreateShoppingItem, usePantryCategories } from "@/hooks/use-bimi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Utensils, Coffee, Apple, Moon, ChefHat, ShoppingCart, Loader2, Search, Sparkles, Pencil, Move } from "lucide-react";
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
  const updateMeal = useUpdateMeal();
  const addToShoppingList = useAddToShoppingList();
  const createShoppingItem = useCreateShoppingItem();
  const createPantryItem = useCreatePantryItem();
  const { data: pantryCategories } = usePantryCategories();

  const [isGenOpen, setIsGenOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualMeal, setManualMeal] = useState({ name: "", description: "", ingredients: "" });
  const [selectedSlot, setSelectedSlot] = useState<{ date: string, type: string } | null>(null);
  const [genPrompt, setGenPrompt] = useState("");
  const [servings, setServings] = useState(2);
  const [usePantry, setUsePantry] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToCategory, setProductToCategory] = useState<{ name: string, category: string }>({ name: "", category: "frigo" });
  const [productSubCategory, setProductSubCategory] = useState("altro");

  // Edit meal state
  const [editingMeal, setEditingMeal] = useState<any>(null);

  // Move meal state (via long press)
  const [movingMeal, setMovingMeal] = useState<any>(null);
  const [moveDate, setMoveDate] = useState("");
  const [moveType, setMoveType] = useState("");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [ingPicker, setIngPicker] = useState<{ name: string; checked: boolean; category: string }[]>([]);

  const openIngredientPicker = (ingredients: string[]) => {
    const defaultCat = (pantryCategories || [])[0]?.name || "altro";
    setIngPicker(
      (ingredients || []).map(name => ({
        name: name.replace(/^[-•*\s]+/, "").trim(),
        checked: true,
        category: defaultCat,
      }))
    );
    setIsSelectIngOpen(true);
  };

  const handleAddSelectedToShopping = async () => {
    const items = ingPicker.filter(i => i.checked && i.name.trim());
    for (const item of items) {
      await createShoppingItem.mutateAsync({
        userId: 1,
        name: item.name.trim(),
        quantity: "1",
        subCategory: item.category,
        checked: false,
      });
    }
    setIsSelectIngOpen(false);
  };

  const mealTypes = [
    { id: "breakfast", label: "Colazione", icon: Coffee, color: "text-orange-500", bg: "bg-orange-100" },
    { id: "lunch", label: "Pranzo", icon: Utensils, color: "text-green-600", bg: "bg-green-100" },
    { id: "snack", label: "Spuntino", icon: Apple, color: "text-yellow-600", bg: "bg-yellow-100" },
    { id: "dinner", label: "Cena", icon: Moon, color: "text-purple-600", bg: "bg-purple-100" },
  ];

  const handleGenerate = async () => {
    if (!selectedSlot || !genPrompt) return;
    try {
      await generateMeal.mutateAsync({ prompt: genPrompt, date: selectedSlot.date, mealType: selectedSlot.type, servings, usePantry });
      setGenPrompt("");
      setIsGenOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualSave = async () => {
    if (!selectedSlot || !manualMeal.name.trim()) return;
    const ingredientsList = manualMeal.ingredients
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);

    await createMeal.mutateAsync({
      userId: 1,
      date: selectedSlot.date,
      mealType: selectedSlot.type,
      name: manualMeal.name,
      recipe: manualMeal.description || "",
      ingredients: ingredientsList,
      servings: 1,
      isPlanned: true,
    });
    setIsManualOpen(false);

    // If ingredients were entered, open picker
    if (ingredientsList.length > 0) {
      setManualMeal({ name: "", description: "", ingredients: "" });
      openIngredientPicker(ingredientsList);
    } else {
      setManualMeal({ name: "", description: "", ingredients: "" });
    }
  };

  const handleEditSave = async () => {
    if (!editingMeal) return;
    const ingredientsList = Array.isArray(editingMeal.ingredients)
      ? editingMeal.ingredients
      : String(editingMeal.ingredients || "").split("\n").map((s: string) => s.trim()).filter(Boolean);
    await updateMeal.mutateAsync({
      id: editingMeal.id,
      name: editingMeal.name,
      recipe: editingMeal.recipe,
      ingredients: ingredientsList,
      servings: editingMeal.servings,
    });
    setEditingMeal(null);
    // Sync viewRecipe if open
    if (viewRecipe?.id === editingMeal.id) {
      setViewRecipe({ ...viewRecipe, name: editingMeal.name, recipe: editingMeal.recipe, ingredients: ingredientsList });
    }
  };

  const handleMoveMeal = async () => {
    if (!movingMeal || !moveDate || !moveType) return;
    await updateMeal.mutateAsync({ id: movingMeal.id, date: moveDate, mealType: moveType });
    setMovingMeal(null);
  };

  const startLongPress = (meal: any) => {
    longPressTimer.current = setTimeout(() => {
      setMovingMeal(meal);
      setMoveDate(meal.date);
      setMoveType(meal.mealType);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Generate dates for move dialog (±14 days)
  const moveDateOptions = Array.from({ length: 29 }, (_, i) => {
    const d = addDays(new Date(), i - 14);
    return { value: format(d, "yyyy-MM-dd"), label: format(d, "EEE d MMM", { locale: it }) };
  });

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
                  <p className="text-sm font-display font-bold leading-none mt-1">{format(day, "d")}</p>
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
                        <div
                          key={meal.id}
                          className="flex items-center gap-1 select-none"
                          onPointerDown={() => startLongPress(meal)}
                          onPointerUp={cancelLongPress}
                          onPointerLeave={cancelLongPress}
                          onContextMenu={(e) => { e.preventDefault(); setMovingMeal(meal); setMoveDate(meal.date); setMoveType(meal.mealType); }}
                        >
                          <p
                            className="text-[10px] font-bold line-clamp-1 cursor-pointer leading-tight flex-1 hover:text-primary"
                            onClick={() => setViewRecipe(meal)}
                          >
                            {meal.name}
                          </p>
                          <button
                            className="text-muted-foreground/40 hover:text-primary p-0 shrink-0"
                            onClick={(e) => { e.stopPropagation(); setEditingMeal({ ...meal, ingredients: (meal.ingredients || []).join("\n") }); }}
                            title="Modifica"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 text-muted-foreground/50 p-0 shrink-0 hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteMeal.mutate(meal.id); }}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      className="w-6 h-6 border-dashed border border-muted/50 hover:border-primary/30 p-0 absolute right-1 bottom-1"
                      onClick={() => { setSelectedSlot({ date: dateStr, type: type.id }); setIsGenOpen(true); }}
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
                <Select value={String(servings)} onValueChange={(v) => setServings(Number(v))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Persone" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{i + 1} {i === 0 ? "persona" : "persone"}</SelectItem>
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
              <Button
                variant="outline"
                onClick={() => { setIsGenOpen(false); setIsManualOpen(true); }}
                className="w-full rounded-xl h-12 border-primary/30 text-primary"
                data-testid="button-manual-meal"
              >
                <Pencil className="w-5 h-5 mr-2" />
                Inserisci pasto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Meal Entry */}
      <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Pencil className="text-primary" />
              Inserisci pasto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Nome del pasto</label>
              <Input
                placeholder="es: Pasta al pomodoro"
                value={manualMeal.name}
                onChange={(e) => setManualMeal({ ...manualMeal, name: e.target.value })}
                className="rounded-xl h-12"
                data-testid="input-manual-meal-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Ingredienti (uno per riga)</label>
              <textarea
                placeholder={"Pasta\nPomodoro\nAglio\nOlio d'oliva"}
                value={manualMeal.ingredients}
                onChange={(e) => setManualMeal({ ...manualMeal, ingredients: e.target.value })}
                className="w-full rounded-xl min-h-[90px] p-3 border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                data-testid="textarea-manual-meal-ingredients"
              />
              <p className="text-[10px] text-muted-foreground">Dopo il salvataggio ti verrà chiesto se aggiungere gli ingredienti alla lista della spesa.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Procedimento (opzionale)</label>
              <textarea
                placeholder="Note o procedimento..."
                value={manualMeal.description}
                onChange={(e) => setManualMeal({ ...manualMeal, description: e.target.value })}
                className="w-full rounded-xl min-h-[80px] p-3 border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                data-testid="textarea-manual-meal-description"
              />
            </div>
            <Button
              onClick={handleManualSave}
              disabled={!manualMeal.name.trim() || createMeal.isPending}
              className="w-full rounded-xl h-12 font-bold"
              data-testid="button-save-manual-meal"
            >
              {createMeal.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salva pasto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Meal Dialog */}
      <Dialog open={!!editingMeal} onOpenChange={() => setEditingMeal(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Pencil className="text-primary w-5 h-5" />
              Modifica pasto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Nome</label>
              <Input
                value={editingMeal?.name || ""}
                onChange={(e) => setEditingMeal({ ...editingMeal, name: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Ingredienti (uno per riga)</label>
              <textarea
                value={Array.isArray(editingMeal?.ingredients) ? editingMeal.ingredients.join("\n") : (editingMeal?.ingredients || "")}
                onChange={(e) => setEditingMeal({ ...editingMeal, ingredients: e.target.value.split("\n") })}
                className="w-full rounded-xl min-h-[90px] p-3 border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Procedimento</label>
              <textarea
                value={editingMeal?.recipe || ""}
                onChange={(e) => setEditingMeal({ ...editingMeal, recipe: e.target.value })}
                className="w-full rounded-xl min-h-[100px] p-3 border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <Button onClick={handleEditSave} disabled={updateMeal.isPending} className="w-full rounded-xl h-12 font-bold">
              {updateMeal.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salva modifiche"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move Meal Dialog (long press) */}
      <Dialog open={!!movingMeal} onOpenChange={() => setMovingMeal(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Move className="text-primary w-5 h-5" />
              Sposta "{movingMeal?.name}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Giorno</label>
              <Select value={moveDate} onValueChange={setMoveDate}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Scegli giorno" /></SelectTrigger>
                <SelectContent>
                  {moveDateOptions.map(d => (
                    <SelectItem key={d.value} value={d.value} className="capitalize">{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">Pasto</label>
              <Select value={moveType} onValueChange={setMoveType}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Tipo pasto" /></SelectTrigger>
                <SelectContent>
                  {mealTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleMoveMeal} disabled={!moveDate || !moveType || updateMeal.isPending} className="w-full rounded-xl h-12 font-bold">
              {updateMeal.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sposta"}
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
                onClick={() => openIngredientPicker(viewRecipe?.ingredients || [])}
                data-testid="button-pick-ingredients"
              >
                <Plus className="w-4 h-4" />
                Scegli ingredienti da aggiungere alla spesa
              </Button>
            </div>

            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-primary/20 text-primary"
                onClick={() => { setViewRecipe(null); setEditingMeal({ ...viewRecipe, ingredients: (viewRecipe.ingredients || []).join("\n") }); }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Modifica ricetta
              </Button>
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
                Aggiungi piatto alla dispensa
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
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Aggiungi alla spesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">Spunta gli ingredienti da aggiungere e scegli la categoria per ognuno.</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setIngPicker(prev => prev.map(i => ({ ...i, checked: true })))}>Seleziona tutti</Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setIngPicker(prev => prev.map(i => ({ ...i, checked: false })))}>Deseleziona</Button>
            </div>
            <div className="space-y-2">
              {ingPicker.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${item.checked ? "bg-primary/5 border-primary/30" : "bg-muted/20 border-transparent"}`}
                  data-testid={`ing-row-${idx}`}
                >
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={(v) => setIngPicker(prev => prev.map((p, i) => i === idx ? { ...p, checked: !!v } : p))}
                    data-testid={`checkbox-ing-${idx}`}
                  />
                  <Input
                    value={item.name}
                    onChange={(e) => setIngPicker(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                    className="flex-1 h-8 rounded-lg text-sm"
                    data-testid={`input-ing-name-${idx}`}
                  />
                  <Select value={item.category} onValueChange={(v) => setIngPicker(prev => prev.map((p, i) => i === idx ? { ...p, category: v } : p))}>
                    <SelectTrigger className="h-8 w-[130px] rounded-lg text-xs shrink-0" data-testid={`select-category-${idx}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(pantryCategories || []).map((c: any) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                      {(!pantryCategories || pantryCategories.length === 0) && (
                        <SelectItem value="altro">altro</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <Button
              onClick={handleAddSelectedToShopping}
              disabled={!ingPicker.some(i => i.checked && i.name.trim()) || createShoppingItem.isPending}
              className="w-full rounded-xl h-12 font-bold gap-2"
              data-testid="button-confirm-add-shopping"
            >
              {createShoppingItem.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><ShoppingCart className="w-4 h-4" /> Aggiungi {ingPicker.filter(i => i.checked).length} alla spesa</>}
            </Button>
          </div>
        </DialogContent>
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
              <Select value={productToCategory.category} onValueChange={(v) => setProductToCategory({ ...productToCategory, category: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
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
