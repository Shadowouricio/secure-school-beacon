/**
 * Alarme sonoro das autoridades.
 *
 * Regras:
 * - Só toca para alertas de emergência destinados ao órgão do agente.
 * - Repete a cada 10s enquanto o recebimento não for confirmado.
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

/**
 * Sirene de emergência (estilo viatura): varredura contínua grave→aguda,
 * repetida algumas vezes. Retorna false quando o navegador bloqueia o áudio.
 */
export function tocarSirene(): boolean {
  const c = obterContexto();
  if (!c) return false;
  if ((c.state as string) !== "running") {
    void c.resume().catch(() => undefined);
    if ((c.state as string) !== "running") return false;
  }
  try {
    const inicio = c.currentTime + 0.05;
    const ciclos = 5; // ~4 segundos de sirene
    const duracaoCiclo = 0.8;

    const osc = c.createOscillator();
    const gain = c.createGain();
    const filtro = c.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 2600;

    osc.type = "sawtooth";

    // Varredura tipo "wail": sobe e desce continuamente.
    osc.frequency.setValueAtTime(520, inicio);
    for (let i = 0; i < ciclos; i += 1) {
      const t = inicio + i * duracaoCiclo;
      osc.frequency.linearRampToValueAtTime(1180, t + duracaoCiclo * 0.5);
      osc.frequency.linearRampToValueAtTime(520, t + duracaoCiclo);
    }

    const fim = inicio + ciclos * duracaoCiclo;
    gain.gain.setValueAtTime(0.0001, inicio);
    gain.gain.exponentialRampToValueAtTime(0.22, inicio + 0.08);
    gain.gain.setValueAtTime(0.22, fim - 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, fim);

    osc.connect(filtro).connect(gain).connect(c.destination);
    osc.start(inicio);
    osc.stop(fim + 0.05);
    return true;
  } catch {
    return false;
  }
}
