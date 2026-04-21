import { useState } from "react";
import { format, addDays, addWeeks } from "date-fns";
import { useReminders, useCreateReminder, useUpdateReminder, useDeleteReminder } from "@/hooks/use-bimi";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Bell, CalendarClock, BellOff, BellRing, Loader2, Pencil } from "lucide-react";
import type { Reminder } from "@shared/schema";

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

const emptyForm = { title: "", description: "", date: "", time: "" };

export default function Reminders() {
  const { data: reminders } = useReminders();
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newReminder, setNewReminder] = useState(emptyForm);
  const [datePreset, setDatePreset] = useState<string>("");

  const [editReminder, setEditReminder] = useState<Reminder | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editPreset, setEditPreset] = useState<string>("custom");

  const handlePresetChange = (value: string, setter: typeof setNewReminder) => {
    setDatePreset(value);
    if (value !== "custom") setter(r => ({ ...r, date: resolvePresetDate(value) }));
    else setter(r => ({ ...r, date: "" }));
  };

  const handleEditPresetChange = (value: string) => {
    setEditPreset(value);
    if (value !== "custom") setEditForm(r => ({ ...r, date: resolvePresetDate(value) }));
    else setEditForm(r => ({ ...r, date: "" }));
  };

  const handleAdd = async () => {
    if (!newReminder.title || !newReminder.date || !newReminder.time) return;
    await createReminder.mutateAsync({
      userId: 1,
      title: newReminder.title,
      description: newReminder.description || undefined,
      remindAt: new Date(`${newReminder.date}T${newReminder.time}`),
      completed: false,
    });
    setNewReminder(emptyForm);
    setDatePreset("");
    setIsCreateOpen(false);
  };

  const openEdit = (r: Reminder) => {
    const dt = new Date(r.remindAt);
    setEditReminder(r);
    setEditForm({
      title: r.title,
      description: r.description || "",
      date: format(dt, "yyyy-MM-dd"),
      time: format(dt, "HH:mm"),
    });
    setEditPreset("custom");
  };

  const handleEditSave = async () => {
    if (!editReminder || !editForm.title || !editForm.date || !editForm.time) return;
    await updateReminder.mutateAsync({
      id: editReminder.id,
      title: editForm.title,
      description: editForm.description || undefined,
      remindAt: new Date(`${editForm.date}T${editForm.time}`),
      completed: editReminder.completed ?? false,
    });
    setEditReminder(null);
  };

  const sortedReminders = [...(reminders || [])].sort(
    (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
  );

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
                : isSubscribed ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </Button>
          )}

          {/* Crea nuovo */}
          <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) { setNewReminder(emptyForm); setDatePreset(""); } }}>
            <DialogTrigger asChild>
              <Button size="icon" className="rounded-full shadow-md bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <Plus className="w-6 h-6" />
              </Button>
            </DialogTrigger>
            <ReminderFormDialog
              title="Nuovo Promemoria"
              form={newReminder}
              datePreset={datePreset}
              onFormChange={setNewReminder}
              onPresetChange={(v) => handlePresetChange(v, setNewReminder)}
              onSave={handleAdd}
              isPending={createReminder.isPending}
              saveLabel="Crea Promemoria"
            />
          </Dialog>
        </div>
      </div>

      {/* Modifica dialog */}
      <Dialog open={!!editReminder} onOpenChange={(o) => { if (!o) setEditReminder(null); }}>
        <ReminderFormDialog
          title="Modifica Promemoria"
          form={editForm}
          datePreset={editPreset}
          onFormChange={setEditForm}
          onPresetChange={handleEditPresetChange}
          onSave={handleEditSave}
          isPending={updateReminder.isPending}
          saveLabel="Salva modifiche"
        />
      </Dialog>

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
            <div key={reminder.id} className="bg-card p-4 rounded-xl shadow-sm border border-border flex items-center gap-3 hover:shadow-md transition-shadow">
              <Checkbox
                checked={reminder.completed || false}
                onCheckedChange={(c) => updateReminder.mutate({ id: reminder.id, completed: !!c })}
                className="w-6 h-6 rounded-full border-2 border-primary data-[state=checked]:bg-primary shrink-0"
                data-testid={`checkbox-reminder-${reminder.id}`}
              />
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-base break-words ${reminder.completed ? "line-through text-muted-foreground" : ""}`}>
                  {reminder.title}
                </p>
                {reminder.description && (
                  <p className={`text-xs mt-0.5 break-words ${reminder.completed ? "line-through text-muted-foreground/60" : "text-muted-foreground"}`}>
                    {reminder.description}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Bell className="w-3 h-3 shrink-0" />
                  {format(new Date(reminder.remindAt), "d MMM yyyy, HH:mm")}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(reminder)}
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                  data-testid={`button-edit-reminder-${reminder.id}`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}

type FormState = { title: string; description: string; date: string; time: string };

function ReminderFormDialog({
  title, form, datePreset, onFormChange, onPresetChange, onSave, isPending, saveLabel,
}: {
  title: string;
  form: FormState;
  datePreset: string;
  onFormChange: (f: FormState) => void;
  onPresetChange: (v: string) => void;
  onSave: () => void;
  isPending: boolean;
  saveLabel: string;
}) {
  return (
    <DialogContent className="sm:max-w-md rounded-2xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <Input
          placeholder="Cosa devi ricordare?"
          value={form.title}
          onChange={e => onFormChange({ ...form, title: e.target.value })}
          className="rounded-xl"
        />
        <Input
          placeholder="Descrizione (opzionale) — apparirà nella notifica"
          value={form.description}
          onChange={e => onFormChange({ ...form, description: e.target.value })}
          className="rounded-xl"
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Select value={datePreset} onValueChange={onPresetChange}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Quando?" />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(datePreset === "custom" || !datePreset) && (
              <Input
                type="date"
                value={form.date}
                onChange={e => onFormChange({ ...form, date: e.target.value })}
                className="rounded-xl"
              />
            )}
          </div>
          <Input
            type="time"
            value={form.time}
            onChange={e => onFormChange({ ...form, time: e.target.value })}
            className="rounded-xl"
          />
        </div>
        <Button
          onClick={onSave}
          className="rounded-xl font-bold w-full"
          disabled={isPending || !form.title || !form.date || !form.time}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saveLabel}
        </Button>
      </div>
    </DialogContent>
  );
}
