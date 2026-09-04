import { Phone, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { CONTATOS_OFFLINE, linkTelefone } from "@/lib/offline";

export function OfflineStatus() {
  // Começa como "online" para o HTML do servidor e do cliente coincidirem na hidratação.
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const atualizar = () => setOffline(!navigator.onLine);
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    atualizar();
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);

  if (!offline) return null;

  return (
    <aside
      role="status"
      className="border-b border-warning/50 bg-warning/15 px-4 py-3 text-warning-foreground"
    >
      <div className="flex items-start gap-2">
        <WifiOff className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Modo offline ativo</p>
          <p className="mt-0.5 text-xs">
            O envio online está indisponível. Ligue diretamente para a autoridade correspondente.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {CONTATOS_OFFLINE.map((contato) => (
              <a
                key={contato.orgao}
                href={linkTelefone(contato.telefone)}
                className="flex items-center gap-1.5 rounded-md border border-warning/40 bg-background/30 px-2 py-1.5 text-xs font-medium"
              >
                <Phone className="size-3.5" />
                {contato.label}: {contato.telefone}
              </a>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
