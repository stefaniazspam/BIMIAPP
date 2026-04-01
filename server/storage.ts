import { db } from "./db";
import {
  users, dailyLogs, meals, pantryItems, shoppingListItems, reminders, pantryCategories,
  type User, type InsertUser,
  type DailyLog, type InsertDailyLog, type UpdateDailyLogRequest,
  type Meal, type InsertMeal, type UpdateMealRequest,
  type PantryItem, type InsertPantryItem, type UpdatePantryItemRequest,
  type ShoppingListItem, type InsertShoppingListItem, type UpdateShoppingListItemRequest,
  type Reminder, type InsertReminder, type UpdateReminderRequest,
  type PantryCategory, type InsertPantryCategory
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  
  // Daily Logs
  getDailyLog(date: string): Promise<DailyLog | undefined>;
  upsertDailyLog(log: InsertDailyLog): Promise<DailyLog>;
  
  // Meals
  getMeals(date?: string): Promise<Meal[]>;
  createMeal(meal: InsertMeal): Promise<Meal>;
  deleteMeal(id: number): Promise<void>;
  
  // Pantry
  getPantryItems(): Promise<PantryItem[]>;
  createPantryItem(item: InsertPantryItem): Promise<PantryItem>;
  updatePantryItem(id: number, updates: UpdatePantryItemRequest): Promise<PantryItem>;
  deletePantryItem(id: number): Promise<void>;
  
  // Shopping List
  getShoppingListItems(): Promise<ShoppingListItem[]>;
  createShoppingListItem(item: InsertShoppingListItem): Promise<ShoppingListItem>;
  updateShoppingListItem(id: number, updates: UpdateShoppingListItemRequest): Promise<ShoppingListItem>;
  deleteShoppingListItem(id: number): Promise<void>;
  
  // Reminders
  getReminders(): Promise<Reminder[]>;
  getReminder(id: number): Promise<Reminder | undefined>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: number, updates: UpdateReminderRequest): Promise<Reminder>;
  deleteReminder(id: number): Promise<void>;

  // Pantry Categories
  getPantryCategories(userId: number): Promise<PantryCategory[]>;
  createPantryCategory(category: InsertPantryCategory): Promise<PantryCategory>;
  updatePantryCategory(id: number, updates: Partial<InsertPantryCategory>): Promise<PantryCategory>;
  deletePantryCategory(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [inserted] = await db.insert(users).values(user).returning();
    return inserted;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async getDailyLog(date: string): Promise<DailyLog | undefined> {
    const [log] = await db.select().from(dailyLogs).where(eq(dailyLogs.date, date));
    return log;
  }

  async upsertDailyLog(log: InsertDailyLog): Promise<DailyLog> {
    const [existing] = await db.select().from(dailyLogs).where(eq(dailyLogs.date, log.date));
    if (existing) {
      const [updated] = await db.update(dailyLogs).set(log).where(eq(dailyLogs.id, existing.id)).returning();
      return updated;
    }
    const [inserted] = await db.insert(dailyLogs).values(log).returning();
    return inserted;
  }

  async getMeals(date?: string): Promise<Meal[]> {
    if (date) {
      return await db.select().from(meals).where(eq(meals.date, date));
    }
    return await db.select().from(meals);
  }

  async createMeal(meal: InsertMeal): Promise<Meal> {
    const [inserted] = await db.insert(meals).values(meal).returning();
    return inserted;
  }

  async deleteMeal(id: number): Promise<void> {
    await db.delete(meals).where(eq(meals.id, id));
  }

  async updateMeal(id: number, updates: Partial<InsertMeal>): Promise<Meal> {
    const [meal] = await db.update(meals).set(updates).where(eq(meals.id, id)).returning();
    if (!meal) throw new Error("Meal not found");
    return meal;
  }

  async getPantryItems(): Promise<PantryItem[]> {
    return await db.select().from(pantryItems);
  }

  async createPantryItem(item: InsertPantryItem): Promise<PantryItem> {
    const [inserted] = await db.insert(pantryItems).values(item).returning();
    return inserted;
  }

  async updatePantryItem(id: number, updates: UpdatePantryItemRequest): Promise<PantryItem> {
    const [updated] = await db.update(pantryItems).set(updates).where(eq(pantryItems.id, id)).returning();
    return updated;
  }

  async deletePantryItem(id: number): Promise<void> {
    await db.delete(pantryItems).where(eq(pantryItems.id, id));
  }

  async getShoppingListItems(): Promise<ShoppingListItem[]> {
    return await db.select().from(shoppingListItems);
  }

  async createShoppingListItem(item: InsertShoppingListItem): Promise<ShoppingListItem> {
    const [inserted] = await db.insert(shoppingListItems).values(item).returning();
    return inserted;
  }

  async updateShoppingListItem(id: number, updates: UpdateShoppingListItemRequest): Promise<ShoppingListItem> {
    const [updated] = await db.update(shoppingListItems).set(updates).where(eq(shoppingListItems.id, id)).returning();
    return updated;
  }

  async deleteShoppingListItem(id: number): Promise<void> {
    await db.delete(shoppingListItems).where(eq(shoppingListItems.id, id));
  }

  async getReminders(): Promise<Reminder[]> {
    return await db.select().from(reminders);
  }

  async getReminder(id: number): Promise<Reminder | undefined> {
    const [reminder] = await db.select().from(reminders).where(eq(reminders.id, id));
    return reminder;
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [inserted] = await db.insert(reminders).values(reminder).returning();
    return inserted;
  }

  async updateReminder(id: number, updates: UpdateReminderRequest): Promise<Reminder> {
    const [updated] = await db.update(reminders).set(updates).where(eq(reminders.id, id)).returning();
    return updated;
  }

  async deleteReminder(id: number): Promise<void> {
    await db.delete(reminders).where(eq(reminders.id, id));
  }

  // Pantry Categories
  async getPantryCategories(userId: number): Promise<PantryCategory[]> {
    return await db.select().from(pantryCategories).where(eq(pantryCategories.userId, userId)).orderBy(pantryCategories.order);
  }

  async createPantryCategory(category: InsertPantryCategory): Promise<PantryCategory> {
    const [inserted] = await db.insert(pantryCategories).values(category).returning();
    return inserted;
  }

  async updatePantryCategory(id: number, updates: Partial<InsertPantryCategory>): Promise<PantryCategory> {
    const [updated] = await db.update(pantryCategories).set(updates).where(eq(pantryCategories.id, id)).returning();
    if (!updated) throw new Error("Category not found");
    return updated;
  }

  async deletePantryCategory(id: number): Promise<void> {
    await db.delete(pantryCategories).where(eq(pantryCategories.id, id));
  }
}

export const storage = new DatabaseStorage();
