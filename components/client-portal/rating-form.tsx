"use client";

import { useState } from "react";
import { rateWorker } from "@/actions/rating.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

export function RatingForm({
  jobId,
  workers,
  existing,
}: {
  jobId: string;
  workers: { id: string; name: string }[];
  existing: { workerId: string; stars: number; review: string | null }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Rate the team</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workers.map((w) => (
          <WorkerRating
            key={w.id}
            jobId={jobId}
            worker={w}
            existing={existing.find((e) => e.workerId === w.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function WorkerRating({
  jobId,
  worker,
  existing,
}: {
  jobId: string;
  worker: { id: string; name: string };
  existing?: { stars: number; review: string | null };
}) {
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState(existing?.review ?? "");
  const [saved, setSaved] = useState(!!existing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setBusy(true);
    const result = await rateWorker(jobId, worker.id, { stars, review });
    setBusy(false);
    if (result.error) return setError(result.error);
    setSaved(true);
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{worker.name}</p>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => {
                setStars(n);
                setSaved(false);
              }}
            >
              <Star
                className={`h-5 w-5 ${
                  n <= (hover || stars)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      {stars > 0 && !saved && (
        <div className="mt-2 space-y-2">
          <Textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={2}
            placeholder="A short review (optional)"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? "Saving..." : "Submit rating"}
          </Button>
        </div>
      )}
      {saved && stars > 0 && (
        <p className="mt-1 text-xs text-green-600">Thanks for your rating!</p>
      )}
    </div>
  );
}