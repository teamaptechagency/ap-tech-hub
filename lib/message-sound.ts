let audioContext: AudioContext | null = null;
let lastPlayedAt = 0;

type WindowWithAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (audioContext) return audioContext;

  const AudioCtor =
    window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext;
  if (!AudioCtor) return null;

  audioContext = new AudioCtor();
  return audioContext;
}

export async function playWaterDropMessageSound() {
  const now = Date.now();
  if (now - lastPlayedAt < 450) return;
  lastPlayedAt = now;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  } catch {
    return;
  }

  const start = ctx.currentTime;
  const master = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const delay = ctx.createDelay();
  const echo = ctx.createGain();

  master.gain.setValueAtTime(0.0001, start);
  master.gain.exponentialRampToValueAtTime(0.16, start + 0.012);
  master.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, start);
  filter.frequency.exponentialRampToValueAtTime(760, start + 0.22);

  delay.delayTime.setValueAtTime(0.085, start);
  echo.gain.setValueAtTime(0.12, start);
  echo.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);

  filter.connect(master);
  master.connect(ctx.destination);
  filter.connect(delay);
  delay.connect(echo);
  echo.connect(ctx.destination);

  const drop = ctx.createOscillator();
  const sparkle = ctx.createOscillator();

  drop.type = "sine";
  drop.frequency.setValueAtTime(940, start);
  drop.frequency.exponentialRampToValueAtTime(410, start + 0.18);

  sparkle.type = "triangle";
  sparkle.frequency.setValueAtTime(1480, start + 0.018);
  sparkle.frequency.exponentialRampToValueAtTime(720, start + 0.16);

  drop.connect(filter);
  sparkle.connect(filter);

  drop.start(start);
  sparkle.start(start + 0.018);
  drop.stop(start + 0.36);
  sparkle.stop(start + 0.22);
}
