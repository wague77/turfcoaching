
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoverProps {
  onNext: () => void;
}

export default function Cover({ onNext }: CoverProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f0a] via-[#0d1a0d] to-[#0a0f0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* DVD-style cover card */}
        <div className="relative rounded-2xl overflow-hidden shadow-[0_25px_80px_-10px_rgba(0,255,140,0.35)] border-2 border-primary/40 bg-black">
          {/* Top ribbon */}
          <div className="bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-950 py-2 px-4 text-center border-b border-primary/30">
            <p className="text-[10px] tracking-[0.25em] font-bold text-primary uppercase">
              Collection <span className="text-accent">Gagner</span> aux Paris Hippiques · turfcoachingsystem
            </p>
          </div>

          {/* Logo & Title */}
          <div className="pt-6 pb-3 px-6 text-center bg-gradient-to-b from-black to-emerald-950/40 flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary shadow-[0_0_25px_rgba(0,255,160,0.5)] mb-3">
              <img src="/logo.jpg" alt="Turf Coaching System Emblem" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-4xl font-black tracking-tight leading-none">
              <span className="text-foreground drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]">TURF COACHING</span>
            </h1>
            <h2 className="text-5xl font-black tracking-tighter leading-none mt-1">
              <span className="text-primary drop-shadow-[0_0_20px_rgba(0,255,140,0.6)]">ULTRA</span>
              <span className="text-destructive drop-shadow-[0_0_20px_rgba(239,68,68,0.7)] italic ml-2">SYSTEM</span>
            </h2>
          </div>

          {/* Hero image */}
          <div className="relative">
            <img
              src="/cover-hero.jpg"
              alt="Cheval de course au galop"
              width={1024}
              height={1280}
              className="w-full aspect-[4/5] object-cover"
            />
            {/* Bonus badge */}
            <div className="absolute top-4 right-4 bg-accent text-accent-foreground rounded-full w-24 h-24 flex flex-col items-center justify-center text-center rotate-12 shadow-xl border-2 border-accent-foreground/20">
              <Sparkles className="w-4 h-4 mb-0.5" />
              <p className="text-[9px] font-black leading-tight uppercase">Bonus<br/>Spécial</p>
              <p className="text-[7px] font-semibold leading-tight mt-0.5">IA + Turf<br/>Coaching</p>
            </div>
            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-destructive/90 to-transparent" />
          </div>

          {/* Bottom red banner */}
          <div className="bg-gradient-to-b from-destructive to-red-900 px-6 py-5 text-center border-t-2 border-accent/60">
            <p className="text-2xl font-black text-foreground leading-tight drop-shadow-md">
              Système <span className="italic">EXCLUSIF</span>
            </p>
            <p className="text-lg font-bold text-foreground/95 leading-tight mt-1">
              d'Analyse Prédictive
            </p>
            <p className="text-xl font-black mt-2">
              <span className="text-accent drop-shadow-md">Logiciel</span>
              <span className="text-foreground mx-1">Ultra</span>
              <span className="text-primary drop-shadow-md">Puissant</span>
            </p>
          </div>

          {/* Seal */}
          <div className="bg-black py-3 flex justify-center border-t border-primary/20">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-yellow-700 flex items-center justify-center border-2 border-accent-foreground/30 shadow-lg">
              <Sparkles className="w-5 h-5 text-accent-foreground" />
            </div>
          </div>
        </div>

        {/* Next button */}
        <Button
          onClick={onNext}
          size="lg"
          className="w-full mt-6 h-14 text-base font-bold uppercase tracking-wider bg-gradient-to-r from-primary via-emerald-400 to-primary text-primary-foreground hover:opacity-90 shadow-[0_10px_40px_-5px_rgba(0,255,140,0.5)] group"
        >
          Suivant
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4 tracking-wide">
          AutoQuintePro v8.0 · Analyse prédictive des courses hippiques
        </p>
      </div>
    </div>
  );
}

