import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { 
  type InsertDailyLog, type InsertMeal, type InsertPantryItem, 
  type InsertShoppingListItem, type InsertReminder, type InsertUser,
  type UpdatePantryItemRequest, type UpdateShoppingListItemRequest, type UpdateReminderRequest
} from "@shared/schema";

// --- Users ---
export function useUser() {
  return useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user/1", { credentials: "include" }); // Assuming user 1
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<InsertUser>) => {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });
}

// --- Daily Logs ---
export function useDailyLogs() {
  return useQuery({
    queryKey: [api.dailyLogs.list.path],
    queryFn: async () => {
      const res = await fetch("/api/daily-logs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch daily logs");
      const data = await res.json();
      return z.array(z.object({
        id: z.number(),
        userId: z.number(),
        date: z.string(),
        menstrualPhase: z.string().nullable(),
        flow: z.string().nullable(),
        intercourse: z.boolean().nullable(),
        defecated: z.boolean().nullable(),
        notes: z.string().nullable(),
      })).parse(data);
    },
  });
}

export function useDailyLog(date: string) {
  return useQuery({
    queryKey: [api.dailyLogs.get.path, date],
    queryFn: async () => {
      const url = buildUrl(api.dailyLogs.get.path, { date });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch daily log");
      return api.dailyLogs.get.responses[200].parse(await res.json());
    },
  });
}

export function useUpsertDailyLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertDailyLog) => {
      const res = await fetch(api.dailyLogs.upsert.path, {
        method: api.dailyLogs.upsert.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update daily log");
      return api.dailyLogs.upsert.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.dailyLogs.get.path, variables.date] });
    },
  });
}

// --- Meals ---
export function useMeals(date?: string) {
  return useQuery({
    queryKey: [api.meals.list.path, date],
    queryFn: async () => {
      let url = api.meals.list.path;
      if (date) {
        url += `?date=${date}`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch meals");
      return api.meals.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertMeal) => {
      const res = await fetch(api.meals.create.path, {
        method: api.meals.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create meal");
      return api.meals.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.meals.list.path] });
      // Also invalidate daily logs as it might affect summaries if we had them computed there
    },
  });
}

export function useDeleteMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.meals.delete.path, { id });
      const res = await fetch(url, { method: api.meals.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete meal");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.meals.list.path] }),
  });
}

