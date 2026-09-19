
'use client';

import { Home, MessageSquare, CreditCard, MessageCircle, Settings, Sparkles, Trophy } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export function MobileBottomNav() {
  const currentPath = usePathname();
  const { isAdmin } = useAdminAuth();

  const navItems = [
    { icon: Home, label: 'Accueil', path: '/', isExternal: false },
    { icon: Sparkles, label: 'Coaching', path: '/turf-coaching', isExternal: false, isPrimary: true },
    { icon: Trophy, label: 'Wague', path: '/wague-turf', isExternal: false },
    { icon: MessageSquare, label: 'Forum', path: '/forum', isExternal: false },
    { 
      icon: CreditCard, 
      label: 'VIP', 
      path: 'https://turfsimpoyefzp.comparo.store/service/abonnement-vip-turf-coaching', 
      isExternal: true,
      highlight: true 
    },
    { 
      icon: MessageCircle, 
      label: 'WhatsApp', 
      path: 'https://chat.whatsapp.com/ExGwEiwfRBZ9CT9D15bpsy', 
      isExternal: true,
      isWhatsApp: true 
    },
  ];

  if (isAdmin) {
    navItems.push({ icon: Settings, label: 'Admin', path: '/admin', isExternal: false });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const isActive = !item.isExternal && currentPath === item.path;
          
          if (item.isExternal) {
            return (
              <a
                key={item.path}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px] ${
                  item.highlight 
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
                    : item.isWhatsApp
                      ? 'text-green-500 hover:bg-green-500/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              </a>
            );
          }

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px] ${
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : (item as any).isPrimary
                    ? 'text-primary hover:bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

