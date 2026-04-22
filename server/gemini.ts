import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration, type Tool } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("[gemini] GEMINI_API_KEY non impostata: le chiamate AI falliranno.");
}

export const genAI = new GoogleGenerativeAI(apiKey || "");

export const TEXT_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
export const JSON_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

export type ChatMessage = { role: "user" | "assistant"; content: string };

function toGeminiHistory(messages: ChatMessage[]) {
  return messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

export async function generateJson<T = any>(systemInstruction: string, userPrompt = "(generate)"): Promise<T> {
  const model = genAI.getGenerativeModel({
    model: JSON_MODEL,
    systemInstruction,
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(userPrompt);
  const text = result.response.text();
  return JSON.parse(text || "{}") as T;
}

export async function generateText(systemInstruction: string, userPrompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: TEXT_MODEL, systemInstruction });
  const result = await model.generateContent(userPrompt);
  return result.response.text() || "";
}

export type FnTool = {
  name: string;
  description: string;
  parameters: any;
};

export type FnCall = { name: string; args: Record<string, any> };

export async function generateWithTools(
  systemInstruction: string,
  userPrompt: string,
  tools: FnTool[]
): Promise<{ text: string; calls: FnCall[] }> {
  const functionDeclarations: FunctionDeclaration[] = tools.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
  const toolConfig: Tool[] = [{ functionDeclarations }];

  const model = genAI.getGenerativeModel({
    model: TEXT_MODEL,
    systemInstruction,
    tools: toolConfig,
  });
  const result = await model.generateContent(userPrompt);
  const response = result.response;

  const calls: FnCall[] = [];
  const fc = response.functionCalls?.() || [];
  for (const c of fc) {
    calls.push({ name: c.name, args: (c.args || {}) as Record<string, any> });
  }
  let text = "";
  try {
    text = response.text() || "";
  } catch {
    text = "";
  }
  return { text, calls };
}

export async function* streamText(
  systemInstruction: string,
  history: ChatMessage[]
): AsyncGenerator<string> {
  const model = genAI.getGenerativeModel({ model: TEXT_MODEL, systemInstruction });
  const last = history[history.length - 1];
  const previous = history.slice(0, -1);
  const chat = model.startChat({ history: toGeminiHistory(previous) });
  const result = await chat.sendMessageStream(last?.content || "");
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: TEXT_MODEL });
  const result = await model.generateContent([
    { inlineData: { data: audioBase64, mimeType } },
    { text: "Trascrivi accuratamente l'audio in italiano. Rispondi SOLO con il testo trascritto, senza commenti." },
  ]);
  return result.response.text() || "";
}
