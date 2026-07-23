"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

import { clearAppCache } from "@/actions/settings.actions";
import { Button } from "@/components/ui/button";

export function ClearCacheButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function clearBrowserSiteData() {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Some privacy modes can block storage access.
    }

    try {
      document.cookie.split(";").forEach((cookie) => {
        const name = cookie.split("=")[0]?.trim();
        if (!name) return;

        const expires = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = `${name}=; ${expires}; path=/`;
        document.cookie = `${name}=; ${expires}; path=/; domain=${window.location.hostname}`;

        const parts = window.location.hostname.split(".");
        if (parts.length > 2) {
          document.cookie = `${name}=; ${expires}; path=/; domain=.${parts
            .slice(-2)
            .join(".")}`;
        }
      });
    } catch {
      // HttpOnly cookies cannot be cleared from browser JavaScript.
    }

    try {
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch {
      // Cache API may be unavailable in older/private browsers.
    }

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch {
      // Service worker access can fail on unsupported browsers.
    }

    try {
      if ("indexedDB" in window && "databases" in indexedDB) {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases
            .map((database) => database.name)
            .filter((name): name is string => Boolean(name))
            .map(
              (name) =>
                new Promise<void>((resolve) => {
                  const request = indexedDB.deleteDatabase(name);
                  request.onsuccess = () => resolve();
                  request.onerror = () => resolve();
                  request.onblocked = () => resolve();
                })
            )
        );
      }
    } catch {
      // IndexedDB database listing is browser-dependent.
    }
  }

  function handleClick() {
    startTransition(async () => {
      const result = await clearAppCache();

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      await fetch("/api/clear-site-data", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      }).catch(() => null);

      await clearBrowserSiteData();
      toast.success("Site data cleared. Reloading fresh...");
      router.refresh();

      window.setTimeout(() => {
        const freshUrl = new URL(window.location.href);
        freshUrl.searchParams.set("fresh", Date.now().toString());
        window.location.replace(freshUrl.toString());
      }, 350);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      className="gap-2"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Clearing..." : "Clear cache"}
    </Button>
  );
}
