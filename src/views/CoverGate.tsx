
'use client';

import { useState, useEffect } from "react";
import Cover from "./Cover";
import { AccessGate } from "@/components/AccessGate";
import Index from "./Index";

const COVER_KEY = "cover_seen_v1";

export default function CoverGate() {
  const [mounted, setMounted] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(COVER_KEY) === "1") {
        setSeen(true);
      }
    } catch {}
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!seen) {
    return (
      <Cover
        onNext={() => {
          try {
            localStorage.setItem(COVER_KEY, "1");
          } catch {}
          setSeen(true);
        }}
      />
    );
  }

  return (
    <AccessGate>
      <Index />
    </AccessGate>
  );
}

