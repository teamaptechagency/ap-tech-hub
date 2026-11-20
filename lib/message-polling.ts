/** Non-overlapping polling that stops updates when its component unmounts. */
export function startMessagePolling(update: (isActive: () => boolean) => Promise<void>, delay = 5000) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = async () => {
    try { await update(() => !stopped); }
    catch { /* Retry temporary network failures on the next tick. */ }
    finally { if (!stopped) timer = setTimeout(run, delay); }
  };
  void run();
  return () => { stopped = true; if (timer) clearTimeout(timer); };
}
