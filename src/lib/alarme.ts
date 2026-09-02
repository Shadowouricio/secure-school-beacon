/**
 * Alarme sonoro das autoridades.
 *
 * Regras:
 * - Só toca para alertas de emergência destinados ao órgão do agente.
 * - Repete a cada 15s enquanto o recebimento não for confirmado.
 * - Nunca altera o volume do dispositivo (apenas gera o som).
 */

let ctx: AudioContext | null = null;

function obterContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  return ctx;
}

/** Deve ser chamada a partir de um gesto do usuário (clique). */
export async function habilitarAudio(): Promise<boolean> {
  const c = obterContexto();
  if (!c) return false;
  try {
    await c.resume();
    // "Toque" silencioso para destravar o áudio em iOS/Safari.
    const osc = c.createOscillator();
    const gain = c.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.02);
    return c.state === "running";
  } catch {
    return false;
  }
}

export function audioLiberado(): boolean {
  return ctx?.state === "running";
}

/** Toca a sirene curta. Retorna false quando o navegador bloqueia o áudio. */
export function tocarSirene(): boolean {
  const c = obterContexto();
  if (!c) return false;
  if (c.state !== "running") {
    void c.resume().catch(() => undefined);
    if (c.state !== "running") return false;
  }
  try {
    const agora = c.currentTime;
    [0, 0.35, 0.7].forEach((offset) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(660, agora + offset);
      osc.frequency.linearRampToValueAtTime(1040, agora + offset + 0.22);
      gain.gain.setValueAtTime(0.0001, agora + offset);
      gain.gain.exponentialRampToValueAtTime(0.16, agora + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, agora + offset + 0.28);
      osc.connect(gain).connect(c.destination);
      osc.start(agora + offset);
      osc.stop(agora + offset + 0.3);
    });
    return true;
  } catch {
    return false;
  }
}
