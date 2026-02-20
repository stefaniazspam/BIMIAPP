import { useState } from "react";
import { format } from "date-fns";
import { usePantryItems, useCreatePantryItem, useDeletePantryItem, useShoppingList, useCreateShoppingItem, useUpdateShoppingItem, useDeleteShoppingItem } from "@/hooks/use-bimi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Refrigerator, Snowflake, Archive, ShoppingCart } from "lucide-react";

export default function Pantry() {
  const { data: pantry } = usePantryItems();
  const createPantry = useCreatePantryItem();
  const deletePantry = useDeletePantryItem();
  
  const { data: shoppingList } = useShoppingList();
  const createShopping = useCreateShoppingItem();
  const updateShopping = useUpdateShoppingItem();
  const deleteShopping = useDeleteShoppingItem();

  const [activeTab, setActiveTab] = useState("dispensa");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", quantity: "1", date: "", category: "dispensa" });
  const [newShopItem, setNewShopItem] = useState("");

  const handleAddPantry = async () => {
    await createPantry.mutateAsync({
      userId: 1,
      name: newItem.name,
      category: activeTab, // use current tab as default category
      quantity: Number(newItem.quantity),
      expirationDate: newItem.date || null
    });
    setNewItem({ name: "", quantity: "1", date: "", category: "dispensa" });
    setIsAddOpen(false);
  };

  const handleAddShopping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopItem.trim()) return;
    await createShopping.mutateAsync({
      userId: 1,
      name: newShopItem,
      quantity: 1,
      checked: false
    });
    setNewShopItem("");
  };

  const getPantryList = (category: string) => pantry?.filter(p => p.category === category) || [];

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
                    <div className="grid grid-cols-2 gap-4">
                      <Input type="number" placeholder="Quantità" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className="rounded-xl" />
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
              {getPantryList(cat).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-2xl border-2 border-dashed border-muted/50">
                  Vuoto! Aggiungi qualcosa.
                </div>
              ) : (
                getPantryList(cat).map(item => (
                  <div key={item.id} className="bg-card p-4 rounded-xl shadow-sm border border-border flex justify-between items-center group">
                    <div>
                      <p className="font-bold">{item.name}</p>
                      {item.expirationDate && (
                        <p className={`text-xs ${new Date(item.expirationDate) < new Date() ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                          Scade: {format(new Date(item.expirationDate), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-muted px-2 py-1 rounded-md text-xs font-mono">{item.quantity}</span>
                      <Button variant="ghost" size="icon" onClick={() => deletePantry.mutate(item.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          ))}

          <TabsContent value="lista" className="space-y-4">
            <form onSubmit={handleAddShopping} className="flex gap-2">
              <Input 
                placeholder="Cosa devi comprare?" 
                value={newShopItem} 
                onChange={e => setNewShopItem(e.target.value)}
                className="rounded-xl shadow-sm"
              />
              <Button type="submit" size="icon" className="rounded-xl shrink-0" disabled={!newShopItem.trim()}>
                <Plus className="w-5 h-5" />
              </Button>
            </form>

            <div className="space-y-2">
              {shoppingList?.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-card p-3 rounded-xl border border-border shadow-sm">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={item.checked || false} 
                      onCheckedChange={(checked) => updateShopping.mutate({ id: item.id, checked: !!checked })}
                      className="rounded-md border-2 border-primary data-[state=checked]:bg-primary"
                    />
                    <span className={item.checked ? "line-through text-muted-foreground" : "font-medium"}>
                      {item.name}
                    </span>
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
    </div>
  );
}
