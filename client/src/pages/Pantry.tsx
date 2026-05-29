import { useState, useMemo } from "react";
import { format, differenceInDays, isToday, isTomorrow } from "date-fns";
import {
  usePantryItems, useCreatePantryItem, useDeletePantryItem,
  useShoppingList, useCreateShoppingItem, useUpdateShoppingItem, useDeleteShoppingItem,
  usePantryCategories, useCreatePantryCategory, useUpdatePantryCategory, useDeletePantryCategory
} from "@/hooks/use-bimi";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Trash2, Refrigerator, Snowflake, Archive, ShoppingCart,
  Settings, Calendar, Wheat, Beef, Fish, Milk, Leaf, Container, Beer, HelpCircle,
  SprayCan, Cake, Coffee, Pizza, Wine, Package, Apple, CookingPot, Salad, Egg, Droplets, Candy
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  Archive, Wheat, Beef, Fish, Milk, Leaf, Container, Beer, HelpCircle,
  SprayCan, Cake, Coffee, Pizza, Wine, Package, Apple, CookingPot, Salad, Egg, Droplets, Candy
};

const ICON_LABELS: Record<string, string> = {
  Archive: "Scatola",
  Wheat: "Cereali",
  Beef: "Carne",
  Fish: "Pesce",
  Milk: "Latticini",
  Leaf: "Verdura",
  Container: "Contenitore",
  Beer: "Bevande",
  SprayCan: "Pulizie/Spray",
  Cake: "Dolci",
  Coffee: "Caffè",
  Pizza: "Pizze/Focacce",
  Wine: "Vino",
  Package: "Pacco",
  Apple: "Frutta",
  CookingPot: "Salse/Sughi",
  Salad: "Insalata",
  Egg: "Uova",
  Droplets: "Acqua/Liquidi",
  Candy: "Caramelle",
  HelpCircle: "Altro",
};

const getCategoryIcon = (iconName: string) => {
  const Icon = ICON_MAP[iconName] || HelpCircle;
  return <Icon className="w-4 h-4" />;
};

const getExpirationLabel = (date: string) => {
  const exp = new Date(date);
  const today = new Date();
  const diff = differenceInDays(exp, today);
  if (isToday(exp)) return "OGGI";
  if (isTomorrow(exp)) return "DOMANI";
  if (diff === 2) return "DOPODOMANI";
  if (diff >= 3 && diff <= 6) return `FRA ${diff} GG`;
  if (diff === 7) return "FRA 1 SETTIMANA";
  return format(exp, "dd/MM/yyyy");
};

// Quantity helpers: parses "2 1/2", "3/4", "1.5", "2" → number | null
function parseQty(s: string): number | null {
  if (!s?.trim()) return null;
  const t = s.trim();
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  const n = parseFloat(t);
  if (!isNaN(n) && t.match(/^[\d.]+$/)) return n;
  return null;
}

// Formats number → "2 1/2", "3", "1/4", "1.3"
function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const commonFracs = [[1,2],[1,3],[2,3],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,6],[5,6],[1,8],[3,8],[5,8],[7,8]];
  const whole = Math.floor(n);
  const decimal = n - whole;
  for (const [num, den] of commonFracs) {
    if (Math.abs(decimal - num / den) < 0.02) {
      return whole > 0 ? `${whole} ${num}/${den}` : `${num}/${den}`;
    }
  }
  return parseFloat(n.toFixed(2)).toString();
}

// Sum two quantity strings: "300g"+"200g"="500g"; "1"+"2 1/2"="3 1/2"; incompatible → keep a
function sumQty(a: string, b: string): string {
  // Unit-aware: "300g" + "200g" → "500g", "150ml" + "50ml" → "200ml"
  const unitMatch = (s: string) => s.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
  const ua = unitMatch(a); const ub = unitMatch(b);
  if (ua && ub && ua[2].toLowerCase() === ub[2].toLowerCase()) {
    const total = parseFloat(ua[1]) + parseFloat(ub[1]);
    const str = Number.isInteger(total) ? String(total) : parseFloat(total.toFixed(1)).toString();
    return str + ua[2];
  }
  // Plain number fallback (fractions etc.)
  const na = parseQty(a);
  const nb = parseQty(b);
  if (na !== null && nb !== null) return formatQty(na + nb);
  return a;
}

