import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Users (MVP: single default user) ---
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  cycleDuration: integer("cycle_duration").default(28),
  periodDuration: integer("period_duration").default(5),
});

// --- Daily Logs (Menstrual cycle, defecation, general notes) ---
export const dailyLogs = pgTable("daily_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull().unique(), // YYYY-MM-DD
  menstrualPhase: text("menstrual_phase"), // 'follicular', 'ovulation', 'luteal', 'menstrual'
  flow: text("flow"), // 'light', 'medium', 'heavy'
  intercourse: boolean("intercourse").default(false),
  defecated: boolean("defecated").default(false),
  waterIntake: integer("water_intake").default(0),
  notes: text("notes"),
});

// --- Meals (Pasti) ---
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  mealType: text("meal_type").notNull(), // 'breakfast', 'lunch', 'dinner', 'snack'
  name: text("name").notNull(),
  recipe: text("recipe"),
  ingredients: text("ingredients").array(),
  servings: integer("servings").default(1),
  isPlanned: boolean("is_planned").default(false),
  calories: integer("calories"),
  protein: integer("protein"),
  carbs: integer("carbs"),
  fat: integer("fat"),
  imageUrl: text("image_url"),
});

// --- Pantry (Dispensa, Frigo, Freezer) ---
export const pantryItems = pgTable("pantry_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'dispensa', 'frigo', 'freezer'
  subCategory: text("sub_category").notNull().default("altro"), // 'panificati', 'carne', 'pesce', 'altro'
  quantity: text("quantity").notNull().default("1"),
  expirationDate: text("expiration_date"), // YYYY-MM-DD
});

// --- Shopping List ---
export const shoppingListItems = pgTable("shopping_list_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  quantity: text("quantity").notNull().default("1"),
  subCategory: text("sub_category").notNull().default("altro"), // 'panificati', 'carne', 'pesce', 'altro'
  checked: boolean("checked").default(false),
});

// --- Reminders (Promemoria) ---
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  remindAt: timestamp("remind_at").notNull(),
  completed: boolean("completed").default(false),
});

// --- Push Notification Subscriptions ---
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true });
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

// --- Pantry Categories ---
export const pantryCategories = pgTable("pantry_categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("Package"),
  order: integer("order").notNull().default(0),
});

// --- Schemas & Types ---
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUserRequest = Partial<InsertUser>;

export const insertDailyLogSchema = createInsertSchema(dailyLogs).omit({ id: true });
export type DailyLog = typeof dailyLogs.$inferSelect;
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
export type UpdateDailyLogRequest = Partial<InsertDailyLog>;

export const insertMealSchema = createInsertSchema(meals).omit({ id: true });
export type Meal = typeof meals.$inferSelect;
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type UpdateMealRequest = Partial<InsertMeal>;

export const insertPantryItemSchema = createInsertSchema(pantryItems).omit({ id: true });
export type PantryItem = typeof pantryItems.$inferSelect;
export type InsertPantryItem = z.infer<typeof insertPantryItemSchema>;
export type UpdatePantryItemRequest = Partial<InsertPantryItem>;

export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).omit({ id: true });
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type UpdateShoppingListItemRequest = Partial<InsertShoppingListItem>;

export const insertReminderSchema = createInsertSchema(reminders, {
  remindAt: z.string().or(z.date()).transform(v => new Date(v))
}).omit({ id: true });
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type UpdateReminderRequest = Partial<InsertReminder>;

export const insertPantryCategorySchema = createInsertSchema(pantryCategories).omit({ id: true });
export type PantryCategory = typeof pantryCategories.$inferSelect;
export type InsertPantryCategory = z.infer<typeof insertPantryCategorySchema>;

export * from "./models/chat";

