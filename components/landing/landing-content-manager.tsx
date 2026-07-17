"use client";

import { ImageUp, Plus, Save, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateLandingContent } from "@/actions/settings.actions";
import type {
  LandingCategoryData,
  LandingHeroSlideData,
  LandingPageData,
  LandingProjectData,
  LandingReviewData,
  LandingServiceData,
  LandingTeamMemberData,
} from "@/lib/landing-data";

type SectionKey =
  | "topbar"
  | "ads"
  | "hero"
  | "categories"
  | "services"
  | "projects"
  | "team"
  | "reviews"
  | "seo"
  | "about"
  | "footer";

const sections: { key: SectionKey; label: string }[] = [
  { key: "topbar", label: "Offer bar" },
  { key: "ads", label: "Ad manager" },
  { key: "hero", label: "Hero sliders" },
  { key: "categories", label: "Service categories" },
  { key: "services", label: "Services" },
  { key: "projects", label: "Projects" },
  { key: "team", label: "Team" },
  { key: "reviews", label: "Reviews" },
  { key: "seo", label: "SEO / Google" },
  { key: "about", label: "About" },
  { key: "footer", label: "Footer / Policy" },
];

type BackendMemberOption = {
  id: string;
  name: string;
  role: string;
  bio?: string | null;
  photoUrl?: string | null;
  skills: string[];
};

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function actionError(result: unknown) {
  if (
    result &&
    typeof result === "object" &&
    "error" in result &&
    typeof result.error === "string"
  ) {
    return result.error;
  }
  return null;
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
}: {
  label: string;
  value?: string | number | null;
  onChange: (value: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {textarea ? (
        <textarea
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
        />
      ) : (
        <input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
        />
      )}
    </label>
  );
}

function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please attach an image file");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      const fileUrl = payload?.attachment?.fileUrl;

      if (!response.ok || typeof fileUrl !== "string") {
        toast.error(payload?.error ?? "Image upload failed");
        return;
      }

      onChange(fileUrl);
      toast.success("Image attached");
    } catch (error) {
      console.error("Landing image upload failed:", error);
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-2 text-sm md:col-span-2">
      <span className="font-medium">{label}</span>
      {value ? (
        <img
          src={value}
          alt=""
          className="h-28 w-full rounded-lg border object-cover"
        />
      ) : null}
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Image URL or attached image link"
          className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
        />
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 font-medium hover:bg-muted">
          <ImageUp className="h-4 w-4" />
          {uploading ? "Uploading..." : "Attach image"}
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(event) =>
              void uploadImage(event.currentTarget.files?.[0] ?? null)
            }
            className="sr-only"
          />
        </label>
      </div>
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function Panel({
  title,
  children,
  onDelete,
}: {
  title: string;
  children: React.ReactNode;
  onDelete?: () => void;
}) {
  return (
    <div className="h-full rounded-xl border bg-card p-4">
      <div className="mb-4 flex min-h-9 items-center justify-between gap-3">
        <h3 className="line-clamp-2 font-semibold">{title}</h3>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-md border border-red-500/40 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </div>
  );
}

