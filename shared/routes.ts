import { z } from 'zod';
import { 
  insertUserSchema, users,
  insertDailyLogSchema, dailyLogs,
  insertMealSchema, meals,
  insertPantryItemSchema, pantryItems,
  insertShoppingListItemSchema, shoppingListItems,
  insertReminderSchema, reminders
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  chat: {
    message: {
      method: 'POST' as const,
      path: '/api/chat' as const,
      input: z.object({ message: z.string() }),
      responses: {
        200: z.object({ response: z.string() }),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      }
    }
  },
  recipes: {
    generate: {
      method: 'POST' as const,
      path: '/api/recipes/generate' as const,
      input: z.object({ ingredients: z.array(z.string()) }),
      responses: {
        200: z.object({ recipe: z.string() }),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      }
    }
  },
  dailyLogs: {
    get: {
      method: 'GET' as const,
      path: '/api/daily-logs/:date' as const,
      responses: {
        200: z.custom<typeof dailyLogs.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    upsert: {
      method: 'POST' as const,
      path: '/api/daily-logs' as const,
      input: insertDailyLogSchema,
      responses: {
        200: z.custom<typeof dailyLogs.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  meals: {
    list: {
      method: 'GET' as const,
      path: '/api/meals' as const,
      input: z.object({ date: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof meals.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/meals' as const,
      input: insertMealSchema,
      responses: {
        201: z.custom<typeof meals.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/meals/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      }
    }
  },
  pantry: {
    list: {
      method: 'GET' as const,
      path: '/api/pantry' as const,
      responses: {
        200: z.array(z.custom<typeof pantryItems.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/pantry' as const,
      input: insertPantryItemSchema,
      responses: {
        201: z.custom<typeof pantryItems.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/pantry/:id' as const,
      input: insertPantryItemSchema.partial(),
      responses: {
        200: z.custom<typeof pantryItems.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/pantry/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      }
    }
  },
  shoppingList: {
    list: {
      method: 'GET' as const,
      path: '/api/shopping-list' as const,
      responses: {
        200: z.array(z.custom<typeof shoppingListItems.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/shopping-list' as const,
      input: insertShoppingListItemSchema,
      responses: {
        201: z.custom<typeof shoppingListItems.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/shopping-list/:id' as const,
      input: insertShoppingListItemSchema.partial(),
      responses: {
        200: z.custom<typeof shoppingListItems.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/shopping-list/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      }
    }
  },
  reminders: {
    list: {
      method: 'GET' as const,
      path: '/api/reminders' as const,
      responses: {
        200: z.array(z.custom<typeof reminders.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/reminders' as const,
      input: insertReminderSchema,
      responses: {
        201: z.custom<typeof reminders.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/reminders/:id' as const,
      input: insertReminderSchema.partial(),
      responses: {
        200: z.custom<typeof reminders.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/reminders/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
