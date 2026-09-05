import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ORGAOS, carregarPerfil, type Orgao } from "@/lib/autoridades";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso da Escola | Rede de Segurança Escolar" },
      {
        name: "description",
        content:
          "Login e cadastro de instituições de ensino na Rede de Segurança Escolar para envio de alertas de emergência às autoridades.",
      },
      { property: "og:title", content: "Acesso da Escola | Rede de Segurança Escolar" },
      {
        property: "og:description",
        content: "Área exclusiva para escolas cadastradas enviarem alertas de emergência.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(false);
  const [orgao, setOrgao] = useState<Orgao>("policia");
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;


  async function irParaPainel() {
    const perfil = await carregarPerfil();
    navigate({ to: perfil === "autoridade" ? "/central" : "/" });
  }

  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("senha")),
    });
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    await irParaPainel();
  }

  async function cadastrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get("email")).trim(),
      password: String(form.get("senha")),
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          nome: String(form.get("nome")).trim(),
          cnpj: String(form.get("cnpj") ?? "").trim(),
          endereco: String(form.get("endereco") ?? "").trim(),
          cidade: String(form.get("cidade") ?? "").trim(),
          estado: String(form.get("estado") ?? "").trim(),
          telefone: String(form.get("telefone") ?? "").trim(),
          responsavel: String(form.get("responsavel") ?? "").trim(),
        },
      },
    });
    if (!error && data.user) {
      await supabase.from("user_roles").insert({ user_id: data.user.id, role: "escola" });
    }
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível cadastrar", { description: error.message });
      return;
    }
    toast.success("Instituição cadastrada com sucesso");
    navigate({ to: "/" });
  }

  async function cadastrarAutoridade(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get("email")).trim(),
      password: String(form.get("senha")),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error || !data.user) {
      setCarregando(false);
      toast.error("Não foi possível cadastrar", { description: error?.message });
      return;
    }
    const uid = data.user.id;
    const { error: erroPerfil } = await supabase.from("autoridades").insert({
      id: uid,
      nome_agente: String(form.get("nome_agente")).trim(),
      orgao: orgao,
      unidade: String(form.get("unidade") ?? "").trim(),
      matricula: String(form.get("matricula") ?? "").trim(),
      telefone: String(form.get("telefone") ?? "").trim(),
      cidade: String(form.get("cidade") ?? "").trim(),
      estado: String(form.get("estado") ?? "").trim(),
    });
    if (!erroPerfil) {
      await supabase.from("user_roles").insert({ user_id: uid, role: "autoridade" });
    }
    setCarregando(false);
    if (erroPerfil) {
      toast.error("Não foi possível criar o perfil", { description: erroPerfil.message });
      return;
    }
    toast.success("Órgão cadastrado com sucesso");
    navigate({ to: "/central" });
  }


  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-emergency/15">
          <ShieldAlert className="size-7 text-emergency" />
        </div>
        <h1 className="font-display text-2xl font-bold">Rede de Segurança Escolar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acesso exclusivo para instituições cadastradas
        </p>
      </div>

      <Tabs defaultValue="login">
        <TabsList className="grid w-full grid-cols-3 bg-surface">
          <TabsTrigger value="login">Entrar</TabsTrigger>
          <TabsTrigger value="cadastro">Escola</TabsTrigger>
          <TabsTrigger value="autoridade">Autoridade</TabsTrigger>
        </TabsList>


        <TabsContent value="login" className="mt-6">
          <form onSubmit={entrar} className="space-y-4">
            <Campo id="email-login" name="email" label="E-mail institucional" type="email" required />
            <Campo id="senha-login" name="senha" label="Senha" type="password" required />
            <Button type="submit" size="lg" className="w-full" disabled={carregando}>
              {carregando ? <Loader2 className="size-4 animate-spin" /> : null}
              Entrar
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="cadastro" className="mt-6">
          <form onSubmit={cadastrar} className="space-y-4">
            <Campo id="nome" name="nome" label="Nome da instituição" required />
            <Campo id="responsavel" name="responsavel" label="Responsável / Diretor(a)" required />
            <div className="grid grid-cols-2 gap-3">
              <Campo id="cnpj" name="cnpj" label="CNPJ" />
              <Campo id="telefone" name="telefone" label="Telefone" />
            </div>
            <Campo id="endereco" name="endereco" label="Endereço" />
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <Campo id="cidade" name="cidade" label="Cidade" />
              <Campo id="estado" name="estado" label="UF" maxLength={2} />
            </div>
            <Campo id="email-cad" name="email" label="E-mail institucional" type="email" required />
            <Campo
              id="senha-cad"
              name="senha"
              label="Senha"
              type="password"
              required
              minLength={8}
            />
            <Button type="submit" size="lg" className="w-full" disabled={carregando}>
              {carregando ? <Loader2 className="size-4 animate-spin" /> : null}
              Cadastrar instituição
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="autoridade" className="mt-6">
          <form onSubmit={cadastrarAutoridade} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Órgão responsável
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {ORGAOS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setOrgao(o.value)}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                      orgao === o.value
                        ? "border-info bg-info/15 text-foreground"
                        : "border-border bg-surface text-muted-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <Campo id="nome-agente" name="nome_agente" label="Nome do agente" required />
            <div className="grid grid-cols-2 gap-3">
              <Campo id="unidade" name="unidade" label="Unidade / Batalhão" />
              <Campo id="matricula" name="matricula" label="Matrícula" />
            </div>
            <div className="grid grid-cols-[1fr_90px] gap-3">
              <Campo id="cidade-aut" name="cidade" label="Cidade" />
              <Campo id="estado-aut" name="estado" label="UF" maxLength={2} />
            </div>
            <Campo id="telefone-aut" name="telefone" label="Telefone de plantão" />
            <Campo id="email-aut" name="email" label="E-mail funcional" type="email" required />
            <Campo
              id="senha-aut"
              name="senha"
              label="Senha"
              type="password"
              required
              minLength={8}
            />
            <Button type="submit" size="lg" className="w-full" disabled={carregando}>
              {carregando ? <Loader2 className="size-4 animate-spin" /> : null}
              Cadastrar órgão
            </Button>
          </form>
        </TabsContent>
      </Tabs>

    </div>
  );
}

function Campo({
  id,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input id={id} className="h-11 bg-surface" {...props} />
    </div>
  );
}
