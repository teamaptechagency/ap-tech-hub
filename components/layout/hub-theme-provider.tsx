"use client";
import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';

export function HubThemeProvider({children}:{children:ReactNode}) {
  return <ThemeProvider attribute={['class','data-hub-appearance']} storageKey="ap-hub-appearance" defaultTheme="light" enableSystem={false} disableTransitionOnChange>{children}</ThemeProvider>;
}
