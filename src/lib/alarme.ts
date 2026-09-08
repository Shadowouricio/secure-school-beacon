/**
 * Alarme sonoro das autoridades.
 *
 * Regras:
 * - Só toca para alertas de emergência destinados ao órgão do agente.
 * - Repete a cada 10s enquanto o recebimento não for confirmado.
 * - Usa o áudio real em public/sounds/alarme-emergencia.mp3.
 */

let audio: HTMLAudioElement | null = null;

function obterAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio("/sounds/alarme-emergencia.mp3");
    audio.preload = "auto";
  }
  return audio;
}

/** Deve ser chamada a partir de um gesto do usuário (clique). */
export async function habilitarAudio(): Promise<boolean> {
  const a = obterAudio();
  if (!a) return false;

  try {
    // A interação do usuário libera a reprodução posterior do alarme.
    a.muted = true;
    await a.play();
    a.pause();
    a.currentTime = 0;
    a.muted = false;
    return true;
  } catch {
    a.muted = false;
    return false;
  }
}

export function audioLiberado(): boolean {
  return Boolean(audio);
}

/**
 * Reproduz o áudio de emergência completo.
 * Retorna false quando o navegador bloqueia a reprodução.
 */
export function tocarSirene(): boolean {
  const a = obterAudio();
  if (!a) return false;

  try {
    a.currentTime = 0;
    const promessa = a.play();
    if (promessa) {
      promessa.catch(() => undefined);
    }
    return true;
  } catch {
    return false;
  }
}
