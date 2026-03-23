import { useState } from "react";
import { format } from "date-fns";
import { useReminders, useCreateReminder, useUpdateReminder, useDeleteReminder } from "@/hooks/use-bimi";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Bell, CalendarClock, BellOff, BellRing, Loader2 } from "lucide-react";

export default function Reminders() {
  const { data: reminders } = useReminders();
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: "", date: "", time: "" });

  const handleAdd = async () => {
    if (!newReminder.title || !newReminder.date || !newReminder.time) return;
    const dateTime = new Date(`${newReminder.date}T${newReminder.time}`);
    await createReminder.mutateAsync({
      userId: 1,
      title: newReminder.title,
      remindAt: dateTime,
      completed: false
    });
    setNewReminder({ title: "", date: "", time: "" });
    setIsOpen(false);
  };

  const sortedReminders = reminders?.sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()) || [];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-primary">Promemoria</h1>
        <div className="flex items-center gap-2">
          {isSupported && permission !== "denied" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={isLoading}
              className={`rounded-full ${isSubscribed ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"}`}
              title={isSubscribed ? "Notifiche attive — clicca per disattivare" : "Attiva notifiche push"}
            >
              {isLoading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : isSubscribed
                  ? <BellRing className="w-5 h-5" />
                  : <BellOff className="w-5 h-5" />
              }
            </Button>
          )}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="rounded-full shadow-md bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <Plus className="w-6 h-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Nuovo Promemoria</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input
                  placeholder="Cosa devi ricordare?"
                  value={newReminder.title}
                  onChange={e => setNewReminder({ ...newReminder, title: e.target.value })}
                  className="rounded-xl"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input type="date" value={newReminder.date} onChange={e => setNewReminder({ ...newReminder, date: e.target.value })} className="rounded-xl" />
                  <Input type="time" value={newReminder.time} onChange={e => setNewReminder({ ...newReminder, time: e.target.value })} className="rounded-xl" />
                </div>
                <Button onClick={handleAdd} className="rounded-xl font-bold w-full" disabled={createReminder.isPending}>
                  Crea Promemoria
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isSupported && !isSubscribed && permission !== "denied" && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">Attiva le notifiche</p>
            <p className="text-xs text-muted-foreground">Ricevi un avviso anche quando l'app è chiusa</p>
          </div>
          <Button size="sm" onClick={subscribe} disabled={isLoading} className="rounded-full text-xs shrink-0">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Attiva"}
          </Button>
        </div>
      )}

      {permission === "denied" && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3">
          <BellOff className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Notifiche bloccate</p>
            <p className="text-xs text-muted-foreground">Vai nelle impostazioni del tuo telefono per abilitarle per questo sito</p>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {sortedReminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/10 rounded-3xl border-2 border-dashed border-muted/30">
            <CalendarClock className="w-12 h-12 mb-2 opacity-50" />
            <p>Non hai promemoria attivi</p>
          </div>
        ) : (
          sortedReminders.map(reminder => (
            <div key={reminder.id} className="bg-card p-4 rounded-xl shadow-sm border border-border flex items-center justify-between group hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={reminder.completed || false}
                  onCheckedChange={(c) => updateReminder.mutate({ id: reminder.id, completed: !!c })}
                  className="w-6 h-6 rounded-full border-2 border-primary data-[state=checked]:bg-primary"
                />
                <div>
                  <p className={`font-bold text-base ${reminder.completed ? "line-through text-muted-foreground" : ""}`}>
                    {reminder.title}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Bell className="w-3 h-3" />
                    {format(new Date(reminder.remindAt), "d MMM yyyy, HH:mm")}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteReminder.mutate(reminder.id)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
