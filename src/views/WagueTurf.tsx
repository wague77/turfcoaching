
'use client';

import Link from 'next/link';
import { Header } from '@/components/racing/Header';
import { WagueTurfApp } from '@/components/wague-turf/WagueTurfApp';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy } from 'lucide-react';

export default function WagueTurf() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <Trophy className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold">WAGUE-TURF</h1>
          </div>
        </div>
        
        <WagueTurfApp />
      </main>
    </div>
  );
}

