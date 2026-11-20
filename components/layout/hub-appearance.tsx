"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function HubAppearance() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let saved = false;
    try { saved = window.localStorage.getItem("ap-hub-appearance") === "dark"; } catch { /* Appearance still works without persistent storage. */ }
    setDark(saved);
    document.documentElement.dataset.hubAppearance = saved ? "dark" : "light";
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.hubAppearance = next ? "dark" : "light";
    try { window.localStorage.setItem("ap-hub-appearance", next ? "dark" : "light"); } catch { /* Keep the selection for this page. */ }
  }
  return <button type="button" className="hub-appearance" onClick={toggle} aria-label={dark ? "Switch to light appearance" : "Switch to dark appearance"} title="Switch appearance">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>;
}
