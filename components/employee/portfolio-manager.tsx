"use client";

import { useMemo, useState } from "react";
import { Edit3, ExternalLink, Images, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { updatePortfolio } from "@/actions/profile.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { UserPortfolio, UserPortfolioItem } from "@/lib/user-portfolio";

type PortfolioKind = "web" | "design" | "graphics" | "architecture";

type PortfolioManagerProps = {
  portfolio: UserPortfolio;
  skills: string[];
};

type EditTarget = {
  kind: PortfolioKind;
  index: number;
} | null;

const kindLabels: Record<PortfolioKind, string> = {
  web: "Web",
  design: "UI / Figma",
  graphics: "Graphics",
  architecture: "Architecture / 3D",
};

const kindHelpers: Record<PortfolioKind, string> = {
  web: "Website or web app work needs thumbnail, live link, title and brief.",
  design: "UI work needs thumbnail, Figma prototype link, title and brief.",
  graphics: "Graphics work needs thumbnail, title, brief and optional gallery.",
  architecture: "Architecture work needs thumbnail, title, brief and optional gallery.",
};

const emptyItem: UserPortfolioItem = {
  title: "",
  thumbnailUrl: "",
  linkUrl: "",
  brief: "",
  seoTags: [],
  galleryUrls: [],
};

function createEmptyItem(): UserPortfolioItem {
  return {
    ...emptyItem,
    seoTags: [],
    galleryUrls: [],
  };
}

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

function hasItemContent(item: UserPortfolioItem) {
  return Boolean(
    item.title.trim() ||
      item.thumbnailUrl.trim() ||
      item.linkUrl.trim() ||
      item.brief.trim() ||
      (item.galleryUrls ?? []).length ||
      (item.seoTags ?? []).length
  );
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [draftKind, setDraftKind] = useState<PortfolioKind>("web");
  const [draft, setDraft] = useState<UserPortfolioItem>(createEmptyItem());
  const [busy, setBusy] = useState(false);

  const hasSkills = skills.length > 0;
  const sections = useMemo(
    () => [
      { kind: "web" as const, items: webProjects },
      { kind: "design" as const, items: designProjects },
      { kind: "graphics" as const, items: graphicsProjects },
      { kind: "architecture" as const, items: architectureProjects },
    ],
    [webProjects, designProjects, graphicsProjects, architectureProjects]
  );
  const totalItems = sections.reduce((total, section) => total + section.items.length, 0);

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

  function openAdd() {
    setEditTarget(null);
    setDraftKind("web");
    setDraft(createEmptyItem());
    setDialogOpen(true);
  }

  function openEdit(kind: PortfolioKind, index: number) {
    const item = getItems(kind)[index];
    setEditTarget({ kind, index });
    setDraftKind(kind);
    setDraft({
      ...createEmptyItem(),
      ...item,
      seoTags: [...(item.seoTags ?? [])],
      galleryUrls: [...(item.galleryUrls ?? [])],
    });
    setDialogOpen(true);
  }

  function removeItem(kind: PortfolioKind, index: number) {
    setItems(
      kind,
      getItems(kind).filter((_, itemIndex) => itemIndex !== index)
    );
    toast.message("Portfolio item removed. Save to publish the change.");
  }

  function addOrUpdateDraft() {
    if (!hasItemContent(draft)) {
      toast.error("Add portfolio details first");
      return;
    }

    if (editTarget) {
      const nextItems = getItems(editTarget.kind).map((item, itemIndex) =>
        itemIndex === editTarget.index ? draft : item
      );
      setItems(editTarget.kind, nextItems);
      toast.success("Portfolio item updated. Save to publish.");
    } else {
      setItems(draftKind, [...getItems(draftKind), draft]);
      toast.success("Portfolio item added. Save to publish.");
    }

    setDialogOpen(false);
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
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Portfolio profile</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Keep the profile simple. Add work samples from the button below.
            </p>
          </div>
          <Button type="button" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add portfolio
          </Button>
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
            <Textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Short experience, service focus and what kind of work you do."
              className="min-h-24"
            />
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            Public visibility is automatic and depends on admin-managed skills.
            Current skills:{" "}
            <span className="font-semibold text-foreground">
              {hasSkills ? skills.join(", ") : "No skills yet"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Portfolio items</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalItems} item{totalItems === 1 ? "" : "s"} added
            </p>
          </div>
          <Button type="button" variant="outline" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add portfolio
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {totalItems === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Images className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No portfolio yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click Add portfolio, select a type, then fill only the needed fields.
              </p>
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.kind} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{kindLabels[section.kind]}</h3>
                  <Badge variant="outline">{section.items.length}</Badge>
                </div>
                {section.items.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-3 py-4 text-xs text-muted-foreground">
                    No {kindLabels[section.kind].toLowerCase()} item added.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {section.items.map((item, index) => (
                      <PortfolioPreviewCard
                        key={`${section.kind}-${index}`}
                        item={item}
                        kind={section.kind}
                        onEdit={() => openEdit(section.kind, index)}
                        onRemove={() => removeItem(section.kind, index)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Other work notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workSamples.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No short notes added.
            </p>
          ) : (
            workSamples.map((sample, index) => (
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
            ))
          )}
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

      <PortfolioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editMode={Boolean(editTarget)}
        kind={draftKind}
        onKindChange={(kind) => {
          setDraftKind(kind);
          setEditTarget(null);
          setDraft(createEmptyItem());
        }}
        draft={draft}
        onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onSubmit={addOrUpdateDraft}
      />
    </div>
  );
}

function PortfolioDialog({
  open,
  onOpenChange,
  editMode,
  kind,
  onKindChange,
  draft,
  onDraftChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMode: boolean;
  kind: PortfolioKind;
  onKindChange: (kind: PortfolioKind) => void;
  draft: UserPortfolioItem;
  onDraftChange: (patch: Partial<UserPortfolioItem>) => void;
  onSubmit: () => void;
}) {
  const isVisual = kind === "graphics" || kind === "architecture";
  const linkLabel = kind === "design" ? "Figma prototype link" : "Live link";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editMode ? "Edit portfolio" : "Add portfolio"}</DialogTitle>
          <DialogDescription>{kindHelpers[kind]}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Portfolio type</Label>
            <Select value={kind} onValueChange={(value) => onKindChange(value as PortfolioKind)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="design">UI / Figma</SelectItem>
                <SelectItem value="architecture">Architecture / 3D</SelectItem>
                <SelectItem value="graphics">Graphics</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Title"
              value={draft.title}
              onChange={(value) => onDraftChange({ title: value })}
              placeholder="Project title"
            />
            <Field
              label="Thumbnail"
              value={draft.thumbnailUrl}
              onChange={(value) => onDraftChange({ thumbnailUrl: value })}
              placeholder="Thumbnail image URL"
            />
          </div>

          {!isVisual ? (
            <Field
              label={linkLabel}
              value={draft.linkUrl}
              onChange={(value) => onDraftChange({ linkUrl: value })}
              placeholder="https://..."
            />
          ) : (
            <Field
              label="Gallery images"
              value={(draft.galleryUrls ?? []).join(", ")}
              onChange={(value) =>
                onDraftChange({
                  galleryUrls: value
                    .split(",")
                    .map((url) => url.trim())
                    .filter(Boolean)
                    .slice(0, 8),
                })
              }
              placeholder="Image URL 1, Image URL 2"
            />
          )}

          <div className="space-y-2">
            <Label>Brief</Label>
            <Textarea
              value={draft.brief}
              onChange={(event) => onDraftChange({ brief: event.target.value })}
              placeholder="Short project brief"
              className="min-h-28"
            />
          </div>

          <div className="space-y-2">
            <Label>SEO tags</Label>
            <Input
              value={(draft.seoTags ?? []).join(", ")}
              onChange={(event) =>
                onDraftChange({ seoTags: cleanSeoTags(event.target.value) })
              }
              placeholder="max 3 tags, 20 chars each"
            />
            <p className="text-[11px] text-muted-foreground">
              Maximum 3 tags. Each tag can be up to 20 characters.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit}>
            {editMode ? "Update item" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PortfolioPreviewCard({
  item,
  kind,
  onEdit,
  onRemove,
}: {
  item: UserPortfolioItem;
  kind: PortfolioKind;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const linkUrl = item.linkUrl || (kind === "design" ? "" : item.linkUrl);

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex gap-3">
        <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Images className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {item.title || "Untitled portfolio"}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {item.brief || "No brief added"}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">
              {kindLabels[kind]}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(item.seoTags ?? []).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {(item.galleryUrls ?? []).length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {(item.galleryUrls ?? []).length} gallery
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {linkUrl ? (
          <a
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">No link</span>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        </div>
      </div>
    </div>
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
