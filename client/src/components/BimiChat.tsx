import { useState, useRef, useEffect } from "react";
import { Send, Bot, Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useChat } from "@/hooks/use-bimi";
import { motion } from "framer-motion";
import { useVoiceRecorder } from "@/replit_integrations/audio";

type Message = {
  role: 'user' | 'assistant';
  text: string;
};

export function BimiChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: "Ciao! Sono Bimì, la tua assistente personale. Come posso aiutarti oggi?" }
  ]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatMutation = useChat();
  const recorder = useVoiceRecorder();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleMicClick = async () => {
    if (recorder.state === "recording") {
      const blob = await recorder.stopRecording();
      if (!blob || blob.size === 0) return;
      setIsTranscribing(true);
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(blob);
        });
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: base64 }),
        });
        const data = await res.json();
        if (data.text) {
          setInput(prev => prev ? prev + " " + data.text : data.text);
        }
      } catch (err) {
        console.error("Transcription error:", err);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      await recorder.startRecording();
    }
  };

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
        <div className="p-4 bg-secondary/10 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            {(chatMutation.isPending || isTranscribing) && (
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

        <form onSubmit={handleSubmit} className="p-4 bg-background border-t border-border flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Chiedi a Bimì..."
              className="rounded-full bg-muted/30 border-muted-foreground/20 focus:ring-secondary flex-1"
              disabled={chatMutation.isPending}
            />
            <div className="flex gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleMicClick}
                disabled={isTranscribing}
                className={`rounded-full h-10 w-10 ${recorder.state === 'recording' ? 'bg-red-100 text-red-600 animate-pulse' : isTranscribing ? 'text-orange-400' : 'text-secondary hover:bg-secondary/10'}`}
              >
                {isTranscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : recorder.state === 'recording' ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button 
                type="submit" 
                size="icon" 
                className="rounded-full bg-secondary hover:bg-secondary/90 text-secondary-foreground h-10 w-10"
                disabled={chatMutation.isPending || !input.trim()}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
          {recorder.state === 'recording' && (
            <p className="text-[10px] text-center text-red-500 font-medium animate-pulse">
              Sto ascoltando... Parla ora
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
