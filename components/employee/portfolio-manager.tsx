"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { updatePortfolio } from "@/actions/profile.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserPortfolio, UserPortfolioItem } from "@/lib/user-portfolio";

type PortfolioKind = "web" | "design" | "graphics" | "architecture";

type PortfolioManagerProps = {
  portfolio: UserPortfolio;
  skills: string[];
};

const emptyItem: UserPortfolioItem = {
  title: "",
  thumbnailUrl: "",
  linkUrl: "",
  brief: "",
  seoTags: [],
  galleryUrls: [],
};

function cleanSeoTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim().slice(0, 20))
    .filter(Boolean)
    .slice(0, 3);
}

function itemsToLines(items: UserPortfolioItem[]) {
  return items
    .map((item) =>
      [
        item.title,
        item.thumbnailUrl,
        item.linkUrl,
        item.brief,
        (item.seoTags ?? []).join(", "),
      ]
        .map((value) => value.trim())
        .join(" | ")
    )
    .join("\n");
}

function visualItemsToLines(items: UserPortfolioItem[]) {
  return items
    .map((item) =>
      [
        item.title,
        item.thumbnailUrl,
        item.brief,
        (item.galleryUrls ?? []).join(", "),
        (item.seoTags ?? []).join(", "),
      ]
        .map((value) => value.trim())
        .join(" | ")
    )
    .join("\n");
}

export function PortfolioManager({ portfolio, skills }: PortfolioManagerProps) {
  const [headline, setHeadline] = useState(portfolio.headline);
  const [summary, setSummary] = useState(portfolio.summary);
  const [portfolioUrl, setPortfolioUrl] = useState(portfolio.portfolioUrl);
  const [figmaUrl, setFigmaUrl] = useState(portfolio.figmaUrl);
  const [liveUrl, setLiveUrl] = useState(portfolio.liveUrl);
  const [workSamples, setWorkSamples] = useState(portfolio.workSamples);
  const [webProjects, setWebProjects] = useState(portfolio.webProjects);
  const [designProjects, setDesignProjects] = useState(portfolio.designProjects);
  const [graphicsProjects, setGraphicsProjects] = useState(
    portfolio.graphicsProjects
  );
  const [architectureProjects, setArchitectureProjects] = useState(
    portfolio.architectureProjects
  );
  const [busy, setBusy] = useState(false);

  const hasSkills = skills.length > 0;

  function getItems(kind: PortfolioKind) {
    if (kind === "web") return webProjects;
    if (kind === "design") return designProjects;
    if (kind === "graphics") return graphicsProjects;
    return architectureProjects;
  }

  function setItems(kind: PortfolioKind, items: UserPortfolioItem[]) {
    if (kind === "web") setWebProjects(items);
    else if (kind === "design") setDesignProjects(items);
    else if (kind === "graphics") setGraphicsProjects(items);
    else setArchitectureProjects(items);
  }

  function updateItem(
    kind: PortfolioKind,
    index: number,
    patch: Partial<UserPortfolioItem>
  ) {
    setItems(
      kind,
      getItems(kind).map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }

  function removeItem(kind: PortfolioKind, index: number) {
    setItems(
      kind,
      getItems(kind).filter((_, itemIndex) => itemIndex !== index)
    );
  }

  async function save() {
    setBusy(true);
    const result = await updatePortfolio({
      headline,
      summary,
      portfolioUrl,
      figmaUrl,
      liveUrl,
      workSamples: workSamples.join("\n"),
      webProjects: itemsToLines(webProjects),
      designProjects: itemsToLines(designProjects),
      graphicsProjects: visualItemsToLines(graphicsProjects),
      architectureProjects: visualItemsToLines(architectureProjects),
    });
    setBusy(false);
    if (result.error) return toast.error(result.error);
    toast.success("Portfolio saved");
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portfolio profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Headline"
              value={headline}
              onChange={setHeadline}
              placeholder="e.g. WordPress and SEO specialist"
            />
            <Field
              label="Portfolio link"
              value={portfolioUrl}
              onChange={setPortfolioUrl}
              placeholder="https://..."
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Default Figma link"
              value={figmaUrl}
              onChange={setFigmaUrl}
              placeholder="https://figma.com/..."
            />
            <Field
              label="Default live link"
              value={liveUrl}
              onChange={setLiveUrl}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Summary</Label>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Short experience, service focus and what kind of work you do."
              className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            Public visibility is automatic. Your portfolio can appear on the
            public team profile only when admin-managed skills match your work.
            Current skills:{" "}
            <span className="font-semibold text-foreground">
              {hasSkills ? skills.join(", ") : "No skills yet"}
            </span>
          </div>
        </CardContent>
      </Card>

      <PortfolioSection
        title="Web work"
        helper="Website/app portfolio. Add thumbnail, title, brief and live link."
        kind="web"
        items={webProjects}
        linkLabel="Live link"
        onAdd={() => setWebProjects([...webProjects, { ...emptyItem }])}
        onChange={updateItem}
        onRemove={removeItem}
      />
      <PortfolioSection
        title="Design / Figma work"
        helper="UI/UX or design prototype. Add thumbnail, title, brief and Figma link."
        kind="design"
        items={designProjects}
        linkLabel="Figma prototype link"
        onAdd={() => setDesignProjects([...designProjects, { ...emptyItem }])}
        onChange={updateItem}
        onRemove={removeItem}
      />
      <PortfolioSection
        title="Graphics / branding work"
        helper="Logo, banner, branding, social and graphic samples. Gallery is optional."
        kind="graphics"
        items={graphicsProjects}
        visualOnly
        onAdd={() => setGraphicsProjects([...graphicsProjects, { ...emptyItem }])}
        onChange={updateItem}
        onRemove={removeItem}
      />
      <PortfolioSection
        title="Architecture / 3D work"
        helper="Interior, exterior, render, model and visualization samples. Gallery is optional."
        kind="architecture"
        items={architectureProjects}
        visualOnly
        onAdd={() =>
          setArchitectureProjects([...architectureProjects, { ...emptyItem }])
        }
        onChange={updateItem}
        onRemove={removeItem}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Other work notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workSamples.map((sample, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={sample}
                onChange={(event) =>
                  setWorkSamples(
                    workSamples.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item
                    )
                  )
                }
                placeholder="Short work note"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setWorkSamples(
                    workSamples.filter((_, itemIndex) => itemIndex !== index)
                  )
                }
                aria-label="Remove note"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWorkSamples([...workSamples, ""])}
          >
            <Plus className="h-4 w-4" />
            Add note
          </Button>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-4">
        <Button type="button" onClick={save} disabled={busy}>
          <Save className="h-4 w-4" />
          {busy ? "Saving..." : "Save portfolio"}
        </Button>
      </div>
    </div>
  );
}

