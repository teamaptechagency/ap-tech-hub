"use client";
import type { ComponentProps } from "react";

/** Open the browser's calendar/clock when any part of the field is clicked. */
export function DateTimeInput({ className = "", onClick, ...props }: Omit<ComponentProps<"input">, "type"> & { type: "date" | "time" | "month" | "datetime-local" }) {
  return <input {...props} className={`${className} cursor-pointer [color-scheme:light] dark:[color-scheme:dark]`} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.currentTarget.disabled || event.currentTarget.readOnly) return;
    try { event.currentTarget.showPicker?.(); } catch { /* Older browsers retain the normal native control. */ }
  }} />;
}
