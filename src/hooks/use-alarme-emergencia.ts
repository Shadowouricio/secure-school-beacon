import { useCallback, useEffect, useRef, useState } from "react";

import { audioLiberado, habilitarAudio, tocarSirene } from "@/lib/alarme";

const INTERVALO_MS = 15000;

/**
 * Mantém o alarme sonoro tocando a cada 15s enquanto houver alertas de
 * emergência aguardando confirmação de recebimento. Parar somente quando o
 * status `recebimento_confirmado` (ou posterior) for registrado.
 */
export function useAlarmeEmergencia(pendentes: number) {
  const [liberado, setLiberado] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const pendentesRef = useRef(pendentes);
  pendentesRef.current = pendentes;

  const ativar = useCallback(async () => {
    const ok = await habilitarAudio();
    setLiberado(ok);
    setBloqueado(!ok);
    if (ok && pendentesRef.current > 0) tocarSirene();
    return ok;
  }, []);

  useEffect(() => {
    if (pendentes <= 0) return;
    if (!liberado && !audioLiberado()) {
      setBloqueado(true);
      return;
    }

    const disparar = () => {
      const ok = tocarSirene();
      if (!ok) {
        setLiberado(false);
        setBloqueado(true);
      }
    };

    disparar();
    const id = window.setInterval(disparar, INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [pendentes, liberado]);

  return { liberado, bloqueado, ativar };
}