export function useUpdateMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertMeal>) => {
      const url = buildUrl(api.meals.delete.path.replace(':id', String(id)), {}); // Temporary fix for URL building
      const res = await fetch(`/api/meals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update meal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.meals.list.path] });
    },
  });
}

export function useGenerateMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { prompt: string, date: string, mealType: string, servings: number, usePantry: boolean }) => {
      const res = await fetch("/api/meals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate meal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.meals.list.path] });
    },
  });
}

export function useAddToShoppingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ingredients: string[]) => {
      const res = await fetch("/api/meals/add-to-shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add to shopping list");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shoppingList.list.path] });
    },
  });
}

// --- Pantry ---
export function usePantryItems() {
  return useQuery({
    queryKey: [api.pantry.list.path],
    queryFn: async () => {
      const res = await fetch(api.pantry.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pantry items");
      return api.pantry.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreatePantryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertPantryItem) => {
      const res = await fetch(api.pantry.create.path, {
        method: api.pantry.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create pantry item");
      return api.pantry.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.pantry.list.path] }),
  });
}

export function useUpdatePantryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdatePantryItemRequest) => {
      const url = buildUrl(api.pantry.update.path, { id });
      const res = await fetch(url, {
        method: api.pantry.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update pantry item");
      return api.pantry.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.pantry.list.path] }),
  });
}

export function useDeletePantryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.pantry.delete.path, { id });
      const res = await fetch(url, { method: api.pantry.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete pantry item");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.pantry.list.path] }),
  });
}

// --- Shopping List ---
export function useShoppingList() {
  return useQuery({
    queryKey: [api.shoppingList.list.path],
    queryFn: async () => {
      const res = await fetch(api.shoppingList.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shopping list");
      return api.shoppingList.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertShoppingListItem) => {
      const res = await fetch(api.shoppingList.create.path, {
        method: api.shoppingList.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create shopping item");
      return api.shoppingList.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.shoppingList.list.path] }),
  });
}

export function useUpdateShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateShoppingListItemRequest) => {
      const url = buildUrl(api.shoppingList.update.path, { id });
      const res = await fetch(url, {
        method: api.shoppingList.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update shopping item");
      return api.shoppingList.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.shoppingList.list.path] }),
  });
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.shoppingList.delete.path, { id });
      const res = await fetch(url, { method: api.shoppingList.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete shopping item");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.shoppingList.list.path] }),
  });
}

// --- Reminders ---
export function useReminders() {
  return useQuery({
    queryKey: [api.reminders.list.path],
    queryFn: async () => {
      const res = await fetch(api.reminders.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reminders");
      // Map strings back to Date objects if needed, but react-query usually handles JSON
      // We might need z.coerce.date() in schema if not already there, or manual parsing
      const data = await res.json();
      return api.reminders.list.responses[200].parse(data).map(r => ({
        ...r,
        remindAt: new Date(r.remindAt) // Ensure Date object
      }));
    },
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertReminder) => {
      const res = await fetch(api.reminders.create.path, {
        method: api.reminders.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create reminder");
      return api.reminders.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.reminders.list.path] }),
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateReminderRequest) => {
      const url = buildUrl(api.reminders.update.path, { id });
      const res = await fetch(url, {
        method: api.reminders.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update reminder");
      return api.reminders.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.reminders.list.path] }),
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.reminders.delete.path, { id });
      const res = await fetch(url, { method: api.reminders.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete reminder");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.reminders.list.path] }),
  });
}

// --- Pantry Categories ---
export function usePantryCategories() {
  return useQuery({
    queryKey: ["/api/pantry-categories"],
    queryFn: async () => {
      const res = await fetch("/api/pantry-categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });
}

export function useCreatePantryCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/pantry-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pantry-categories"] }),
  });
}

export function useUpdatePantryCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & any) => {
      const res = await fetch(`/api/pantry-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pantry-categories"] }),
  });
}

export function useDeletePantryCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/pantry-categories/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pantry-categories"] }),
  });
}

// --- Daily Checks ---
export function useDailyChecks() {
  return useQuery<any[]>({
    queryKey: ["/api/daily-checks"],
    queryFn: async () => {
      const res = await fetch("/api/daily-checks");
      if (!res.ok) throw new Error("Failed to fetch daily checks");
      return res.json();
    },
  });
}

export function useCreateDailyCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; color: string; trackDays?: boolean; order?: number }) => {
      const res = await fetch("/api/daily-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/daily-checks"] }),
  });
}

export function useUpdateDailyCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & any) => {
      const res = await fetch(`/api/daily-checks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/daily-checks"] }),
  });
}

export function useDeleteDailyCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/daily-checks/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-checks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-check-logs"] });
    },
  });
}

export function useDailyCheckLogs() {
  return useQuery<any[]>({
    queryKey: ["/api/daily-check-logs"],
    queryFn: async () => {
      const res = await fetch("/api/daily-check-logs");
      if (!res.ok) throw new Error("Failed to fetch daily check logs");
      return res.json();
    },
  });
}

export function useToggleDailyCheckLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { checkId: number; date: string; checked: boolean }) => {
      const res = await fetch("/api/daily-check-logs/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/daily-check-logs"] }),
  });
}

// --- Chat ---
export function useChat() {
  return useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(api.chat.message.path, {
        method: api.chat.message.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to send message");
      return api.chat.message.responses[200].parse(await res.json());
    }
  });
}