export default function Pantry() {
  const { data: pantry } = usePantryItems();
  const { data: categories } = usePantryCategories();
  const createCategory = useCreatePantryCategory();
  const updateCategory = useUpdatePantryCategory();
  const deleteCategory = useDeletePantryCategory();

  const queryClient = useQueryClient();
  const updatePantry = useMutation({
    mutationFn: async (item: any) => {
      const res = await apiRequest("PATCH", `/api/pantry/${item.id}`, item);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pantry"] });
    }
  });
  const createPantry = useCreatePantryItem();
  const deletePantry = useDeletePantryItem();

  const { data: shoppingList } = useShoppingList();
  const createShopping = useCreateShoppingItem();
  const updateShopping = useUpdateShoppingItem();
  const deleteShopping = useDeleteShoppingItem();

  const [activeTab, setActiveTab] = useState("dispensa");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showExpirationsOnly, setShowExpirationsOnly] = useState(false);

  const [newItem, setNewItem] = useState({ name: "", quantity: "1", date: "", category: "dispensa", subCategory: "altro" });
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newCategory, setNewCategory] = useState({ name: "", icon: "Archive" });

  const handleAddPantry = async () => {
    if (!newItem.name.trim()) return;
    await createPantry.mutateAsync({
      userId: 1,
      name: newItem.name,
      category: activeTab,
      subCategory: newItem.subCategory,
      quantity: newItem.quantity,
      expirationDate: newItem.date || null
    });
    setNewItem(prev => ({ ...prev, name: "", date: "", quantity: "1" }));
  };

  const handleMoveToFreezer = async (item: any) => {
    const updated = await updatePantry.mutateAsync({
      id: item.id, name: item.name, quantity: item.quantity,
      expirationDate: item.expirationDate, subCategory: item.subCategory, category: "freezer",
    });
    setEditingItem({ ...item, ...updated, category: "freezer" });
    setActiveTab("freezer");
  };

  const handleMoveToFridge = async (item: any) => {
    const tomorrow = format(new Date(Date.now() + 24 * 60 * 60 * 1000), "yyyy-MM-dd");
    const updated = await updatePantry.mutateAsync({
      id: item.id, name: item.name, quantity: item.quantity,
      expirationDate: tomorrow, subCategory: item.subCategory, category: "frigo",
    });
    setEditingItem({ ...item, ...updated, category: "frigo", expirationDate: tomorrow });
    setActiveTab("frigo");
  };

  const [newShopItem, setNewShopItem] = useState({ name: "", quantity: "1", subCategory: "altro" });
  const [editingShopItem, setEditingShopItem] = useState<any>(null);
  const [movingShopItem, setMovingShopItem] = useState<any>(null);
  const [moveTarget, setMoveTarget] = useState({ name: "", category: "dispensa", quantity: "1", expirationDate: "", subCategory: "altro" });

  const handleMoveShoppingToPantry = async () => {
    if (!movingShopItem) return;
    await createPantry.mutateAsync({
      userId: 1,
      name: moveTarget.name || movingShopItem.name,
      category: moveTarget.category,
      subCategory: moveTarget.subCategory,
      quantity: moveTarget.quantity,
      expirationDate: moveTarget.expirationDate || null,
    });
    await deleteShopping.mutateAsync(movingShopItem.id);
    setMovingShopItem(null);
    // Stay on lista tab — do NOT change activeTab
  };

  const handleAddShopping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopItem.name.trim()) return;
    const nameNorm = newShopItem.name.trim().toLowerCase();
    // Check for existing unchecked item with same name (case-insensitive)
    const existing = (shoppingList || []).find(
      i => !i.checked && i.name.trim().toLowerCase() === nameNorm
    );
    if (existing) {
      const newQty = sumQty(existing.quantity || "1", newShopItem.quantity || "1");
      await updateShopping.mutateAsync({ id: existing.id, quantity: newQty });
    } else {
      await createShopping.mutateAsync({
        userId: 1,
        name: newShopItem.name.trim(),
        subCategory: newShopItem.subCategory,
        quantity: newShopItem.quantity || "1",
        checked: false
      });
    }
    setNewShopItem({ name: "", quantity: "1", subCategory: newShopItem.subCategory });
  };

  const handleUpdatePantry = async () => {
    if (!editingItem) return;
    await updatePantry.mutateAsync({
      id: editingItem.id,
      name: editingItem.name,
      quantity: editingItem.quantity,
      expirationDate: editingItem.expirationDate,
      subCategory: editingItem.subCategory
    });
    setEditingItem(null);
  };

  const handleUpdateShopItem = async () => {
    if (!editingShopItem) return;
    await updateShopping.mutateAsync({ id: editingShopItem.id, name: editingShopItem.name, quantity: editingShopItem.quantity, subCategory: editingShopItem.subCategory });
    setEditingShopItem(null);
  };

  const getSortedShopping = () => {
    return (shoppingList || []).sort((a, b) => {
      // Unchecked first
      if (!a.checked && b.checked) return -1;
      if (a.checked && !b.checked) return 1;
      const catA = (categories || []).find(c => c.name === a.subCategory);
      const catB = (categories || []).find(c => c.name === b.subCategory);
      const orderA = catA?.order ?? 999;
      const orderB = catB?.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  };

  const groupedPantry = useMemo(() => {
    const items = (pantry || []).filter(p => p.category === activeTab);
    if (showExpirationsOnly) {
      return items.filter(i => i.expirationDate).sort((a, b) => a.expirationDate!.localeCompare(b.expirationDate!));
    }
    const groups: Record<string, any[]> = {};
    (categories || []).forEach(cat => {
      groups[cat.name] = items
        .filter(i => i.subCategory === cat.name)
        .sort((a, b) => {
          if (!a.expirationDate) return 1;
          if (!b.expirationDate) return -1;
          return a.expirationDate.localeCompare(b.expirationDate);
        });
    });
    const otherItems = items.filter(i => !(categories || []).some(c => c.name === i.subCategory));
    if (otherItems.length > 0) groups["Altro"] = otherItems;
    return groups;
  }, [pantry, activeTab, categories, showExpirationsOnly]);

  return (
    <div className="space-y-6 pb-20 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-primary">Dispensa</h1>
        <div className="flex gap-2">
          <Button
            variant={showExpirationsOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowExpirationsOnly(!showExpirationsOnly)}
            className="rounded-xl flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Scadenze</span>
          </Button>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-xl">
                <Settings className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gestisci Categorie</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground font-bold">Nome</label>
                    <Input
                      placeholder="Nuova categoria"
                      value={newCategory.name}
                      onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-bold">Icona</label>
                    <Select value={newCategory.icon} onValueChange={v => setNewCategory({ ...newCategory, icon: v })}>
                      <SelectTrigger className="w-32 rounded-xl">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(newCategory.icon)}
                          <span className="text-xs truncate">{ICON_LABELS[newCategory.icon] || newCategory.icon}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {Object.entries(ICON_LABELS).map(([icon, label]) => (
                          <SelectItem key={icon} value={icon}>
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(icon)}
                              <span>{label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      if (!newCategory.name.trim()) return;
                      createCategory.mutate({ ...newCategory, order: (categories?.length || 0) });
                      setNewCategory({ name: "", icon: "Archive" });
                    }}
                    className="rounded-xl shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {(categories || []).map(cat => (
                    <div key={cat.id} className="flex items-center justify-between bg-muted/30 p-2 rounded-xl">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(cat.icon)}
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteCategory.mutate(cat.id)} className="h-8 w-8 text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="dispensa" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 rounded-2xl p-1">
          <TabsTrigger value="dispensa" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"><Archive className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="frigo" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"><Refrigerator className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="freezer" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"><Snowflake className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="lista" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"><ShoppingCart className="w-4 h-4" /></TabsTrigger>
        </TabsList>

        <div className="mt-6 relative">
          {activeTab !== "lista" && (
            <div className="mb-4">
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold shadow-md">
                    <Plus className="w-5 h-5 mr-2" /> Aggiungi a {activeTab}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Nuovo Prodotto</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Input placeholder="Nome prodotto" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="rounded-xl" onKeyDown={e => e.key === "Enter" && handleAddPantry()} />
                    <Select value={newItem.subCategory} onValueChange={v => setNewItem({ ...newItem, subCategory: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Categoria" /></SelectTrigger>
                      <SelectContent>
                        {(categories || []).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        <SelectItem value="altro">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-4">
                      <Input placeholder="Quantità" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} className="rounded-xl" />
                      <Input type="date" value={newItem.date} onChange={e => setNewItem({ ...newItem, date: e.target.value })} className="rounded-xl" />
                    </div>
                    <Button onClick={handleAddPantry} className="rounded-xl font-bold" disabled={!newItem.name.trim()}>
                      <Plus className="w-4 h-4 mr-2" /> Aggiungi
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {["dispensa", "frigo", "freezer"].map(cat => (
            <TabsContent key={cat} value={cat} className="space-y-6">
              {showExpirationsOnly ? (
                <div className="space-y-3">
                  {(groupedPantry as any[]).map(item => (
                    <PantryItemCard
                      key={item.id}
                      item={item}
                      categories={categories}
                      onDelete={() => deletePantry.mutate(item.id)}
                      onEdit={() => setEditingItem(item)}
                      onMoveToFreezer={item.category !== "freezer" ? () => handleMoveToFreezer(item) : undefined}
                    />
                  ))}
                </div>
              ) : (
                Object.entries(groupedPantry).map(([groupName, items]) => (
                  items.length === 0 ? null : (
                    <div key={groupName} className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-border/50 pb-1">
                        {getCategoryIcon((categories || []).find(c => c.name === groupName)?.icon || "HelpCircle")}
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{groupName}</h3>
                      </div>
                      {(items as any[]).map(item => (
                        <PantryItemCard
                          key={item.id}
                          item={item}
                          categories={categories}
                          onDelete={() => deletePantry.mutate(item.id)}
                          onEdit={() => setEditingItem(item)}
                          onMoveToFreezer={cat !== "freezer" ? () => handleMoveToFreezer(item) : undefined}
                          onMoveToFridge={cat === "freezer" ? () => handleMoveToFridge(item) : undefined}
                        />
                      ))}
                    </div>
                  )
                ))
              )}
            </TabsContent>
          ))}

          {/* Shopping List Tab */}
          <TabsContent value="lista" className="space-y-4">
            <form onSubmit={handleAddShopping} className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Qtà"
                  value={newShopItem.quantity}
                  onChange={e => setNewShopItem({ ...newShopItem, quantity: e.target.value })}
                  className="rounded-xl shadow-sm w-20 shrink-0"
                  data-testid="input-shop-qty"
                />
                <Input
                  placeholder="Cosa devi comprare?"
                  value={newShopItem.name}
                  onChange={e => setNewShopItem({ ...newShopItem, name: e.target.value })}
                  className="rounded-xl shadow-sm flex-1"
                  data-testid="input-shop-name"
                />
                <Button type="submit" size="icon" className="rounded-xl shrink-0" disabled={!newShopItem.name.trim()}>
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              <Select value={newShopItem.subCategory} onValueChange={v => setNewShopItem({ ...newShopItem, subCategory: v })}>
                <SelectTrigger className="rounded-xl w-full">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {(categories || []).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </form>

            <div className="space-y-2">
              {getSortedShopping().map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-card p-3 rounded-xl border border-border shadow-sm"
                  data-testid={`shop-item-${item.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Checkbox
                      checked={item.checked || false}
                      onCheckedChange={(checked) => updateShopping.mutate({ id: item.id, checked: !!checked })}
                      className="rounded-md border-2 border-primary data-[state=checked]:bg-primary shrink-0"
                    />
                    <div
                      className="min-w-0 cursor-pointer flex-1"
                      onClick={() => setEditingShopItem({ ...item })}
                    >
                      <div className="flex items-center gap-1.5">
                        {item.quantity && item.quantity !== "1" && (
                          <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">{item.quantity}</span>
                        )}
                        <span className={item.checked ? "line-through text-muted-foreground break-words" : "font-medium break-words"}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold mt-0.5">
                        {getCategoryIcon((categories || []).find(c => c.name === item.subCategory)?.icon || "HelpCircle")}
                        <span>{item.subCategory}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.checked && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setMovingShopItem(item);
                          setMoveTarget({
                            name: item.name,
                            category: "dispensa",
                            quantity: item.quantity || "1",
                            expirationDate: "",
                            subCategory: item.subCategory || "altro",
                          });
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                        title="Sposta in dispensa"
                        data-testid={`button-move-to-pantry-${item.id}`}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteShopping.mutate(item.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Edit Pantry Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Modifica {editingItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input value={editingItem?.name || ""} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} className="rounded-xl" />
            <Select value={editingItem?.subCategory || "altro"} onValueChange={v => setEditingItem({ ...editingItem, subCategory: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(categories || []).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <Input value={editingItem?.quantity || ""} onChange={e => setEditingItem({ ...editingItem, quantity: e.target.value })} className="rounded-xl" placeholder="Quantità" />
              <Input type="date" value={editingItem?.expirationDate || ""} onChange={e => setEditingItem({ ...editingItem, expirationDate: e.target.value })} className="rounded-xl" />
            </div>
            <Button onClick={handleUpdatePantry} className="rounded-xl font-bold">Aggiorna</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Shopping Item Dialog */}
      <Dialog open={!!editingShopItem} onOpenChange={() => setEditingShopItem(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Modifica prodotto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Qtà"
                value={editingShopItem?.quantity || "1"}
                onChange={e => setEditingShopItem({ ...editingShopItem, quantity: e.target.value })}
                className="rounded-xl w-24"
              />
              <Input
                placeholder="Nome"
                value={editingShopItem?.name || ""}
                onChange={e => setEditingShopItem({ ...editingShopItem, name: e.target.value })}
                className="rounded-xl flex-1"
              />
            </div>
            <Select value={editingShopItem?.subCategory || "altro"} onValueChange={v => setEditingShopItem({ ...editingShopItem, subCategory: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(categories || []).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleUpdateShopItem} className="rounded-xl font-bold">Aggiorna</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move Shopping Item to Pantry Dialog */}
      <Dialog open={!!movingShopItem} onOpenChange={() => setMovingShopItem(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Sposta in dispensa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Editable name before moving */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Nome prodotto</label>
              <Input
                value={moveTarget.name}
                onChange={(e) => setMoveTarget({ ...moveTarget, name: e.target.value })}
                className="rounded-xl"
                data-testid="input-move-name"
              />
            </div>
            <Tabs value={moveTarget.category} onValueChange={(v) => setMoveTarget({ ...moveTarget, category: v })}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dispensa" data-testid="tab-move-dispensa"><Archive className="w-4 h-4 mr-1" />Dispensa</TabsTrigger>
                <TabsTrigger value="frigo" data-testid="tab-move-frigo"><Refrigerator className="w-4 h-4 mr-1" />Frigo</TabsTrigger>
                <TabsTrigger value="freezer" data-testid="tab-move-freezer"><Snowflake className="w-4 h-4 mr-1" />Freezer</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={moveTarget.subCategory} onValueChange={(v) => setMoveTarget({ ...moveTarget, subCategory: v })}>
              <SelectTrigger className="rounded-xl" data-testid="select-move-subcategory"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                {(categories || []).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Quantità"
                value={moveTarget.quantity}
                onChange={(e) => setMoveTarget({ ...moveTarget, quantity: e.target.value })}
                className="rounded-xl"
                data-testid="input-move-quantity"
              />
              <Input
                type="date"
                value={moveTarget.expirationDate}
                onChange={(e) => setMoveTarget({ ...moveTarget, expirationDate: e.target.value })}
                className="rounded-xl"
                data-testid="input-move-expiration"
              />
            </div>
            <Button onClick={handleMoveShoppingToPantry} className="rounded-xl font-bold" data-testid="button-confirm-move-to-pantry">
              Sposta in {moveTarget.category}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PantryItemCard({ item, categories, onDelete, onEdit, onMoveToFreezer, onMoveToFridge }: {
  item: any; categories: any[] | undefined; onDelete: () => void; onEdit: () => void;
  onMoveToFreezer?: () => void; onMoveToFridge?: () => void;
}) {
  const cat = (categories || []).find(c => c.name === item.subCategory);
  const expDiff = item.expirationDate ? differenceInDays(new Date(item.expirationDate), new Date()) : null;
  const expClass = expDiff !== null && expDiff <= 0 ? "text-red-500" : expDiff !== null && expDiff <= 3 ? "text-orange-500" : "text-muted-foreground";

  return (
    <div
      className="bg-card p-4 rounded-xl shadow-sm border border-border flex justify-between items-center group cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onEdit}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold break-words">{item.name}</p>
          {item.quantity && item.quantity !== "1" && (
            <span className="text-[10px] bg-secondary/30 text-secondary-foreground px-1.5 py-0.5 rounded-full font-bold">{item.quantity}</span>
          )}
          <div className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-bold">
            {getCategoryIcon(cat?.icon || "HelpCircle")}
            <span>{item.subCategory}</span>
          </div>
        </div>
        {item.expirationDate && (
          <p className={`text-xs font-semibold mt-1 ${expClass}`}>
            Scade: {getExpirationLabel(item.expirationDate)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
        {onMoveToFreezer && (
          <Button variant="ghost" size="sm" className="h-8 text-[10px] text-blue-500 hover:bg-blue-50 px-2 rounded-lg" onClick={onMoveToFreezer}>
            <Snowflake className="w-3 h-3 mr-1" />Freezer
          </Button>
        )}
        {onMoveToFridge && (
          <Button variant="ghost" size="sm" className="h-8 text-[10px] text-cyan-500 hover:bg-cyan-50 px-2 rounded-lg" onClick={onMoveToFridge}>
            <Refrigerator className="w-3 h-3 mr-1" />Frigo
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
