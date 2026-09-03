import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldAlert, History, LogOut, Home } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { OfflineStatus } from "@/components/OfflineStatus";

export function AppShell({ children, titulo }: { children: ReactNode; titulo?: string }) {
  const navigate = useNavigate();

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background md:max-w-2xl">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-emergency" />
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">Rede de Segurança Escolar</p>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {titulo ?? "Escola"}
            </p>
          </div>
        </div>
        <button
          onClick={sair}
          aria-label="Sair"
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </header>
      <OfflineStatus />

      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md items-stretch border-t border-border bg-surface/95 backdrop-blur md:max-w-2xl">
        <Link
          to="/"
          activeOptions={{ exact: true }}
          activeProps={{ className: "text-foreground" }}
          inactiveProps={{ className: "text-muted-foreground" }}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-xs"
        >
          <Home className="size-5" />
          Início
        </Link>
        <Link
          to="/historico"
          activeProps={{ className: "text-foreground" }}
          inactiveProps={{ className: "text-muted-foreground" }}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-xs"
        >
          <History className="size-5" />
          Histórico
        </Link>
      </nav>
    </div>
  );
}
