"use client";

import { useState } from "react";
import { toast } from "sonner";

import { requestPointExchange } from "@/actions/client-portal.actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type PointExchangeFormProps = {
  points: number;
  pointsPerDollar: number;
  /** The smallest exchange the team accepts, set by the super admin. */
  minimumPoints: number;
  hasPending: boolean;
};

export function PointExchangeForm({
  points,
  pointsPerDollar,
  minimumPoints,
  hasPending,
}: PointExchangeFormProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (hasPending || done) {
    return (
      <Card>
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          Point exchange request pending — the team will review it shortly.
        </CardContent>
      </Card>
    );
  }

  if (points <= 0 || pointsPerDollar <= 0) {
    return null;
  }

  // Below the floor there is nothing to fill in, so the card says how far off
  // they are rather than showing a form that can only be refused.
  if (points < minimumPoints) {
    const short = minimumPoints - points;
    return (
      <Card>
        <CardContent className="space-y-1 py-4">
          <p className="text-xs font-medium">Sell points → balance credit</p>
          <p className="text-sm text-muted-foreground">
            Exchanges start at {minimumPoints.toLocaleString()} points. You have{" "}
            {points.toLocaleString()} — {short.toLocaleString()} more to go.
          </p>
        </CardContent>
      </Card>
    );
  }

  const numericAmount = Number(amount);

  const dollars =
    Number.isFinite(numericAmount) && numericAmount > 0
      ? numericAmount / pointsPerDollar
      : 0;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy) return;

    setError("");

    const requestedPoints = Number(amount);

    if (
      !Number.isFinite(requestedPoints) ||
      !Number.isInteger(requestedPoints) ||
      requestedPoints <= 0
    ) {
      const message = "Enter a valid whole-number point amount";
      setError(message);
      toast.error(message);
      return;
    }

    if (requestedPoints < minimumPoints) {
      const message = `The smallest exchange is ${minimumPoints.toLocaleString()} points`;
      setError(message);
      toast.error(message);
      return;
    }

    if (requestedPoints > points) {
      const message = "You do not have enough points";
      setError(message);
      toast.error(message);
      return;
    }

    setBusy(true);

    try {
      const result = await requestPointExchange(requestedPoints);

      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setDone(true);
      setAmount("");
      toast.success("Point exchange request submitted");
    } catch (error) {
      console.error("Point exchange request failed:", error);

      const message =
        "Something went wrong while submitting your request";

      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="space-y-1">
            <p className="text-xs font-medium">
              Sell points → balance credit
            </p>

            <Input
              type="number"
              min={minimumPoints}
              max={points}
              step={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={`${minimumPoints.toLocaleString()}–${points.toLocaleString()}`}
              className="w-40"
              disabled={busy}
              required
            />
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={
              busy ||
              !amount ||
              !Number.isFinite(numericAmount) ||
              numericAmount < minimumPoints ||
              numericAmount > points
            }
          >
            {busy
              ? "Submitting..."
              : `Request $${dollars.toFixed(2)} credit`}
          </Button>

          {error && (
            <p role="alert" className="w-full text-sm text-red-500">
              {error}
            </p>
          )}
        </form>

        <p className="mt-2 text-[10px] text-muted-foreground">
          Smallest exchange {minimumPoints.toLocaleString()} points · needs team
          approval — credit lands in your balance once approved.
        </p>
      </CardContent>
    </Card>
  );
}