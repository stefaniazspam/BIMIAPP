import { db } from "./db";
import { users, dailyLogs, meals, pantryItems, shoppingListItems, reminders, pushSubscriptions, insertPantryItemSchema, insertShoppingListItemSchema, insertReminderSchema } from "@shared/schema";
import { eq, lte, and } from "drizzle-orm";
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerAudioRoutes } from "./replit_integrations/audio";
import webpush from "web-push";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:bimi@app.local",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Use generic chat routes for standard text chat if needed
  registerChatRoutes(app);
  registerAudioRoutes(app);

  app.post(api.chat.message.path, async (req, res) => {
    try {
      const input = api.chat.message.input.parse(req.body);
      const userMessage = input.message;
      
      const pantry = await storage.getPantryItems();
      const reminders = await storage.getReminders();
      
      const todayStr = new Date().toISOString().split('T')[0];
      const mealsToday = await storage.getMeals(todayStr);
      const calories = mealsToday.reduce((sum, m) => sum + (m.calories || 0), 0);
      
      // Use a more robust way to get Rome time
      const romeTime = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
      const [romeDate, romeTimeOnly] = romeTime.split(", ");
      
      const systemPrompt = `
Sei Bimì, un'assistente AI per l'app Bimì. Il tuo scopo è aiutare l'utente a organizzare il tempo, promemoria, pasti e lista della spesa.
Oggi è il ${romeDate}, ore locali (Roma) ${romeTimeOnly}.

Dispensa attuale: ${JSON.stringify(pantry)}. Se l'utente chiede cosa mangiare, suggerisci ricette usando questi ingredienti.
Promemoria attuali: ${JSON.stringify(reminders)}.
Calorie consumate oggi: ${calories} kcal.

Rispondi sempre in modo breve, amichevole e utile in italiano.
Se l'utente chiede di aggiungere qualcosa alla lista della spesa, usa la funzione "add_shopping_list_item".
Se chiede di aggiungere un promemoria, usa la funzione "add_reminder". Per il parametro "remindAt", calcola sempre l'orario esatto basandoti sull'ora corrente di Roma fornita sopra (${romeTimeOnly}). Se dice "tra 5 minuti", aggiungi 5 minuti a quell'orario.
`;

      const tools = [
        {
          type: "function" as const,
          function: {
            name: "add_shopping_list_item",
            description: "Aggiungi un elemento alla lista della spesa",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" }
              },
              required: ["name"]
            }
          }
        },
        {
          type: "function" as const,
          function: {
            name: "clear_shopping_list",
            description: "Cancella completamente la lista della spesa",
            parameters: {
              type: "object",
              properties: {}
            }
          }
        },
        {
          type: "function" as const,
          function: {
            name: "add_reminder",
            description: "Aggiungi un promemoria (es: fra 5 minuti, domani alle 15, ecc). Calcola sempre l'orario esatto basandoti sull'ora corrente.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                remindAt: { type: "string", description: "ISO 8601 date string for the exact reminder time. If the user says 'tra X minuti', calculate NOW + X minutes." }
              },
              required: ["title", "remindAt"]
            }
          }
        }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        tools: tools,
        tool_choice: "auto",
      });

      const message = response.choices[0].message;
      let finalResponse = message.content || "Fatto!";

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function' && toolCall.function.name === "add_shopping_list_item") {
            const args = JSON.parse(toolCall.function.arguments);
            await storage.createShoppingListItem({
              userId: 1,
              name: args.name,
              quantity: args.quantity || 1,
              checked: false
            });
            finalResponse = `Ho aggiunto ${args.quantity || 1}x ${args.name} alla tua lista della spesa!`;
          } else if (toolCall.type === 'function' && toolCall.function.name === "clear_shopping_list") {
            const items = await storage.getShoppingListItems();
            for (const item of items) {
              await storage.deleteShoppingListItem(item.id);
            }
            finalResponse = "Ho svuotato completamente la tua lista della spesa.";
          } else if (toolCall.type === 'function' && toolCall.function.name === "add_reminder") {
            const args = JSON.parse(toolCall.function.arguments);
            // Handle relative time like "tra 5 minuti" or absolute ISO string
            let remindDate: Date;
            if (args.remindAt.includes('minutes') || args.remindAt.match(/^\d+$/)) {
               const mins = parseInt(args.remindAt);
               remindDate = new Date(Date.now() + mins * 60000);
            } else {
               remindDate = new Date(args.remindAt);
            }
            
            if (isNaN(remindDate.getTime())) {
              // Fallback for LLM hallucinating relative text
              const minsMatch = args.remindAt.match(/(\d+)/);
              const mins = minsMatch ? parseInt(minsMatch[0]) : 5;
              remindDate = new Date(Date.now() + mins * 60000);
            }

            await storage.createReminder({
              userId: 1,
              title: args.title,
              remindAt: remindDate,
              completed: false
            });
            finalResponse = `Perfetto, ti ricorderò: "${args.title}" il ${remindDate.toLocaleString('it-IT')}.`;
          }
        }
      }

      res.status(200).json({ response: finalResponse });
    } catch (err) {
      if (err instanceof z.ZodError) {
         res.status(400).json({ message: err.errors[0].message });
      } else {
         console.error(err);
         res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch("/api/user", async (req, res) => {
    try {
      const user = await storage.updateUser(1, req.body);
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Daily Logs
  app.get("/api/daily-logs", async (req, res) => {
    try {
      const logs = await db.select().from(dailyLogs).where(eq(dailyLogs.userId, 1));
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch daily logs" });
    }
  });

  app.get(api.dailyLogs.get.path, async (req, res) => {
    const log = await storage.getDailyLog(req.params.date);
    if (!log) return res.status(404).json({ message: 'Log not found' });
    res.json(log);
  });
  
  app.post(api.dailyLogs.upsert.path, async (req, res) => {
    try {
      const input = api.dailyLogs.upsert.input.parse(req.body);
      const log = await storage.upsertDailyLog(input);
      res.status(200).json(log);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      }
    }
  });

  // Meals
  app.patch("/api/pantry/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = insertPantryItemSchema.partial().parse(req.body);
      const updated = await storage.updatePantryItem(id, input);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  app.patch("/api/shopping/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = insertShoppingListItemSchema.partial().parse(req.body);
      const updated = await storage.updateShoppingListItem(id, input);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  app.patch("/api/reminders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = insertReminderSchema.partial().parse(req.body);
      const updated = await storage.updateReminder(id, input);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  app.get(api.meals.list.path, async (req, res) => {
    const date = req.query.date as string | undefined;
    const meals = await storage.getMeals(date);
    res.json(meals);
  });

  app.post(api.meals.create.path, async (req, res) => {
    try {
      const input = api.meals.create.input.parse(req.body);
      const meal = await storage.createMeal(input);
      res.status(201).json(meal);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      }
    }
  });

  app.delete(api.meals.delete.path, async (req, res) => {
    await storage.deleteMeal(Number(req.params.id));
    res.status(204).send();
  });

  app.patch('/api/meals/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updates = req.body;
      const meal = await storage.updateMeal(id, updates);
      res.status(200).json(meal);
    } catch (err) {
      res.status(500).json({ message: "Failed to update meal" });
    }
  });

  // Pantry
  app.get(api.pantry.list.path, async (req, res) => {
    const items = await storage.getPantryItems();
    res.json(items);
  });

  app.post(api.pantry.create.path, async (req, res) => {
    try {
      const input = api.pantry.create.input.parse(req.body);
      const item = await storage.createPantryItem(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      }
    }
  });

  app.put(api.pantry.update.path, async (req, res) => {
    try {
      const input = api.pantry.update.input.parse(req.body);
      const item = await storage.updatePantryItem(Number(req.params.id), input);
      res.status(200).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      }
    }
  });

  app.delete(api.pantry.delete.path, async (req, res) => {
    await storage.deletePantryItem(Number(req.params.id));
    res.status(204).send();
  });

  // Shopping List
  app.get(api.shoppingList.list.path, async (req, res) => {
    const items = await storage.getShoppingListItems();
    res.json(items);
  });

  app.post(api.shoppingList.create.path, async (req, res) => {
    try {
      const input = api.shoppingList.create.input.parse(req.body);
      const item = await storage.createShoppingListItem(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      }
    }
  });

  app.put(api.shoppingList.update.path, async (req, res) => {
    try {
      const input = api.shoppingList.update.input.parse(req.body);
      const item = await storage.updateShoppingListItem(Number(req.params.id), input);
      res.status(200).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      }
    }
  });

  app.delete(api.shoppingList.delete.path, async (req, res) => {
    await storage.deleteShoppingListItem(Number(req.params.id));
    res.status(204).send();
  });

  app.delete("/api/shopping-list", async (req, res) => {
    try {
      const items = await storage.getShoppingListItems();
      for (const item of items) {
        await storage.deleteShoppingListItem(item.id);
      }
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to clear shopping list" });
    }
  });

  // Reminders
  app.get(api.reminders.list.path, async (req, res) => {
    const items = await storage.getReminders();
    res.json(items);
  });

  app.post(api.reminders.create.path, async (req, res) => {
    try {
      const input = api.reminders.create.input.parse(req.body);
      const item = await storage.createReminder(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      }
    }
  });

  app.put(api.reminders.update.path, async (req, res) => {
    try {
      const input = api.reminders.update.input.parse(req.body);
      const item = await storage.updateReminder(Number(req.params.id), input);
      res.status(200).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      }
    }
  });

  app.delete(api.reminders.delete.path, async (req, res) => {
    await storage.deleteReminder(Number(req.params.id));
    res.status(204).send();
  });

  // Pantry Categories
  app.get("/api/pantry-categories", async (req, res) => {
    const categories = await storage.getPantryCategories(1);
    res.json(categories);
  });

  app.post("/api/pantry-categories", async (req, res) => {
    const category = await storage.createPantryCategory({ ...req.body, userId: 1 });
    res.json(category);
  });

  app.patch("/api/pantry-categories/:id", async (req, res) => {
    const category = await storage.updatePantryCategory(Number(req.params.id), req.body);
    res.json(category);
  });

  app.delete("/api/pantry-categories/:id", async (req, res) => {
    await storage.deletePantryCategory(Number(req.params.id));
    res.status(204).end();
  });

  app.post("/api/meals/generate", async (req, res) => {
    try {
      const { prompt, date, mealType, servings, usePantry } = req.body;
      
      let pantryContext = "";
      if (usePantry) {
        const pantry = await storage.getPantryItems();
        pantryContext = `Utilizza principalmente questi ingredienti dalla dispensa: ${pantry.map(i => i.name).join(", ")}.`;
      }

      const systemPrompt = `Sei Bimì, un'assistente culinaria. Genera una ricetta per ${servings} persone basata sulla richiesta: "${prompt}". 
      ${pantryContext}
      Rispondi ESCLUSIVAMENTE con un oggetto JSON nel seguente formato:
      {
        "name": "Titolo Ricetta",
        "recipe": "Procedimento passo dopo passo...",
        "ingredients": ["ingrediente 1", "ingrediente 2"]
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using 4o for reliable JSON
        messages: [{ role: "system", content: systemPrompt }],
        response_format: { type: "json_object" }
      });

      const content = JSON.parse(response.choices[0].message.content || "{}");
      
      const meal = await storage.createMeal({
        userId: 1,
        date,
        mealType,
        name: content.name,
        recipe: content.recipe,
        ingredients: content.ingredients,
        servings: servings,
        isPlanned: true,
        calories: 0 
      });

      res.json(meal);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Errore generazione pasto: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  app.post("/api/recipes/search", async (req, res) => {
    try {
      const pantry = await storage.getPantryItems();
      const ingredients = pantry.map(i => `${i.name} (${i.category})`).join(", ");
      
      const systemPrompt = `Sei Bimì, un'assistente culinaria esperta. 
      L'utente ha questi ingredienti in dispensa/frigo/freezer: ${ingredients}.
      Suggerisci 3 ricette creative che valorizzino questi ingredienti, minimizzando gli sprechi.
      Rispondi ESCLUSIVAMENTE con un oggetto JSON nel formato:
      {
        "recipes": [
          {
            "name": "Titolo",
            "description": "Breve descrizione",
            "ingredients": ["ingrediente 1", "ingrediente 2"],
            "recipe": "Procedimento..."
          }
        ]
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }],
        response_format: { type: "json_object" }
      });

      res.json(JSON.parse(response.choices[0].message.content || "{}"));
    } catch (err) {
      res.status(500).json({ message: "Errore ricerca ricette" });
    }
  });

  app.post("/api/meals/add-to-shopping-list", async (req, res) => {
    try {
      const { ingredients } = req.body;
      for (const item of ingredients) {
        await storage.createShoppingListItem({
          userId: 1,
          name: item,
          quantity: 1,
          checked: false
        });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Errore lista spesa" });
    }
  });

  // Health check endpoint (no DB dependency — used by Railway)
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Push notification: get public VAPID key
  app.get("/api/push-vapid-key", (_req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

  // Push notification: save subscription
  app.post("/api/push-subscribe", async (req, res) => {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Dati di sottoscrizione mancanti" });
      }
      await db.insert(pushSubscriptions).values({
        userId: 1,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      }).onConflictDoNothing();
      res.json({ success: true });
    } catch (err) {
      console.error("Push subscribe error:", err);
      res.status(500).json({ error: "Errore sottoscrizione notifiche" });
    }
  });

  // Push notification: remove subscription
  app.delete("/api/push-subscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (endpoint) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Errore rimozione sottoscrizione" });
    }
  });

  // Scheduler: check reminders every minute and send push notifications
  setInterval(async () => {
    try {
      const now = new Date();
      const windowEnd = new Date(now.getTime() + 60000); // next 60s
      
      const dueReminders = await db.select().from(reminders)
        .where(and(
          eq(reminders.completed, false),
          lte(reminders.remindAt, windowEnd)
        ));

      if (dueReminders.length === 0) return;

      const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, 1));
      if (subs.length === 0) return;

      for (const reminder of dueReminders) {
        const reminderTime = new Date(reminder.remindAt).getTime();
        if (reminderTime > now.getTime() - 60000) {
          for (const sub of subs) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                JSON.stringify({
                  title: "Bimì - Promemoria",
                  body: reminder.title,
                  tag: `reminder-${reminder.id}`,
                  url: "/promemoria",
                })
              );
            } catch (e: any) {
              if (e.statusCode === 410 || e.statusCode === 404) {
                await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Reminder scheduler error:", err);
    }
  }, 60000);

  // Setup seed data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const usersList = await storage.getUser(1);
  if (!usersList) {
    await storage.createUser({ username: "Stefania", password: "password", cycleDuration: 33, periodDuration: 5 });
  } else if (usersList.username !== "Stefania") {
    await storage.updateUser(1, { username: "Stefania", cycleDuration: 33 });
  }

  const defaultCategories = [
    { name: "Panificati", icon: "Wheat", order: 0 },
    { name: "Carne", icon: "Beef", order: 1 },
    { name: "Pesce", icon: "Fish", order: 2 },
    { name: "Latticini", icon: "Milk", order: 3 },
    { name: "Frutta e Verdura", icon: "Leaf", order: 4 },
    { name: "Conserve", icon: "Container", order: 5 },
    { name: "Bevande", icon: "Beer", order: 6 },
    { name: "Altro", icon: "HelpCircle", order: 7 }
  ];

  const existingCats = await storage.getPantryCategories(1);
  if (existingCats.length === 0) {
    for (const cat of defaultCategories) {
      await storage.createPantryCategory({ ...cat, userId: 1 });
    }
  }

  const items = await storage.getPantryItems();
  if (items.length === 0) {
    await storage.createPantryItem({
      userId: 1,
      name: "Pollo",
      category: "frigo",
      quantity: 1,
      expirationDate: new Date(Date.now() + 86400000).toISOString().split('T')[0] // Expiring tomorrow
    });
    await storage.createPantryItem({
      userId: 1,
      name: "Riso",
      category: "dispensa",
      quantity: 2,
    });
    
    await storage.createMeal({
      userId: 1,
      date: new Date().toISOString().split('T')[0],
      mealType: "lunch",
      name: "Riso e Pollo",
      calories: 450,
      protein: 40,
      carbs: 50,
      fat: 10
    });
    
    await storage.createReminder({
      userId: 1,
      title: "Svuotare la lavatrice",
      remindAt: new Date(Date.now() + 2 * 3600000) // In 2 hours
    });
  }
}