function PortfolioSection({
  title,
  helper,
  kind,
  items,
  linkLabel = "Link",
  visualOnly = false,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string;
  helper: string;
  kind: PortfolioKind;
  items: UserPortfolioItem[];
  linkLabel?: string;
  visualOnly?: boolean;
  onAdd: () => void;
  onChange: (
    kind: PortfolioKind,
    index: number,
    patch: Partial<UserPortfolioItem>
  ) => void;
  onRemove: (kind: PortfolioKind, index: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">
            No items yet. Click Add to create one.
          </div>
        ) : (
          items.map((item, index) => (
            <div key={index} className="rounded-md border bg-muted/20 p-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Title"
                  value={item.title}
                  onChange={(value) => onChange(kind, index, { title: value })}
                  placeholder="Project title"
                />
                <Field
                  label="Thumbnail"
                  value={item.thumbnailUrl}
                  onChange={(value) =>
                    onChange(kind, index, { thumbnailUrl: value })
                  }
                  placeholder="Thumbnail image URL"
                />
                {!visualOnly && (
                  <Field
                    label={linkLabel}
                    value={item.linkUrl}
                    onChange={(value) =>
                      onChange(kind, index, { linkUrl: value })
                    }
                    placeholder="https://..."
                  />
                )}
                {visualOnly && (
                  <Field
                    label="Gallery"
                    value={(item.galleryUrls ?? []).join(", ")}
                    onChange={(value) =>
                      onChange(kind, index, {
                        galleryUrls: value
                          .split(",")
                          .map((url) => url.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Image URL 1, Image URL 2"
                  />
                )}
                <Field
                  label="SEO tags"
                  value={(item.seoTags ?? []).join(", ")}
                  onChange={(value) =>
                    onChange(kind, index, { seoTags: cleanSeoTags(value) })
                  }
                  placeholder="max 3 tags, 20 chars each"
                />
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                SEO tags: maximum 3 tags. Each tag can be up to 20 characters.
              </p>
              <div className="mt-3 space-y-2">
                <Label>Brief</Label>
                <textarea
                  value={item.brief}
                  onChange={(event) =>
                    onChange(kind, index, { brief: event.target.value })
                  }
                  placeholder="Short project brief"
                  className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRemove(kind, index)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