export function LandingContentManager({
  initialData,
  backendMembers = [],
}: {
  initialData: LandingPageData;
  backendMembers?: BackendMemberOption[];
}) {
  const [data, setData] = useState(initialData);
  const [active, setActive] = useState<SectionKey>("hero");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateLandingContent(JSON.stringify(data));
      const error = actionError(result);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Landing content saved");
    });
  }

  function updateHero(index: number, patch: Partial<LandingHeroSlideData>) {
    setData((current) => ({
      ...current,
      heroSlides: current.heroSlides.map((slide, itemIndex) =>
        itemIndex === index ? { ...slide, ...patch } : slide
      ),
    }));
  }

  function updateService(index: number, patch: Partial<LandingServiceData>) {
    setData((current) => ({
      ...current,
      services: current.services.map((service, itemIndex) =>
        itemIndex === index ? { ...service, ...patch } : service
      ),
    }));
  }

  function updateCategory(index: number, patch: Partial<LandingCategoryData>) {
    setData((current) => ({
      ...current,
      categories: current.categories.map((category, itemIndex) =>
        itemIndex === index ? { ...category, ...patch } : category
      ),
    }));
  }

  function updateProject(index: number, patch: Partial<LandingProjectData>) {
    setData((current) => ({
      ...current,
      projects: current.projects.map((project, itemIndex) =>
        itemIndex === index ? { ...project, ...patch } : project
      ),
    }));
  }

  function updateMember(index: number, patch: Partial<LandingTeamMemberData>) {
    setData((current) => ({
      ...current,
      team: current.team.map((member, itemIndex) =>
        itemIndex === index ? { ...member, ...patch } : member
      ),
    }));
  }

  function updateReview(index: number, patch: Partial<LandingReviewData>) {
    setData((current) => ({
      ...current,
      reviews: current.reviews.map((review, itemIndex) =>
        itemIndex === index ? { ...review, ...patch } : review
      ),
    }));
  }

  function updateAd(
    key: keyof LandingPageData["ads"],
    patch: Partial<LandingPageData["ads"]["popup"]>
  ) {
    setData((current) => ({
      ...current,
      ads: {
        ...current.ads,
        [key]: {
          ...current.ads[key],
          ...patch,
        },
      },
    }));
  }

  const categoryOptions = data.categories.map((category) => ({
    label: category.name,
    value: category.slug,
  }));
  const serviceOptions = [
    { label: "Select service", value: "" },
    ...data.services.map((service) => ({
      label: service.title,
      value: service.title,
    })),
  ];
  const backendMemberOptions = [
    { label: "Pick from backend profile", value: "" },
    ...backendMembers.map((member) => ({
      label: `${member.name} - ${member.role}`,
      value: member.id,
    })),
  ];

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Public Portal</h1>
          <p className="text-sm text-muted-foreground">
            Manage public hero, services, categories, projects, team, reviews,
            policies and visibility from here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/"
            target="_blank"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Preview page
          </a>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {pending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-xl border bg-card p-2">
        {sections.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => setActive(section.key)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
              active === section.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {active === "topbar" && (
        <Panel title="Public offer / trust bar">
          <ToggleField
            label="Show offer bar above header"
            checked={data.topBar.enabled}
            onChange={(value) =>
              setData((current) => ({
                ...current,
                topBar: { ...current.topBar, enabled: value },
              }))
            }
          />
          <Field
            label="Offer headline"
            value={data.topBar.offerText}
            onChange={(value) =>
              setData((current) => ({
                ...current,
                topBar: { ...current.topBar, offerText: value },
              }))
            }
          />
          <Field
            label="Countdown end date/time"
            value={data.topBar.countdownEndsAt}
            onChange={(value) =>
              setData((current) => ({
                ...current,
                topBar: { ...current.topBar, countdownEndsAt: value },
              }))
            }
          />
          <Hint>
            Example: 2026-07-27T20:00:00. Empty hole default "10 days 2 hours"
            show korbe.
          </Hint>
          <Field
            label="Animated offer text (one message per line)"
            value={data.topBar.messages.join("\n")}
            textarea
            onChange={(value) =>
              setData((current) => ({
                ...current,
                topBar: {
                  ...current.topBar,
                  messages: value
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                },
              }))
            }
          />
          <Hint>
            Right-side visitor and project counters are simulated slowly on the
            public page so the sequence looks natural, not spammy.
          </Hint>
        </Panel>
      )}

      {active === "ads" && (
        <EditorList title="Ad manager">
          {(
            [
              ["popup", "Popup ad"],
              ["top", "Top ad"],
              ["left", "Left side ad"],
              ["right", "Right side ad"],
            ] as const
          ).map(([key, label]) => {
            const ad = data.ads[key];
            return (
              <Panel key={key} title={label}>
                <ToggleField
                  label={`Show ${label}`}
                  checked={ad.enabled}
                  onChange={(value) => updateAd(key, { enabled: value })}
                />
                <ToggleField
                  label="Desktop only"
                  checked={ad.desktopOnly}
                  onChange={(value) => updateAd(key, { desktopOnly: value })}
                />
                <Field
                  label="Title"
                  value={ad.title}
                  onChange={(value) => updateAd(key, { title: value })}
                />
                <Field
                  label="Body"
                  value={ad.body}
                  textarea
                  onChange={(value) => updateAd(key, { body: value })}
                />
                <ImageField
                  label="Ad image"
                  value={ad.imageUrl}
                  onChange={(value) => updateAd(key, { imageUrl: value })}
                  hint="Optional. Recommended image: 900x600. Empty hole text-only ad show korbe."
                />
                <Field
                  label="Button label"
                  value={ad.buttonLabel}
                  onChange={(value) => updateAd(key, { buttonLabel: value })}
                />
                <Field
                  label="Button URL / target"
                  value={ad.buttonUrl}
                  onChange={(value) => updateAd(key, { buttonUrl: value })}
                />
                <Hint>
                  Use #contact for landing contact section, or full URL for an
                  external page. Left/right ads desktop side-e show kore; mobile
                  e small % icon diye popup hobe.
                </Hint>
              </Panel>
            );
          })}
        </EditorList>
      )}

      {active === "hero" && (
        <EditorList
          title="Hero slider"
          onAdd={() =>
            setData((current) => ({
              ...current,
              heroSlides: [
                ...current.heroSlides,
                {
                  id: newId("hero"),
                  badge: "New slide",
                  title: "Creative Solutions That Drive Results",
                  description: "Write your landing page hero message here.",
                  primaryLabel: "Our Services",
                  primaryTarget: "#services",
                  secondaryLabel: "View Portfolio",
                  secondaryTarget: "#portfolio",
                },
              ],
            }))
          }
        >
          {data.heroSlides.map((slide, index) => (
            <Panel
              key={slide.id}
              title={`Slide ${index + 1}`}
              onDelete={() =>
                setData((current) => ({
                  ...current,
                  heroSlides: current.heroSlides.filter((_, i) => i !== index),
                }))
              }
            >
              <Field label="Badge" value={slide.badge} onChange={(value) => updateHero(index, { badge: value })} />
              <Field label="Title" value={slide.title} onChange={(value) => updateHero(index, { title: value })} />
              <Field label="Description" value={slide.description} textarea onChange={(value) => updateHero(index, { description: value })} />
              <Field label="Primary button" value={slide.primaryLabel} onChange={(value) => updateHero(index, { primaryLabel: value })} />
              <Field label="Primary target" value={slide.primaryTarget} onChange={(value) => updateHero(index, { primaryTarget: value })} />
              <Field label="Secondary button" value={slide.secondaryLabel} onChange={(value) => updateHero(index, { secondaryLabel: value })} />
              <Field label="Secondary target" value={slide.secondaryTarget} onChange={(value) => updateHero(index, { secondaryTarget: value })} />
              <ImageField label="Hero image" value={slide.imageUrl} onChange={(value) => updateHero(index, { imageUrl: value })} hint="Recommended hero image: 1600x900 or wider. If empty, the current dark hero card design stays." />
            </Panel>
          ))}
        </EditorList>
      )}

      {active === "categories" && (
        <EditorList
          title="Service categories"
          onAdd={() =>
            setData((current) => ({
              ...current,
              categories: [
                ...current.categories,
                {
                  id: newId("category"),
                  name: "New Category",
                  slug: "new-category",
                },
              ],
            }))
          }
        >
          {data.categories.map((category, index) => (
            <Panel
              key={category.id}
              title={category.name || `Category ${index + 1}`}
              onDelete={
                category.slug === "all"
                  ? undefined
                  : () =>
                      setData((current) => ({
                        ...current,
                        categories: current.categories.filter((_, i) => i !== index),
                      }))
              }
            >
              <Field
                label="Name"
                value={category.name}
                onChange={(value) => updateCategory(index, { name: value })}
              />
              <Field
                label="Slug"
                value={category.slug}
                onChange={(value) => updateCategory(index, { slug: value })}
              />
            </Panel>
          ))}
        </EditorList>
      )}

      {active === "services" && (
        <EditorList
          title="Services"
          onAdd={() =>
            setData((current) => ({
              ...current,
              services: [
                ...current.services,
                {
                  id: newId("service"),
                  categorySlug: "all",
                  title: "New Service",
                  description: "Short service description.",
                  priceRange: "Start from 100 USD",
                  details: "Long details for popup.",
                  icon: "briefcase",
                },
              ],
            }))
          }
        >
          {data.services.map((service, index) => (
            <Panel
              key={service.id}
              title={service.title || `Service ${index + 1}`}
              onDelete={() =>
                setData((current) => ({
                  ...current,
                  services: current.services.filter((_, i) => i !== index),
                }))
              }
            >
              <Field label="Title" value={service.title} onChange={(value) => updateService(index, { title: value })} />
              <SelectField label="Category" value={service.categorySlug} options={categoryOptions} onChange={(value) => updateService(index, { categorySlug: value })} />
              <Field label="Icon key" value={service.icon} onChange={(value) => updateService(index, { icon: value })} />
              <Field label="Price range" value={service.priceRange} onChange={(value) => updateService(index, { priceRange: value })} />
              <Field label="Rating" value={service.rating} onChange={(value) => updateService(index, { rating: value })} />
              <Field label="Card emoji" value={service.emoji} onChange={(value) => updateService(index, { emoji: value })} />
              <Field label="Card accent color" value={service.accent} onChange={(value) => updateService(index, { accent: value })} />
              <ImageField label="Thumbnail / image" value={service.thumbnailUrl || service.imageUrl} onChange={(value) => updateService(index, { thumbnailUrl: value, imageUrl: value })} hint="Recommended service thumbnail: 600x400. It will cover-crop to keep cards clean." />
              <Field label="Tags (comma separated)" value={(service.tags ?? []).join(", ")} onChange={(value) => updateService(index, { tags: value.split(",").map((item) => item.trim()).filter(Boolean) })} />
              <Field label="Short description" value={service.description} textarea onChange={(value) => updateService(index, { description: value })} />
              <Field label="Popup details" value={service.details} textarea onChange={(value) => updateService(index, { details: value })} />
              <ToggleField label="Hide from public portal" checked={service.hidden} onChange={(value) => updateService(index, { hidden: value })} />
            </Panel>
          ))}
        </EditorList>
      )}

      {active === "projects" && (
        <EditorList
          title="Recent projects"
          onAdd={() =>
            setData((current) => ({
              ...current,
              projects: [
                ...current.projects,
                {
                  id: newId("project"),
                  title: "New Project",
                  category: "Web Application",
                  description: "Short project summary.",
                  details: "Project details for popup.",
                },
              ],
            }))
          }
        >
          {data.projects.map((project, index) => (
            <Panel
              key={project.id}
              title={project.title || `Project ${index + 1}`}
              onDelete={() =>
                setData((current) => ({
                  ...current,
                  projects: current.projects.filter((_, i) => i !== index),
                }))
              }
            >
              <Field label="Title" value={project.title} onChange={(value) => updateProject(index, { title: value })} />
              <Field label="Category" value={project.category} onChange={(value) => updateProject(index, { category: value })} />
              <Field label="Service" value={project.service} onChange={(value) => updateProject(index, { service: value })} />
              <Field label="Budget" value={project.budget} onChange={(value) => updateProject(index, { budget: value })} />
              <Field label="Live project URL" value={project.projectUrl} onChange={(value) => updateProject(index, { projectUrl: value })} />
              <Field label="Figma URL" value={project.figmaUrl} onChange={(value) => updateProject(index, { figmaUrl: value })} />
              <ImageField label="Project thumbnail" value={project.thumbnailUrl || project.imageUrl} onChange={(value) => updateProject(index, { thumbnailUrl: value, imageUrl: value })} hint="Recommended project thumbnail: 900x600. If empty, a clean auto color thumbnail appears." />
              <Field label="Tags (comma separated)" value={(project.tags ?? []).join(", ")} onChange={(value) => updateProject(index, { tags: value.split(",").map((item) => item.trim()).filter(Boolean) })} />
              <Field label="Description" value={project.description} textarea onChange={(value) => updateProject(index, { description: value })} />
              <Field label="Popup details" value={project.details} textarea onChange={(value) => updateProject(index, { details: value })} />
              <Field label="Review / comment" value={project.review} textarea onChange={(value) => updateProject(index, { review: value })} />
              <ToggleField label="Hide from public portal" checked={project.hidden} onChange={(value) => updateProject(index, { hidden: value })} />
            </Panel>
          ))}
        </EditorList>
      )}

      {active === "team" && (
        <EditorList
          title="Team members"
          onAdd={() =>
            setData((current) => ({
              ...current,
              team: [
                ...current.team,
                {
                  id: newId("team"),
                  name: "New Member",
                  role: "Expert",
                  bio: "Short profile bio.",
                  skills: [],
                  jobs: [],
                  socialLinks: {},
                },
              ],
            }))
          }
        >
          {data.team.map((member, index) => (
            <Panel
              key={member.id}
              title={member.name || `Member ${index + 1}`}
              onDelete={() =>
                setData((current) => ({
                  ...current,
                  team: current.team.filter((_, i) => i !== index),
                }))
              }
            >
              <SelectField
                label="Pick from backend"
                value=""
                options={backendMemberOptions}
                onChange={(value) => {
                  const picked = backendMembers.find((member) => member.id === value);
                  if (!picked) return;
                  updateMember(index, {
                    id: `user-${picked.id}`,
                    name: picked.name,
                    role: picked.role,
                    bio: picked.bio || "",
                    photoUrl: picked.photoUrl || "",
                    skills: picked.skills,
                    jobs: picked.role ? [picked.role] : [],
                  });
                }}
              />
              <Hint>
                Pick from backend to sync a real employee/admin profile into the
                public team card. You can still edit the text below.
              </Hint>
              <Field label="Name" value={member.name} onChange={(value) => updateMember(index, { name: value })} />
              <Field label="Role" value={member.role} onChange={(value) => updateMember(index, { role: value })} />
              <Field label="Bio" value={member.bio} textarea onChange={(value) => updateMember(index, { bio: value })} />
              <ImageField label="Photo" value={member.photoUrl} onChange={(value) => updateMember(index, { photoUrl: value })} hint="Recommended team photo: square image, 600x600 or larger." />
              <Field label="Skills (comma separated)" value={member.skills.join(", ")} onChange={(value) => updateMember(index, { skills: value.split(",").map((item) => item.trim()).filter(Boolean) })} />
              <Field label="Jobs & work (one per line)" value={member.jobs.join("\n")} textarea onChange={(value) => updateMember(index, { jobs: value.split("\n").map((item) => item.trim()).filter(Boolean) })} />
              <ToggleField label="Hide from public portal" checked={member.hidden} onChange={(value) => updateMember(index, { hidden: value })} />
              <Hint>Team auto-sync uses active employee/admin profiles when no custom team is saved.</Hint>
            </Panel>
          ))}
        </EditorList>
      )}

      {active === "reviews" && (
        <EditorList
          title="Verified reviews"
          onAdd={() =>
            setData((current) => ({
              ...current,
              reviews: [
                ...current.reviews,
                {
                  id: newId("review"),
                  clientName: "Client Name",
                  clientRole: "CEO",
                  company: "Company",
                  rating: 5,
                  quote: "Short review quote.",
                  details: "Long review details.",
                  service: "",
                  serviceCategory: "",
                },
              ],
            }))
          }
        >
          {data.reviews.map((review, index) => (
            <Panel
              key={review.id}
              title={review.clientName || `Review ${index + 1}`}
              onDelete={() =>
                setData((current) => ({
                  ...current,
                  reviews: current.reviews.filter((_, i) => i !== index),
                }))
              }
            >
              <Field label="Client name" value={review.clientName} onChange={(value) => updateReview(index, { clientName: value })} />
              <Field label="Role" value={review.clientRole} onChange={(value) => updateReview(index, { clientRole: value })} />
              <Field label="Company" value={review.company} onChange={(value) => updateReview(index, { company: value })} />
              <SelectField label="Service" value={review.service} options={serviceOptions} onChange={(value) => updateReview(index, { service: value })} />
              <SelectField label="Service category" value={review.serviceCategory} options={[{ label: "Select category", value: "" }, ...categoryOptions]} onChange={(value) => updateReview(index, { serviceCategory: value })} />
              <ImageField label="Client avatar" value={review.avatarUrl} onChange={(value) => updateReview(index, { avatarUrl: value })} hint="Optional. Square image works best." />
              <Field label="Rating" value={review.rating} onChange={(value) => updateReview(index, { rating: Number(value) || 5 })} />
              <Field label="Quote" value={review.quote} textarea onChange={(value) => updateReview(index, { quote: value })} />
              <Field label="Details" value={review.details} textarea onChange={(value) => updateReview(index, { details: value })} />
              <ToggleField label="Hide from public portal" checked={review.hidden} onChange={(value) => updateReview(index, { hidden: value })} />
              <Hint>Client reviews should stay hidden until admin verifies and saves them here.</Hint>
            </Panel>
          ))}
        </EditorList>
      )}

      {active === "seo" && (
        <Panel title="SEO / Google Search">
          <Field label="SEO title" value={data.seo.title} onChange={(value) => setData((current) => ({ ...current, seo: { ...current.seo, title: value } }))} />
          <Field label="Canonical site URL" value={data.seo.siteUrl} onChange={(value) => setData((current) => ({ ...current, seo: { ...current.seo, siteUrl: value } }))} />
          <Field label="Best phone" value={data.seo.phone} onChange={(value) => setData((current) => ({ ...current, seo: { ...current.seo, phone: value } }))} />
          <Field label="Best email" value={data.seo.email} onChange={(value) => setData((current) => ({ ...current, seo: { ...current.seo, email: value } }))} />
          <Field label="Business address" value={data.seo.address} onChange={(value) => setData((current) => ({ ...current, seo: { ...current.seo, address: value } }))} />
          <Field label="Target markets" value={data.seo.targetMarkets} textarea onChange={(value) => setData((current) => ({ ...current, seo: { ...current.seo, targetMarkets: value } }))} />
          <Field label="Meta description" value={data.seo.description} textarea onChange={(value) => setData((current) => ({ ...current, seo: { ...current.seo, description: value } }))} />
          <Field label="Keywords (comma separated)" value={data.seo.keywords} textarea onChange={(value) => setData((current) => ({ ...current, seo: { ...current.seo, keywords: value } }))} />
          <ImageField label="Social preview image / SEO image" value={data.seo.socialImageUrl} onChange={(value) => setData((current) => ({ ...current, seo: { ...current.seo, socialImageUrl: value } }))} hint="Recommended Open Graph image: 1200x630. This appears when the public portal link is shared." />
          <Field label="Important links / backlink notes" value={data.seo.importantLinks} textarea onChange={(value) => setData((current) => ({ ...current, seo: { ...current.seo, importantLinks: value } }))} />
          <Field label="Google Search Console verification code" value={data.seo.googleVerification} onChange={(value) => setData((current) => ({ ...current, seo: { ...current.seo, googleVerification: value } }))} />
          <ToggleField label="Allow Google indexing" checked={data.seo.allowIndexing} onChange={(value) => setData((current) => ({ ...current, seo: { ...current.seo, allowIndexing: value } }))} />
          <div className="rounded-lg border bg-muted/40 p-3 text-sm md:col-span-2">
            <p className="font-semibold">Google setup</p>
            <p className="mt-1 text-muted-foreground">
              Add only the code from Google meta verification. Sitemap and robots are available automatically after saving: /sitemap.xml and /robots.txt. Keep indexing on for production and off for test/private domains.
            </p>
          </div>
        </Panel>
      )}

      {active === "about" && (
        <Panel title="About section">
          <Field label="Eyebrow" value={data.about.eyebrow} onChange={(value) => setData((current) => ({ ...current, about: { ...current.about, eyebrow: value } }))} />
          <Field label="Title" value={data.about.title} onChange={(value) => setData((current) => ({ ...current, about: { ...current.about, title: value } }))} />
          <ImageField label="About image" value={data.about.imageUrl} onChange={(value) => setData((current) => ({ ...current, about: { ...current.about, imageUrl: value } }))} hint="Recommended about image: 1200x800." />
          <Field label="Description" value={data.about.description} textarea onChange={(value) => setData((current) => ({ ...current, about: { ...current.about, description: value } }))} />
          {data.about.points.slice(0, 4).map((point, index) => (
            <div key={index} className="grid gap-3 rounded-lg border p-3 md:col-span-2 md:grid-cols-2">
              <Field label={`Point ${index + 1} title`} value={point.title} onChange={(value) => setData((current) => ({ ...current, about: { ...current.about, points: current.about.points.map((item, itemIndex) => itemIndex === index ? { ...item, title: value } : item) } }))} />
              <Field label={`Point ${index + 1} text`} value={point.text} onChange={(value) => setData((current) => ({ ...current, about: { ...current.about, points: current.about.points.map((item, itemIndex) => itemIndex === index ? { ...item, text: value } : item) } }))} />
            </div>
          ))}
        </Panel>
      )}

      {active === "footer" && (
        <Panel title="Footer, privacy and terms">
          <Field label="Thanks text" value={data.footer.thanksText} onChange={(value) => setData((current) => ({ ...current, footer: { ...current.footer, thanksText: value } }))} />
          <Field label="Copyright" value={data.footer.copyright} onChange={(value) => setData((current) => ({ ...current, footer: { ...current.footer, copyright: value } }))} />
          <Field label="Privacy policy popup / long text" value={data.footer.privacyPolicy} textarea onChange={(value) => setData((current) => ({ ...current, footer: { ...current.footer, privacyPolicy: value } }))} />
          <Field label="Terms, conditions and refund policy / long text" value={data.footer.terms} textarea onChange={(value) => setData((current) => ({ ...current, footer: { ...current.footer, terms: value } }))} />
        </Panel>
      )}
    </main>
  );
}

function EditorList({
  title,
  children,
  onAdd,
}: {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
        )}
      </div>
      <div className="grid items-stretch gap-4 xl:grid-cols-2">{children}</div>
    </section>
  );
}
