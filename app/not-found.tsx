'use client';

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", pathname);
  }, [pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center p-8 bg-card border border-border rounded-xl shadow-xl max-w-md">
        <h1 className="mb-2 text-6xl font-extrabold text-primary">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Oups ! Page introuvable</p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
          Retour à l'Accueil
        </Link>
      </div>
    </div>
  );
}
