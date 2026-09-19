'use client';

import Forum from "@/views/Forum";
import { AccessGate } from "@/components/AccessGate";

export default function ForumPage() {
  return (
    <AccessGate>
      <Forum />
    </AccessGate>
  );
}
