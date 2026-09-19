'use client';

import TurfCoaching from "@/views/TurfCoaching";
import { AccessGate } from "@/components/AccessGate";

export default function TurfCoachingPage() {
  return (
    <AccessGate>
      <TurfCoaching />
    </AccessGate>
  );
}
