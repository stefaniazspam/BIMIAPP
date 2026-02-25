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
  Settings, Calendar, Wheat, Beef, Fish, Milk, Leaf, Container, Beer, HelpCircle 
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  Archive, Wheat, Beef, Fish, Milk, Leaf, Container, Beer, HelpCircle
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
    await createPantry.mutateAsync({
      userId: 1,
      name: newItem.name,
      category: activeTab,
      subCategory: newItem.subCategory,
      quantity: newItem.quantity,
      expirationDate: newItem.date || null
    });
    setNewItem({ name: "", quantity: "1", date: "", category: "dispensa", subCategory: "altro" });
    setIsAddOpen(false);
  };

  const [newShopItem, setNewShopItem] = useState({ name: "", subCategory: "altro" });

  const handleAddShopping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopItem.name.trim()) return;
    await createShopping.mutateAsync({
      userId: 1,
      name: newShopItem.name,
      subCategory: newShopItem.subCategory,
      quantity: "1",
      checked: false
    });
    setNewShopItem({ name: "", subCategory: "altro" });
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

  const getSortedShopping = () => {
    return (shoppingList || []).sort((a, b) => {
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
      return items
        .filter(i => i.expirationDate)
        .sort((a, b) => a.expirationDate!.localeCompare(b.expirationDate!));
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

    // Handle "Altro" or items without category
    const otherItems = items.filter(i => !(categories || []).some(c => c.name === i.subCategory));
    if (otherItems.length > 0) {
      groups["Altro"] = otherItems;
    }

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
                <div className="flex gap-2">
                  <Input placeholder="Nuova categoria" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="rounded-xl" />
                  <Select value={newCategory.icon} onValueChange={v => setNewCategory({...newCategory, icon: v})}>
                    <SelectTrigger className="w-20 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(ICON_MAP).map(icon => (
                        <SelectItem key={icon} value={icon}>{getCategoryIcon(icon)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => { createCategory.mutate({...newCategory, order: (categories?.length || 0)}); setNewCategory({name:"", icon:"Archive"}); }} className="rounded-xl">Add</Button>
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
                    <Input placeholder="Nome prodotto" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="rounded-xl" />
                    <Select value={newItem.subCategory} onValueChange={v => setNewItem({...newItem, subCategory: v})}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {(categories || []).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        <SelectItem value="altro">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-4">
                      <Input placeholder="Quantità" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className="rounded-xl" />
                      <Input type="date" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} className="rounded-xl" />
                    </div>
                    <Button onClick={handleAddPantry} className="rounded-xl font-bold">Salva</Button>
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
                    <PantryItemCard key={item.id} item={item} categories={categories} onDelete={() => deletePantry.mutate(item.id)} onEdit={() => setEditingItem(item)} />
                  ))}
                </div>
              ) : (
                Object.entries(groupedPantry).map(([groupName, items]) => (
                  <div key={groupName} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-border/50 pb-1">
                      {getCategoryIcon((categories || []).find(c => c.name === groupName)?.icon || "HelpCircle")}
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{groupName}</h3>
                    </div>
                    {(items as any[]).map(item => (
                      <PantryItemCard key={item.id} item={item} categories={categories} onDelete={() => deletePantry.mutate(item.id)} onEdit={() => setEditingItem(item)} />
                    ))}
                  </div>
                ))
              )}
            </TabsContent>
          ))}

          <TabsContent value="lista" className="space-y-4">
            <form onSubmit={handleAddShopping} className="space-y-2">
              <div className="flex gap-2">
                <Input 
                  placeholder="Cosa devi comprare?" 
                  value={newShopItem.name} 
                  onChange={e => setNewShopItem({...newShopItem, name: e.target.value})}
                  className="rounded-xl shadow-sm"
                />
                <Button type="submit" size="icon" className="rounded-xl shrink-0" disabled={!newShopItem.name.trim()}>
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              <Select value={newShopItem.subCategory} onValueChange={v => setNewShopItem({...newShopItem, subCategory: v})}>
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
                <div key={item.id} className="flex items-center justify-between bg-card p-3 rounded-xl border border-border shadow-sm">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={item.checked || false} 
                      onCheckedChange={(checked) => updateShopping.mutate({ id: item.id, checked: !!checked })}
                      className="rounded-md border-2 border-primary data-[state=checked]:bg-primary"
                    />
                    <div>
                      <span className={item.checked ? "line-through text-muted-foreground" : "font-medium"}>
                        {item.name}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold">
                        {getCategoryIcon((categories || []).find(c => c.name === item.subCategory)?.icon || "HelpCircle")}
                        <span>{item.subCategory}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteShopping.mutate(item.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Modifica {editingItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input value={editingItem?.name || ""} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="rounded-xl" />
            <Select value={editingItem?.subCategory || "altro"} onValueChange={v => setEditingItem({...editingItem, subCategory: v})}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(categories || []).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <Input value={editingItem?.quantity || ""} onChange={e => setEditingItem({...editingItem, quantity: e.target.value})} className="rounded-xl" />
              <Input type="date" value={editingItem?.expirationDate || ""} onChange={e => setEditingItem({...editingItem, expirationDate: e.target.value})} className="rounded-xl" />
            </div>
            <Button onClick={handleUpdatePantry} className="rounded-xl font-bold">Aggiorna</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PantryItemCard({ item, categories, onDelete, onEdit }: { item: any, categories: any[] | undefined, onDelete: () => void, onEdit: () => void }) {
  const cat = (categories || []).find(c => c.name === item.subCategory);
  return (
    <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex justify-between items-center group cursor-pointer hover:border-primary/50 transition-colors" onClick={onEdit}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-bold">{item.name}</p>
          <div className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-bold">
            {getCategoryIcon(cat?.icon || "HelpCircle")}
            <span>{item.subCategory}</span>
          </div>
        </div>
        {item.expirationDate && (
          <p className={`text-xs ${new Date(item.expirationDate) < new Date() ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
            Scade: {getExpirationLabel(item.expirationDate)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="bg-muted px-2 py-1 rounded-md text-xs font-mono">{item.quantity}</span>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
