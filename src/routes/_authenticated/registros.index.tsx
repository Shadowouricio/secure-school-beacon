import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, Plus, Search, SlidersHorizontal } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIAS_OCORRENCIA, formatarData } from "@/lib/ocorrencias";

export const Route = createFileRoute("/_authenticated/registros/")({
  head: () => ({
    meta: [
      { title: "Registros de Ocorrência | Rede de Segurança Escolar" },
      {
        name: "description",
        content:
          "Dashboard de ocorrências escolares com total, busca rápida, filtros e lista dos registros recentes.",
      },
      { property: "og:title", content: "Registros de Ocorrência Escolar" },
      {
        property: "og:description",
        content: "Consulte, filtre e gere PDFs dos registros de ocorrência da instituição.",
      },
    ],
  }),
  component: RegistrosIndex,
});

function RegistrosIndex() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["registros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas")
        .select(
          "id, aluno_nome, turma, data_ocorrencia, hora_ocorrencia, local_ocorrencia, categoria, descricao, responsavel_registro, created_at",
        )
        .eq("registro_tipo", "ocorrencia")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtrados = useMemo(() => {
    if (!data) return [];
    const termo = busca.trim().toLowerCase();
    return data.filter((r) => {
      const combinaTermo =
        !termo ||
        (r.aluno_nome?.toLowerCase().includes(termo) ?? false) ||
        (r.turma?.toLowerCase().includes(termo) ?? false) ||
        (r.local_ocorrencia?.toLowerCase().includes(termo) ?? false) ||
        (r.responsavel_registro?.toLowerCase().includes(termo) ?? false);
      const combinaCategoria = !categoria || r.categoria === categoria;
      return combinaTermo && combinaCategoria;
    });
  }, [data, busca, categoria]);

  const total = data?.length ?? 0;

  return (
    <AppShell titulo="Registros de ocorrência">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Registros de ocorrência</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe os registros pedagógicos e disciplinares da escola.
          </p>
        </div>
      </div>

      <section className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total de registros</p>
          <p className="mt-1 font-display text-3xl font-bold">{total}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Recentes (30 dias)</p>
          <p className="mt-1 font-display text-3xl font-bold">
            {data?.filter((r) => new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length ?? 0}
          </p>
        </div>
      </section>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por aluno, turma, local ou responsável"
            className="h-11 bg-surface pl-9"
          />
        </div>
        <div className="relative">
          <SlidersHorizontal className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="h-11 w-full min-w-[180px] rounded-md border border-input bg-surface pl-9 pr-3 text-sm sm:w-auto"
          >
            <option value="">Todas as categorias</option>
            {CATEGORIAS_OCORRENCIA.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Button asChild className="h-11 gap-2">
          <Link to="/registros/novo">
            <Plus className="size-4" />
            Nova ocorrência
          </Link>
        </Button>
      </div>

      <section className="mt-5">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Últimas ocorrências
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtrados.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {filtrados.map((r) => (
              <li key={r.id}>
                <Link
                  to="/registros/$id"
                  params={{ id: r.id }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {r.aluno_nome?.trim() || "Registro sem aluno informado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatarData(r.data_ocorrencia)}
                      {r.hora_ocorrencia ? ` às ${r.hora_ocorrencia.slice(0, 5)}` : ""}
                      {r.turma ? ` · ${r.turma}` : ""}
                      {r.local_ocorrencia ? ` · ${r.local_ocorrencia}` : ""}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {r.categoria || "Sem categoria"}
                      {r.responsavel_registro ? ` · Responsável: ${r.responsavel_registro}` : ""}
                    </p>
                  </div>
                  <FileText className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Nenhuma ocorrência encontrada.
          </p>
        )}
      </section>
    </AppShell>
  );
}
