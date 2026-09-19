
import { ChevronDown } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface MobileTabMenuProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const MobileTabMenu = ({ tabs, activeTab, onTabChange }: MobileTabMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const activeTabData = tabs.find(tab => tab.id === activeTab);
  const ActiveIcon = activeTabData?.icon;

  const handleTabSelect = (tabId: string) => {
    if (tabId === activeTab) {
      setIsOpen(false);
      return;
    }
    
    setIsAnimating(true);
    
    // Délai pour l'animation de sortie
    setTimeout(() => {
      onTabChange(tabId);
      setIsOpen(false);
      
      // Reset animation state après la transition
      setTimeout(() => setIsAnimating(false), 300);
    }, 150);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between h-14 bg-card border-border text-left",
            "transition-all duration-300 ease-out",
            "hover:bg-muted hover:border-primary/50",
            "active:scale-[0.98]"
          )}
        >
          <div className="flex items-center gap-3">
            {ActiveIcon && (
              <div className="relative">
                <ActiveIcon className="w-5 h-5 text-primary transition-transform duration-300" />
              </div>
            )}
            <span className="font-medium">{activeTabData?.label || 'Sélectionner'}</span>
          </div>
          <ChevronDown className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180"
          )} />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">Menu des onglets</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[calc(70vh-80px)] pb-6">
          {tabs.map(({ id, label, icon: Icon }, index) => (
              <Button
                key={id}
                variant={activeTab === id ? "default" : "outline"}
                className={cn(
                  "h-auto py-4 px-3 flex flex-col items-center gap-2 text-center",
                  "transition-all duration-300 ease-out",
                  "animate-fade-in",
                  activeTab === id 
                    ? 'bg-primary text-primary-foreground shadow-glow-green scale-[1.02]' 
                    : 'bg-card hover:bg-muted hover:scale-[1.02] hover:border-primary/50',
                  isAnimating && activeTab !== id && "opacity-50 scale-95"
                )}
                style={{ 
                  animationDelay: `${index * 30}ms`,
                  animationFillMode: 'backwards'
                }}
                onClick={() => handleTabSelect(id)}
              >
                <Icon className={cn(
                  "w-6 h-6 transition-transform duration-300",
                  activeTab === id && "scale-110"
                )} />
                <span className="text-xs font-medium leading-tight">{label}</span>
              </Button>
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

