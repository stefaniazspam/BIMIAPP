import { Link, useLocation } from "wouter";
import { Home, Utensils, Refrigerator, Bell, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/pasti", icon: Utensils, label: "Pasti" },
    { href: "/dispensa", icon: Refrigerator, label: "Dispensa" },
    { href: "/promemoria", icon: Bell, label: "Promemoria" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-t border-border pb-safe">
      <nav className="flex items-center justify-around p-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 w-16 group",
              isActive 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}>
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                isActive ? "bg-primary/10 -translate-y-1" : "group-hover:bg-muted"
              )}>
                <item.icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-1 transition-all duration-300",
                isActive ? "opacity-100 font-bold" : "opacity-0 h-0 overflow-hidden"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
