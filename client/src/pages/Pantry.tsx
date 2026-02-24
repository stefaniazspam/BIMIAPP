import { useState } from "react";
import { format, differenceInDays, isToday, isTomorrow } from "date-fns";
import { usePantryItems, useCreatePantryItem, useDeletePantryItem, useShoppingList, useCreateShoppingItem, useUpdateShoppingItem, useDeleteShoppingItem } from "@/hooks/use-bimi";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Refrigerator, Snowflake, Archive, ShoppingCart } from "lucide-react";

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
  const [newItem, setNewItem] = useState({ name: "", quantity: "1", date: "", category: "dispensa", subCategory: "altro" });
  const [editingItem, setEditingItem] = useState<any>(null);

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
      const priority: Record<string, number> = { 
        panificati: 1, 
        carne: 2, 
        pesce: 3, 
        latticini: 4, 
        frutta_verdura: 5, 
        conserve: 6, 
        bevande: 7, 
        altro: 8 
      };
      const subA = priority[a.subCategory || "altro"] || 9;
      const subB = priority[b.subCategory || "altro"] || 9;
      if (subA !== subB) return subA - subB;
      return a.name.localeCompare(b.name);
    });
  };

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

  const getSortedPantry = (cat: string) => {
    return (pantry || [])
      .filter(p => p.category === cat)
      .sort((a, b) => {
        // Sort by subCategory priority
        const priority: Record<string, number> = { 
          panificati: 1, 
          carne: 2, 
          pesce: 3, 
          latticini: 4, 
          frutta_verdura: 5, 
          conserve: 6, 
          bevande: 7, 
          altro: 8 
        };
        const subA = priority[a.subCategory || "altro"] || 5;
        const subB = priority[b.subCategory || "altro"] || 5;
        if (subA !== subB) return subA - subB;
        // Then by expiration date
        if (!a.expirationDate) return 1;
        if (!b.expirationDate) return -1;
        return a.expirationDate.localeCompare(b.expirationDate);
      });
  };

  return (
    <div className="space-y-6 pb-20 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-primary">Dispensa & Spesa</h1>
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
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-4">
                      <Input placeholder="Quantità (es: 2kg, 1 pacco)" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className="rounded-xl" />
                      <Input type="date" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} className="rounded-xl" />
                    </div>
                    <Button onClick={handleAddPantry} className="rounded-xl font-bold">Salva</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {["dispensa", "frigo", "freezer"].map(cat => (
            <TabsContent key={cat} value={cat} className="space-y-3">
              {getSortedPantry(cat).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-2xl border-2 border-dashed border-muted/50">
                  Vuoto! Aggiungi qualcosa.
                </div>
              ) : (
                getSortedPantry(cat).map(item => (
                  <div key={item.id} className="bg-card p-4 rounded-xl shadow-sm border border-border flex justify-between items-center group cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setEditingItem(item)}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{item.name}</p>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-bold">{item.subCategory}</span>
                      </div>
                      {item.expirationDate && (
                        <p className={`text-xs ${new Date(item.expirationDate) < new Date() ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                          Scade: {getExpirationLabel(item.expirationDate)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-muted px-2 py-1 rounded-md text-xs font-mono">{item.quantity}</span>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deletePantry.mutate(item.id); }} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
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
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">{item.subCategory}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteShopping.mutate(item.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {shoppingList?.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">La lista è vuota! 🎉</p>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Modifica {editingItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Nome</label>
              <Input value={editingItem?.name || ""} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Categoria</label>
              <Select value={editingItem?.subCategory || "altro"} onValueChange={v => setEditingItem({...editingItem, subCategory: v})}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Quantità</label>
                <Input value={editingItem?.quantity || ""} onChange={e => setEditingItem({...editingItem, quantity: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Scadenza</label>
                <Input type="date" value={editingItem?.expirationDate || ""} onChange={e => setEditingItem({...editingItem, expirationDate: e.target.value})} className="rounded-xl" />
              </div>
            </div>
            <Button onClick={handleUpdatePantry} className="rounded-xl font-bold">Aggiorna</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
