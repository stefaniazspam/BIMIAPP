import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useChat } from "@/hooks/use-bimi";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  role: 'user' | 'assistant';
  text: string;
};

export function BimiChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: "Ciao! Sono Bimì, la tua assistente personale. Come posso aiutarti oggi?" }
  ]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatMutation = useChat();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);

    try {
      const res = await chatMutation.mutateAsync(userMsg);
      setMessages(prev => [...prev, { role: 'assistant', text: res.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Scusa, ho avuto un problema. Riprova più tardi!" }]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-xl bg-gradient-to-r from-secondary to-orange-400 hover:scale-110 transition-transform duration-300 z-50 p-0"
        >
          <Bot className="w-8 h-8 text-white" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden border-0 shadow-2xl bg-background/95 backdrop-blur-xl h-[80vh] sm:h-[600px] flex flex-col rounded-3xl">
        <div className="p-4 bg-secondary/10 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-orange-400 flex items-center justify-center shadow-inner">
            <Bot className="text-white w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground">Bimì AI</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Online
            </p>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4 bg-muted/5">
          <div className="flex flex-col gap-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-white dark:bg-zinc-800 border border-border rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-zinc-800 border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-secondary animate-bounce delay-100" />
                  <span className="w-2 h-2 rounded-full bg-secondary animate-bounce delay-200" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 bg-background border-t border-border flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Chiedi a Bimì..."
            className="rounded-full bg-muted/30 border-muted-foreground/20 focus:ring-secondary"
            disabled={chatMutation.isPending}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="rounded-full bg-secondary hover:bg-secondary/90 text-secondary-foreground shrink-0"
            disabled={chatMutation.isPending || !input.trim()}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
