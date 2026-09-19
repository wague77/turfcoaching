'use client';

import WagueTurf from "@/views/WagueTurf";
import { AccessGate } from "@/components/AccessGate";

export default function WagueTurfPage() {
  return (
    <AccessGate>
      <WagueTurf />
    </AccessGate>
  );
}
