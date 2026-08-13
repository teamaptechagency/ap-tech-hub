"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMarketplaceLevels } from "@/actions/special-order.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { MarketplaceLevelConfig } from "@/lib/marketplace-levels";

/**
 * The seller-level ladder each profile is tracked against.
 *
 * Targets are counted on what the seller keeps, so the marketplace's cut is
 * set here too — a target of USD 600 means 600 after the fee, not before.
 */
export function LevelTargets({ config }: { config: MarketplaceLevelConfig }) {
  const router = useRouter();
  const [feePercent, setFeePercent] = useState(String(config.feePercent));
  const [levels, setLevels] = useState(
    config.levels.map((level) => ({
      name: level.name,
      targetUsd: level.targetUsd ? String(level.targetUsd) : "",
    }))
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const result = await saveMarketplaceLevels({
      feePercent: Number(feePercent),
      levels: levels.map((level) => ({
        name: level.name,
        targetUsd: Number(level.targetUsd) || 0,
      })),
    });

    setBusy(false);
    if ("error" in result && result.error) return setError(result.error);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Seller level targets</CardTitle>
        <p className="text-xs text-muted-foreground">
          What a profile has to earn to reach the next level. Leave a target
          empty while the number is still unknown — the profile card will say so
          rather than show a bar against a made-up figure.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="fee-percent">Marketplace fee %</Label>
            <Input
              id="fee-percent"
              value={feePercent}
              onChange={(event) => setFeePercent(event.target.value)}
              placeholder="20"
            />
            <p className="text-[10px] text-muted-foreground">
              Taken off before progress counts. Fiverr is 20.
            </p>
          </div>

          <div className="space-y-2">
            {levels.map((level, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="grid flex-1 gap-1.5">
                  <Label className="text-xs">Level name</Label>
                  <Input
                    value={level.name}
                    onChange={(event) =>
                      setLevels((current) =>
                        current.map((item, i) =>
                          i === index
                            ? { ...item, name: event.target.value }
                            : item
                        )
                      )
                    }
                  />
                </div>
                <div className="grid w-32 gap-1.5">
                  <Label className="text-xs">Target USD</Label>
                  <Input
                    value={level.targetUsd}
                    placeholder="not set"
                    onChange={(event) =>
                      setLevels((current) =>
                        current.map((item, i) =>
                          i === index
                            ? { ...item, targetUsd: event.target.value }
                            : item
                        )
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  title="Remove level"
                  onClick={() =>
                    setLevels((current) =>
                      current.filter((_, i) => i !== index)
                    )
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setLevels((current) => [
                ...current,
                { name: `Level ${current.length}`, targetUsd: "" },
              ])
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add level
          </Button>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving..." : "Save level targets"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
