import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Meals from "@/pages/Meals";
import Pantry from "@/pages/Pantry";
import Reminders from "@/pages/Reminders";
import { Navigation } from "@/components/Navigation";
import { BimiChat } from "@/components/BimiChat";

function Router() {
  return (
    <div className="min-h-screen bg-background font-sans transition-colors duration-300">
      <main className="max-w-lg mx-auto p-4 md:p-6 pb-24 min-h-screen relative">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/pasti" component={Meals} />
          <Route path="/dispensa" component={Pantry} />
          <Route path="/promemoria" component={Reminders} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Navigation />
      <BimiChat />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="bimi-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
