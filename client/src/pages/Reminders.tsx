import { useState } from "react";
import { format, addDays, addWeeks } from "date-fns";
import { useReminders, useCreateReminder, useUpdateReminder, useDeleteReminder } from "@/hooks/use-bimi";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Bell, CalendarClock, BellOff, BellRing, Loader2 } from "lucide-react";

const DATE_PRESETS = [
  { value: "oggi",   label: "Oggi" },
  { value: "domani", label: "Domani" },
  { value: "2gg",    label: "Fra 2 giorni" },
  { value: "1sett",  label: "Fra 1 settimana" },
  { value: "2sett",  label: "Fra 2 settimane" },
  { value: "custom", label: "Scegli data..." },
];

function resolvePresetDate(preset: string): string {
  const today = new Date();
  switch (preset) {
    case "oggi":   return format(today, "yyyy-MM-dd");
    case "domani": return format(addDays(today, 1), "yyyy-MM-dd");
    case "2gg":    return format(addDays(today, 2), "yyyy-MM-dd");
    case "1sett":  return format(addWeeks(today, 1), "yyyy-MM-dd");
    case "2sett":  return format(addWeeks(today, 2), "yyyy-MM-dd");
    default:       return "";
  }
}

export default function Reminders() {
  const { data: reminders } = useReminders();
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: "", description: "", date: "", time: "" });
  const [datePreset, setDatePreset] = useState<string>("");

  const handlePresetChange = (value: string) => {
    setDatePreset(value);
    if (value !== "custom") {
      setNewReminder(r => ({ ...r, date: resolvePresetDate(value) }));
    } else {
      setNewReminder(r => ({ ...r, date: "" }));
    }
  };

  const handleAdd = async () => {
    if (!newReminder.title || !newReminder.date || !newReminder.time) return;
    const dateTime = new Date(`${newReminder.date}T${newReminder.time}`);
    await createReminder.mutateAsync({
      userId: 1,
      title: newReminder.title,
      description: newReminder.description || undefined,
      remindAt: dateTime,
      completed: false
    });
    setNewReminder({ title: "", description: "", date: "", time: "" });
    setDatePreset("");
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
          <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) { setNewReminder({ title: "", date: "", time: "" }); setDatePreset(""); } }}>
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
                  data-testid="input-reminder-title"
                />
                <Input
                  placeholder="Descrizione (opzionale) — apparirà nella notifica"
                  value={newReminder.description}
                  onChange={e => setNewReminder({ ...newReminder, description: e.target.value })}
                  className="rounded-xl"
                  data-testid="input-reminder-description"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Select value={datePreset} onValueChange={handlePresetChange}>
                      <SelectTrigger className="rounded-xl" data-testid="select-reminder-date-preset">
                        <SelectValue placeholder="Quando?" />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_PRESETS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {datePreset === "custom" && (
                      <Input
                        type="date"
                        value={newReminder.date}
                        onChange={e => setNewReminder({ ...newReminder, date: e.target.value })}
                        className="rounded-xl"
                        data-testid="input-reminder-date-custom"
                      />
                    )}
                  </div>
                  <Input
                    type="time"
                    value={newReminder.time}
                    onChange={e => setNewReminder({ ...newReminder, time: e.target.value })}
                    className="rounded-xl"
                    data-testid="input-reminder-time"
                  />
                </div>

                <Button
                  onClick={handleAdd}
                  className="rounded-xl font-bold w-full"
                  disabled={createReminder.isPending || !newReminder.title || !newReminder.date || !newReminder.time}
                  data-testid="button-create-reminder"
                >
                  {createReminder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crea Promemoria"}
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
                  data-testid={`checkbox-reminder-${reminder.id}`}
                />
                <div>
                  <p className={`font-bold text-base ${reminder.completed ? "line-through text-muted-foreground" : ""}`}>
                    {reminder.title}
                  </p>
                  {reminder.description && (
                    <p className={`text-xs mt-0.5 ${reminder.completed ? "line-through text-muted-foreground/60" : "text-muted-foreground"}`}>
                      {reminder.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
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
                data-testid={`button-delete-reminder-${reminder.id}`}
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
