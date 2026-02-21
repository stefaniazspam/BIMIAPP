import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerAudioRoutes } from "./replit_integrations/audio";

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
      
      const today = new Date().toISOString().split('T')[0];
      const meals = await storage.getMeals(today);
      const calories = meals.reduce((sum, m) => sum + m.calories, 0);
      
      const systemPrompt = `
Sei Bimì, un'assistente AI per l'app Bimì. Il tuo scopo è aiutare l'utente a organizzare il tempo, promemoria, pasti e lista della spesa.
Oggi è ${today}.

Dispensa attuale: ${JSON.stringify(pantry)}. Se l'utente chiede cosa mangiare, suggerisci ricette usando questi ingredienti.
Promemoria attuali: ${JSON.stringify(reminders)}.
Calorie consumate oggi: ${calories} kcal.

Rispondi sempre in modo breve, amichevole e utile in italiano.
Se l'utente chiede di aggiungere qualcosa alla lista della spesa, usa la funzione "add_shopping_list_item".
Se chiede di aggiungere un promemoria, usa la funzione "add_reminder".
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
            name: "add_reminder",
            description: "Aggiungi un promemoria (es: fra 3 ore, domani alle 15, ecc)",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                remindAt: { type: "string", description: "ISO 8601 date string for the exact reminder time" }
              },
              required: ["title", "remindAt"]
            }
          }
        }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
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
          if (toolCall.function.name === "add_shopping_list_item") {
            const args = JSON.parse(toolCall.function.arguments);
            await storage.createShoppingListItem({
              userId: 1,
              name: args.name,
              quantity: args.quantity || 1,
              checked: false
            });
            finalResponse = `Ho aggiunto ${args.quantity || 1}x ${args.name} alla tua lista della spesa!`;
          } else if (toolCall.function.name === "add_reminder") {
            const args = JSON.parse(toolCall.function.arguments);
            await storage.createReminder({
              userId: 1,
              title: args.title,
              remindAt: new Date(args.remindAt),
              completed: false
            });
            finalResponse = `Perfetto, ti ricorderò: "${args.title}" il ${new Date(args.remindAt).toLocaleString('it-IT')}.`;
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

  // Daily Logs
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
        calories: 0 // No longer calculating macros as per request
      });

      res.json(meal);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Errore generazione pasto" });
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

  // Setup seed data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const usersList = await storage.getUser(1);
  if (!usersList) {
    await storage.createUser({ username: "bimi_user", password: "password" });
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
