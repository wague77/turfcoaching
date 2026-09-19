
'use client';

import { useState } from "react";
import Cover from "./Cover";
import { AccessGate } from "@/components/AccessGate";
import Index from "./Index";

const COVER_KEY = "cover_seen_v1";

export default function CoverGate() {
  const [seen, setSeen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COVER_KEY) === "1";
    } catch {
      return false;
    }
  });

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

