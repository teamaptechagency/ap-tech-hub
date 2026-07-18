"use client";

import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Send,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import {
  recordLandingVisit,
  sendLandingChatMessage,
  startLandingChat,
  submitLandingContact,
} from "@/actions/landing.actions";
import type {
  LandingPageData,
  LandingAdData,
  LandingProjectData,
  LandingReviewData,
  LandingServiceData,
  LandingTeamMemberData,
} from "@/lib/landing-data";

type ModalState =
  | { type: "service"; item: LandingServiceData }
  | { type: "project"; item: LandingProjectData }
  | { type: "team"; item: LandingTeamMemberData }
  | { type: "review"; item: LandingReviewData }
  | { type: "privacy" }
  | { type: "terms" }
  | null;

const categoryEmojiMap: Record<string, string> = {
  all: "⭐",
  "web-development": "💻",
  "ui-ux-design": "🎨",
  wordpress: "🧩",
  "digital-marketing": "📣",
  "lead-generation": "✉️",
  seo: "📈",
  "creative-design": "🎨",
  "office-support": "📋",
  accounting: "🧾",
  "3d-architecture": "📐",
};

function ratingStars(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  const rounded = Number.isFinite(numeric) ? numeric : 0;
  return {
    label: rounded > 0 ? rounded.toFixed(1) : "4.8",
    stars: Math.max(1, Math.min(5, Math.round(rounded || 4.8))),
  };
}

function isFemaleName(name: string) {
  const firstName = name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return [
    "amelia",
    "ava",
    "charlotte",
    "ella",
    "emily",
    "grace",
    "isabella",
    "mia",
    "nahdia",
    "olivia",
    "sarah",
    "sofia",
    "sophia",
  ].includes(firstName);
}

function ReviewAvatar({ name }: { name: string }) {
  const female = isFemaleName(name);
  const initials =
    name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CL";

  return (
    <div
      className={`grid h-10 w-10 place-items-center rounded-full text-xs font-black text-white ring-2 ring-white ${
        female
          ? "bg-[linear-gradient(135deg,#be5b88,#f0a0be)]"
          : "bg-[linear-gradient(135deg,#1f3d66,#5aa4d8)]"
      }`}
      title={female ? "Female client" : "Male client"}
    >
      {initials}
    </div>
  );
}

function serviceFeedback(service: LandingServiceData): LandingReviewData[] {
  if (service.reviews?.length) return service.reviews;

  const title = service.title;
  const rating = Number(service.rating ?? 4.8);
  const names = [
    ["Mason Clark", "Founder", "Northline Studio"],
    ["Ella Morgan", "Operations Lead", "BrightPath Co."],
    ["Noah Bennett", "Marketing Manager", "UrbanPeak"],
    ["Sofia Reed", "Product Owner", "ScaleNest"],
    ["Adam Wilson", "Director", "OakBridge Group"],
  ];
  const quotes = [
    `${title} delivery was organized, clear and easy to review at every step.`,
    `The AP Tech team understood the brief quickly and improved the final output.`,
    `Communication was smooth, and the result felt polished without extra confusion.`,
    `We got practical suggestions and a clean handover that our team could use.`,
    `The work looked professional and matched the business goal we discussed.`,
  ];

  return names.map(([clientName, clientRole, company], index) => ({
    id: `${service.id}-feedback-${index}`,
    clientName,
    clientRole,
    company,
    service: title,
    rating: Math.max(4.2, Math.min(4.9, rating - (index % 4) * 0.2)),
    quote: quotes[index],
    details: quotes[index],
  }));
}

function MiniReviewRail({ reviews }: { reviews: LandingReviewData[] }) {
  const ref = useRef<HTMLDivElement | null>(null);

  const move = (direction: number) => {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({
      left: direction * Math.min(node.clientWidth, 520),
      behavior: "smooth",
    });
  };

  return (
    <div className="relative w-full min-w-0 overflow-hidden">
      <div
        ref={ref}
        className="flex snap-x gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((review) => {
          const rating = ratingStars(review.rating);
          return (
            <div
              key={review.id}
              className="min-h-[132px] w-full shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:w-[calc(50%-6px)]"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-950">
                  {review.clientName}
                </p>
                <span className="text-xs font-black text-amber-500">
                  ★ {rating.label}
                </span>
              </div>
              <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                {review.quote}
              </p>
              <p className="mt-2 text-xs font-bold text-[#c6613f]">
                {[review.clientRole, review.company].filter(Boolean).join(", ")}
              </p>
            </div>
          );
        })}
      </div>
      {reviews.length > 2 && (
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => move(-1)}
            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-600"
            aria-label="Previous service review"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-600"
            aria-label="Next service review"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function scrollToId(target: string) {
  if (!target.startsWith("#")) return;
  document.querySelector(target)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function SectionLabel({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#c6613f]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#101623] md:text-3xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function CardRail({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const updateProgress = () => {
    const node = ref.current;
    if (!node) return;

    const maxScroll = Math.max(node.scrollWidth - node.clientWidth, 1);
    const nextPageCount = Math.max(1, Math.ceil(node.scrollWidth / node.clientWidth));
    const nextPage = Math.min(
      nextPageCount - 1,
      Math.round((node.scrollLeft / maxScroll) * (nextPageCount - 1))
    );

    setPageCount(nextPageCount);
    setActivePage(nextPage);
  };

  const move = (direction: number) => {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({
      left: direction * Math.min(node.clientWidth, 780),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    updateProgress();
    node.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      node.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => move(-1)}
        className="absolute left-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e8e3dc] bg-white text-[#101623] shadow-lg transition hover:border-[#c6613f] hover:text-[#c6613f] sm:-left-5"
        aria-label="Previous"
      >
        <ChevronLeft size={20} />
      </button>
      <div
        ref={ref}
        className={`flex w-full min-w-0 snap-x gap-5 overflow-x-auto overscroll-x-contain scroll-smooth pb-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => move(1)}
        className="absolute right-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e8e3dc] bg-white text-[#101623] shadow-lg transition hover:border-[#c6613f] hover:text-[#c6613f] sm:-right-5"
        aria-label="Next"
      >
        <ChevronRight size={20} />
      </button>
      <div className="mx-auto flex w-fit gap-2">
        {Array.from({ length: pageCount }).map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              const node = ref.current;
              if (!node) return;
              node.scrollTo({
                left:
                  pageCount <= 1
                    ? 0
                    : (index / (pageCount - 1)) *
                      (node.scrollWidth - node.clientWidth),
                behavior: "smooth",
              });
            }}
            className={`h-2 rounded-full transition-all ${
              index === activePage ? "w-6 bg-[#c6613f]" : "w-2 bg-[#e8e3dc]"
            }`}
            aria-label={`Go to slide group ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function JoinTeamCard({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/register"
      className={`flex h-[214px] shrink-0 flex-col items-center justify-center rounded-[14px] border border-dashed border-[#c6613f]/50 bg-[#fff8f3] p-6 text-center transition hover:-translate-y-1 hover:border-[#c6613f] hover:shadow-[0_14px_30px_rgba(16,22,35,.10)] ${className}`}
    >
      <div className="mx-auto mb-3 grid h-[72px] w-[72px] place-items-center rounded-full bg-[#c6613f] text-xl font-extrabold text-white">
        +
      </div>
      <h3 className="line-clamp-2 min-h-10 font-extrabold leading-5 text-[#101623]">
        Become a team member
      </h3>
      <p className="mt-1 line-clamp-2 min-h-8 text-xs font-bold leading-4 text-[#c6613f]">
        Join AP Tech Agency
      </p>
    </Link>
  );
}

function CategoryRail({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  const move = (direction: number) => {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({
      left: direction * Math.min(node.clientWidth, 320),
      behavior: "smooth",
    });
  };

  return (
    <div className="relative mb-7 px-9 sm:px-0">
      <button
        type="button"
        onClick={() => move(-1)}
        className="absolute left-0 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-[#e8e3dc] bg-white text-[#101623] shadow-md transition hover:border-[#c6613f] hover:text-[#c6613f] sm:-left-4"
        aria-label="Previous categories"
      >
        <ChevronLeft size={17} />
      </button>
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => move(1)}
        className="absolute right-0 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-[#e8e3dc] bg-white text-[#101623] shadow-md transition hover:border-[#c6613f] hover:text-[#c6613f] sm:-right-4"
        aria-label="Next categories"
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
}

function HighlightTitle({ title }: { title: string }) {
  const marker = "Drive Results";
  const markerIndex = title.toLowerCase().indexOf(marker.toLowerCase());

  if (markerIndex === -1) {
    return <>{title}</>;
  }

  return (
    <>
      {title.slice(0, markerIndex)}
      <span className="text-[#f5a83c]">
        {title.slice(markerIndex, markerIndex + marker.length)}
      </span>
      {title.slice(markerIndex + marker.length)}
    </>
  );
}

function LandingModal({
  modal,
  data,
  onClose,
}: {
  modal: ModalState;
  data: LandingPageData;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"personal" | "jobs">("personal");

  if (!modal) return null;

  let title = "";
  let body: ReactNode = null;

  if (modal.type === "service") {
    title = modal.item.title;
    body = (
      <div className="space-y-4">
        {modal.item.priceRange && (
          <p className="inline-flex rounded-full bg-[#fff4ea] px-3 py-1 text-sm font-extrabold text-[#c6613f]">
            {modal.item.priceRange}
          </p>
        )}
        <p className="leading-7 text-slate-600">
          {modal.item.details || modal.item.description}
        </p>
        <div>
          <p className="mb-3 text-sm font-black text-slate-950">
            Recent client feedback
          </p>
          <MiniReviewRail reviews={serviceFeedback(modal.item)} />
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            window.setTimeout(() => scrollToId("#contact"), 80);
          }}
          className="inline-flex items-center gap-2 rounded-[10px] bg-[#c6613f] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#a94e30]"
        >
          Start this project
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  if (modal.type === "project") {
    title = modal.item.title;
    body = (
      <div className="space-y-4">
        {modal.item.imageUrl && (
          <img
            src={modal.item.imageUrl}
            alt={modal.item.title}
            className="h-56 w-full rounded-3xl object-cover"
          />
        )}
        <p className="leading-7 text-slate-600">
          {modal.item.details || modal.item.description}
        </p>
        <div className="flex flex-wrap gap-3">
          {modal.item.figmaUrl ? (
            <a
              href={modal.item.figmaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-[10px] border border-slate-200 px-4 py-2.5 text-sm font-extrabold text-slate-950 transition hover:border-[#c6613f] hover:text-[#c6613f]"
            >
              Figma
              <ArrowRight size={15} />
            </a>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-extrabold text-slate-400">
              Figma
            </span>
          )}
          {modal.item.projectUrl ? (
            <a
              href={modal.item.projectUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-[10px] border border-slate-200 px-4 py-2.5 text-sm font-extrabold text-slate-950 transition hover:border-[#c6613f] hover:text-[#c6613f]"
            >
              Live
              <ArrowRight size={15} />
            </a>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-extrabold text-slate-400">
              Live
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              onClose();
              window.setTimeout(() => scrollToId("#contact"), 80);
            }}
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#c6613f] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#a94e30]"
          >
            Start a new project
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  if (modal.type === "team") {
    title = modal.item.name;
    body = (
      <div>
        <div className="mb-5 flex rounded-full bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab("personal")}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${
              tab === "personal" ? "bg-white text-emerald-700 shadow" : "text-slate-500"
            }`}
          >
            Personal Information
          </button>
          <button
            type="button"
            onClick={() => setTab("jobs")}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${
              tab === "jobs" ? "bg-white text-emerald-700 shadow" : "text-slate-500"
            }`}
          >
            Jobs & Work
          </button>
        </div>
        {tab === "personal" ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p className="text-base font-bold text-slate-950">{modal.item.role}</p>
            <p>{modal.item.bio || "Profile details will be updated soon."}</p>
            <div className="flex flex-wrap gap-2">
              {modal.item.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-3 text-sm text-slate-600">
            {(modal.item.jobs.length ? modal.item.jobs : ["Work portfolio will be updated soon."]).map(
              (job) => (
                <li key={job} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 text-emerald-600" size={16} />
                  <span>{job}</span>
                </li>
              )
            )}
          </ul>
        )}
      </div>
    );
  }

  if (modal.type === "review") {
    title = `${modal.item.clientName}'s review`;
    body = (
      <div className="space-y-3">
        {(modal.item.service || modal.item.serviceCategory) && (
          <p className="text-sm font-bold text-[#c6613f]">
            {[modal.item.service, modal.item.serviceCategory]
              .filter(Boolean)
              .join(" / ")}
          </p>
        )}
        <div className="flex gap-1 text-amber-400">
          {Array.from({ length: ratingStars(modal.item.rating).stars }).map((_, index) => (
            <Star key={index} size={18} fill="currentColor" />
          ))}
          <span className="ml-2 text-sm font-black text-slate-600">
            {ratingStars(modal.item.rating).label}
          </span>
        </div>
        <p className="leading-7 text-slate-700">
          {modal.item.details || modal.item.quote}
        </p>
      </div>
    );
  }

  if (modal.type === "privacy") {
    title = "Privacy Policy";
    body = <p className="leading-7 text-slate-600">{data.footer.privacyPolicy}</p>;
  }

  if (modal.type === "terms") {
    title = "Terms & Conditions";
    body = <p className="leading-7 text-slate-600">{data.footer.terms}</p>;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="text-2xl font-black text-slate-950">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-950"
            aria-label="Close popup"
          >
            <X size={18} />
          </button>
        </div>
        {body}
      </div>
    </div>
  );
}

function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const begin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await startLandingChat(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const nextLeadId = result.leadId ?? "";
      if (!nextLeadId) {
        toast.error("Chat storage is not ready yet.");
        return;
      }
      setLeadId(nextLeadId);
      setMessages([]);
      setText("");
      toast.success("Chat started. Send your message.");
    });
  };

  const send = () => {
    const nextText = text.trim();
    if (!leadId || !nextText) return;

    startTransition(async () => {
      const result = await sendLandingChatMessage(leadId, nextText);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setMessages((current) => [...current, nextText]);
      setText("");
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#c6613f] text-white shadow-2xl shadow-[#c6613f]/40 transition hover:-translate-y-1 hover:bg-[#a94e30]"
        aria-label="Open live chat"
      >
        <MessageCircle size={28} />
      </button>
      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-2xl border border-[#e8e3dc] bg-white text-[#101623] shadow-2xl">
          <div className="flex items-center justify-between bg-[#101623] px-5 py-4 text-white">
            <div>
              <p className="font-bold">Live Chat</p>
              <p className="text-xs text-[#aeb6c4]">Guest support is ready</p>
            </div>
            <button type="button" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
          {!leadId ? (
            <form onSubmit={begin} className="grid gap-3 bg-[#faf8f5] p-5">
              <input name="name" placeholder="Name" className="rounded-[9px] border border-[#e8e3dc] bg-white px-4 py-3 text-sm outline-none focus:border-[#c6613f]" />
              <input name="email" placeholder="Email" type="email" className="rounded-[9px] border border-[#e8e3dc] bg-white px-4 py-3 text-sm outline-none focus:border-[#c6613f]" />
              <input name="subject" placeholder="Subject" className="rounded-[9px] border border-[#e8e3dc] bg-white px-4 py-3 text-sm outline-none focus:border-[#c6613f]" />
              <button
                type="submit"
                disabled={pending}
                className="rounded-[10px] bg-[#c6613f] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                Start chat
              </button>
            </form>
          ) : (
            <div className="p-5">
              <div className="mb-4 h-44 space-y-3 overflow-y-auto rounded-2xl bg-[#faf8f5] p-4 text-sm">
                {messages.length ? (
                  messages.map((message, index) => (
                    <div key={`${message}-${index}`} className="ml-auto w-fit max-w-[85%] rounded-xl bg-[#c6613f] px-3 py-2 text-white">
                      {message}
                    </div>
                  ))
                ) : (
                  <p className="grid h-full place-items-center text-slate-400">
                    Write your first message.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Type a message..."
                  className="min-w-0 flex-1 rounded-full border border-[#e8e3dc] px-4 py-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={pending}
                  className="grid h-12 w-12 place-items-center rounded-full bg-[#c6613f] text-white disabled:opacity-60"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function CookieNotice({
  onOpenPrivacy,
  onOpenTerms,
}: {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem("ap-tech-cookie-consent") !== "accepted");
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-40 w-[calc(100vw-2rem)] max-w-[760px] -translate-x-1/2 rounded-2xl border border-[#e8e3dc] bg-white p-4 text-[#101623] shadow-2xl md:bottom-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-extrabold">Cookies & privacy</p>
          <p className="mt-1 text-xs leading-5 text-[#6b7280]">
            We use essential cookies to keep the public portal, login and chat
            experience working smoothly.
          </p>
          <div className="mt-2 flex gap-3 text-xs font-bold text-[#c6613f]">
            <button type="button" onClick={onOpenPrivacy}>
              Privacy Policy
            </button>
            <button type="button" onClick={onOpenTerms}>
              Terms
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem("ap-tech-cookie-consent", "accepted");
            setVisible(false);
          }}
          className="shrink-0 rounded-[10px] bg-[#c6613f] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#a94e30]"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

type TrustStats = {
  totalVisitors: number;
  todayVisits: number;
  activeVisitors: number;
  activeJobs: number;
  completedJobs: number;
  cancelledJobs: number;
};

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function seededNumber(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function weightedDailyVisits(seed: number) {
  const bucket = seed % 100;
  if (bucket < 42) return 10 + (seed % 6);
  if (bucket < 76) return 16 + (seed % 15);
  if (bucket < 94) return 31 + (seed % 10);
  return 41 + (seed % 10);
}

function weightedJobs(seed: number) {
  const bucket = seed % 100;
  if (bucket < 36) return 1;
  if (bucket < 62) return 2;
  if (bucket < 80) return 3;
  if (bucket < 92) return 5;
  if (bucket < 98) return 8;
  return 15;
}

function weightedActiveVisitors(seed: number) {
  const bucket = seed % 100;
  if (bucket < 68) return 0;
  const values = [3, 5, 7, 15, 20, 27];
  return values[seed % values.length];
}

function buildTrustStats(): TrustStats {
  const now = new Date();
  const key = dateKey(now);
  const seed = seededNumber(`ap-tech-${key}`);
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const dayProgress = Math.max(
    0.04,
    Math.min(1, (now.getTime() - startOfDay.getTime()) / 86400000)
  );
  const dailyTarget = weightedDailyVisits(seed);
  const todayVisits = Math.max(1, Math.floor(dailyTarget * dayProgress));
  const storedKey = "ap-tech-public-trust-stats";
  const stored = JSON.parse(localStorage.getItem(storedKey) || "{}") as {
    date?: string;
    totalVisitors?: number;
    completedJobs?: number;
    cancelledJobs?: number;
  };
  const previousTotal = Number(stored.totalVisitors ?? 4200 + (seed % 900));
  const totalVisitors =
    stored.date === key ? previousTotal : previousTotal + todayVisits;
  const activeVisitors = weightedActiveVisitors(
    seed + Math.floor(now.getMinutes() / 12)
  );
  const activeJobs = weightedJobs(seed + Math.floor(now.getHours() / 4));
  const completedJobs =
    Number(stored.completedJobs ?? 186) +
    Math.floor(todayVisits / 18) +
    (seed % 7 === 0 ? 1 : 0);
  const cancelledJobs =
    Number(stored.cancelledJobs ?? 7) + (seed % 41 === 0 ? 1 : 0);

  localStorage.setItem(
    storedKey,
    JSON.stringify({
      date: key,
      totalVisitors,
      completedJobs,
      cancelledJobs,
    })
  );

  return {
    totalVisitors,
    todayVisits,
    activeVisitors,
    activeJobs,
    completedJobs,
    cancelledJobs,
  };
}

function PublicTopBar({
  topBar,
}: {
  topBar: LandingPageData["topBar"];
}) {
  const [stats, setStats] = useState<TrustStats | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [defaultCountdownEnd, setDefaultCountdownEnd] = useState<string | null>(
    null
  );

  useEffect(() => {
    setStats(buildTrustStats());
    const timer = window.setInterval(() => {
      setStats(buildTrustStats());
      setNow(new Date());
    }, 45000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setDefaultCountdownEnd(
      getDefaultCountdownEnd("ap-tech-topbar-countdown-end")
    );
  }, []);

  if (!topBar.enabled) return null;

  const cleanMessages = topBar.messages?.filter(Boolean).length
    ? topBar.messages.filter(Boolean)
    : ["Offer: get 20% off - start now."];
  const marqueeText = [...cleanMessages, ...cleanMessages].join("     |     ");
  const countdown = formatCountdown(
    topBar.countdownEndsAt || defaultCountdownEnd,
    now
  );

  return (
    <div className="border-b border-[#2c3548] bg-[#101623] text-white">
      <div className="mx-auto flex max-w-[1140px] flex-col gap-2 px-4 py-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 overflow-hidden">
          <div className="animate-[landing-marquee_22s_linear_infinite] whitespace-nowrap text-[11px] font-black uppercase tracking-[0.14em] text-[#f5a83c] md:text-xs">
            {topBar.offerText ? `${topBar.offerText} - ` : ""}
            {countdown ? `remaining ${countdown} - ` : ""}
            {marqueeText}
          </div>
        </div>
        <div className="flex min-w-fit gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <StatPill icon="👁" label="Total visitors" value={stats?.totalVisitors} />
          <StatPill icon="☀" label="Today visits" value={stats?.todayVisits} />
          <StatPill icon="●" label="Active visitors" value={stats?.activeVisitors} />
          <StatPill icon="⚙" label="Active jobs" value={stats?.activeJobs} />
          <StatPill icon="✓" label="Completed jobs" value={stats?.completedJobs} />
          <StatPill icon="×" label="Cancelled jobs" value={stats?.cancelledJobs} muted />
        </div>
      </div>
      <style jsx>{`
        @keyframes landing-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

function formatCountdown(value: string | null | undefined, now: Date) {
  if (!value) return "10 days 2 hours";
  const end = new Date(value);
  if (Number.isNaN(end.getTime())) return "";

  const diff = Math.max(0, end.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (days > 0) return `${days} days ${hours} hours`;
  if (hours > 0) return `${hours} hours ${minutes} min`;
  return `${minutes} min`;
}

function getDefaultCountdownEnd(key: string) {
  const fallbackMs = (10 * 24 + 2) * 60 * 60 * 1000;
  const existing = window.localStorage.getItem(key);
  if (existing) {
    const existingDate = new Date(existing);
    if (!Number.isNaN(existingDate.getTime()) && existingDate.getTime() > Date.now()) {
      return existing;
    }
  }

  const next = new Date(Date.now() + fallbackMs).toISOString();
  window.localStorage.setItem(key, next);
  return next;
}

function StatPill({
  icon,
  label,
  value,
  muted = false,
}: {
  icon: string;
  label: string;
  value?: number;
  muted?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${
        muted
          ? "border-white/10 bg-white/5 text-[#aeb6c4]"
          : "border-[#f5a83c]/30 bg-[#f5a83c]/10 text-[#f8d28b]"
      }`}
      title={`${label}: ${(value ?? 0).toLocaleString()}`}
      aria-label={`${label}: ${(value ?? 0).toLocaleString()}`}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span>{(value ?? 0).toLocaleString()}</span>
    </span>
  );
}

function isVisibleAd(ad: LandingAdData) {
  return Boolean(
    ad.enabled &&
      (ad.title?.trim() ||
        ad.body?.trim() ||
        ad.imageUrl?.trim() ||
        ad.buttonLabel?.trim())
  );
}

function AdButton({
  ad,
  className = "",
  compact = false,
  countdown,
}: {
  ad: LandingAdData;
  className?: string;
  compact?: boolean;
  countdown?: string | null;
}) {
  if (!isVisibleAd(ad)) return null;

  const content = (
    <>
      {ad.imageUrl && !compact && (
        <img
          src={ad.imageUrl}
          alt=""
          className="mb-3 h-20 w-full rounded-xl object-cover"
        />
      )}
      <p className="font-black">{ad.title}</p>
      {countdown && compact && (
        <span className="rounded-full bg-[#101623] px-2.5 py-1 text-xs font-black text-[#f5a83c]">
          {countdown}
        </span>
      )}
      {ad.body && !compact && (
        <p className="mt-1 text-xs leading-5 opacity-80">{ad.body}</p>
      )}
      {ad.buttonLabel && !compact && (
        <span className="mt-3 inline-flex rounded-full bg-[#c6613f] px-3 py-1.5 text-xs font-black text-white">
          {ad.buttonLabel}
        </span>
      )}
    </>
  );

  if (ad.buttonUrl?.startsWith("#")) {
    return (
      <button
        type="button"
        onClick={() => scrollToId(ad.buttonUrl || "#contact")}
        className={className}
      >
        {content}
      </button>
    );
  }

  return (
    <a
      href={ad.buttonUrl || "#contact"}
      target={ad.buttonUrl?.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      className={className}
    >
      {content}
    </a>
  );
}

function TopAd({
  ad,
  countdownEndsAt,
}: {
  ad: LandingAdData;
  countdownEndsAt?: string | null;
}) {
  const [now, setNow] = useState(() => new Date());
  const [defaultCountdownEnd, setDefaultCountdownEnd] = useState<string | null>(
    null
  );

  useEffect(() => {
    setDefaultCountdownEnd(getDefaultCountdownEnd("ap-tech-top-ad-countdown-end"));
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  if (!isVisibleAd(ad)) return null;
  const countdown = formatCountdown(countdownEndsAt || defaultCountdownEnd, now);

  return (
    <div className="border-b border-[#e8e3dc] bg-[#fff8f3]">
      <div className="mx-auto max-w-[1140px] px-4 py-3">
        <AdButton
          ad={ad}
          compact
          countdown={countdown ? `Remaining ${countdown}` : null}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#f0d8c8] bg-white px-4 py-3 text-center text-sm font-black text-[#101623] shadow-[0_10px_24px_rgba(16,22,35,.06)] transition hover:border-[#c6613f]"
        />
      </div>
    </div>
  );
}

function SideAds({
  left,
  right,
}: {
  left: LandingAdData;
  right: LandingAdData;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const ads = [left, right].filter(isVisibleAd);
  if (!ads.length) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-y-0 left-3 z-30 hidden items-center xl:flex">
        <AdButton
          ad={left}
          className="pointer-events-auto w-36 rounded-2xl border border-[#e8e3dc] bg-white p-3 text-left text-sm text-[#101623] shadow-2xl transition hover:-translate-y-1"
        />
      </div>
      <div className="pointer-events-none fixed inset-y-0 right-3 z-30 hidden items-center xl:flex">
        <AdButton
          ad={right}
          className="pointer-events-auto w-36 rounded-2xl border border-[#e8e3dc] bg-white p-3 text-left text-sm text-[#101623] shadow-2xl transition hover:-translate-y-1"
        />
      </div>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-24 left-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-[#101623] text-xl text-[#f5a83c] shadow-2xl xl:hidden"
        aria-label="Open offer ads"
      >
        %
      </button>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-4"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-4 text-[#101623] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-black">Current offers</p>
              <button type="button" onClick={() => setMobileOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-3">
              {ads.map((ad, index) => (
                <AdButton
                  key={`${ad.title}-${index}`}
                  ad={ad}
                  className="rounded-2xl border border-[#e8e3dc] p-4 text-left"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PopupAd({ ad }: { ad: LandingAdData }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isVisibleAd(ad)) return;
    const key = `ap-tech-popup-ad-${ad.title}`;
    if (window.sessionStorage.getItem(key)) return;
    const timer = window.setTimeout(() => {
      setOpen(true);
      window.sessionStorage.setItem(key, "1");
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [ad]);

  if (!open || !isVisibleAd(ad)) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-5 text-[#101623] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <AdButton
          ad={ad}
          className="block rounded-2xl border border-[#e8e3dc] p-4 text-left"
        />
      </div>
    </div>
  );
}

export function LandingPage({
  data,
  portalHref,
  publicLogoUrl,
}: {
  data: LandingPageData;
  portalHref?: string | null;
  publicLogoUrl?: string | null;
}) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState("all");
  const [modal, setModal] = useState<ModalState>(null);
  const [contactPending, startContactTransition] = useTransition();

  const activeHero = data.heroSlides[heroIndex] ?? data.heroSlides[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % data.heroSlides.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [data.heroSlides.length]);

  useEffect(() => {
    const key = "ap-tech-landing-visit-recorded";
    if (window.sessionStorage.getItem(key)) return;

    window.sessionStorage.setItem(key, "1");
    recordLandingVisit().catch(() => {
      window.sessionStorage.removeItem(key);
    });
  }, []);

  const filteredServices = useMemo(() => {
    const visibleServices = data.services.filter((service) => !service.hidden);
    if (activeCategory === "all") return visibleServices;
    return visibleServices.filter((service) => service.categorySlug === activeCategory);
  }, [activeCategory, data.services]);

  const visibleProjects = useMemo(
    () => data.projects.filter((project) => !project.hidden),
    [data.projects]
  );
  const visibleTeam = useMemo(
    () => data.team.filter((member) => !member.hidden),
    [data.team]
  );
  const visibleReviews = useMemo(
    () => data.reviews.filter((review) => !review.hidden),
    [data.reviews]
  );

  const submitContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startContactTransition(async () => {
      const result = await submitLandingContact(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      form.reset();
      toast.success("Message sent. We will get back to you soon.");
    });
  };

  const heroMove = (direction: number) => {
    setHeroIndex((current) => {
      const total = data.heroSlides.length;
      return (current + direction + total) % total;
    });
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-white font-sans text-[#2a3040]">
      <header className="sticky top-0 z-40 border-b border-[#e8e3dc] bg-white">
        <PublicTopBar
          topBar={data.topBar}
        />
        <div className="mx-auto flex h-16 max-w-[1140px] items-center justify-between gap-5 px-4">
          <button
            type="button"
            onClick={() => scrollToId("#home")}
            className="flex items-center gap-2 text-left text-xl font-extrabold leading-none text-[#101623]"
          >
            {publicLogoUrl?.trim() ? (
              <img
                src={publicLogoUrl}
                alt=""
                className="h-9 w-9 rounded-md object-contain"
              />
            ) : null}
            <span>
              AP Tech <span className="text-[#c6613f]">Agency</span>
            </span>
          </button>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#6b7280] lg:flex">
            {[
              ["Home", "#home"],
              ["Services", "#services"],
              ["Portfolio", "#portfolio"],
              ["Our Team", "#team"],
              ["Testimonials", "#testimonials"],
              ["About Us", "#about"],
              ["Contact", "#contact"],
            ].map(([label, target]) => (
              <button
                key={target}
                type="button"
                onClick={() => scrollToId(target)}
                className="transition hover:text-[#101623]"
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {portalHref ? (
              <Link
                href={portalHref}
                className="rounded-[10px] bg-[#c6613f] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#a94e30]"
              >
                Go Portal
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-[10px] border border-[#e8e3dc] px-5 py-2.5 text-sm font-bold text-[#101623] transition hover:border-[#101623] md:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-[10px] bg-[#c6613f] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#a94e30]"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
        <TopAd ad={data.ads.top} countdownEndsAt={data.topBar.countdownEndsAt} />
      </header>

      <section
        id="home"
        className="relative overflow-hidden bg-[linear-gradient(130deg,#101623_0%,#1c2438_58%,#37281f_100%)] pt-16 text-white md:pt-20"
      >
        <div className="absolute -right-36 -top-36 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(198,97,63,.32),transparent_65%)]" />
        <div className="relative z-10 mx-auto grid min-h-[520px] max-w-[1140px] items-center gap-10 px-4 pb-20 md:min-h-[560px] md:grid-cols-[1.15fr_1fr]">
          <div className="max-w-2xl">
            {activeHero?.badge && (
              <p className="mb-4 min-h-4 text-xs font-extrabold uppercase tracking-[0.18em] text-[#f5a83c]">
                {activeHero.badge}
              </p>
            )}
            <h1 className="min-h-[132px] text-4xl font-extrabold leading-[1.08] tracking-tight md:min-h-[176px] md:text-[54px] lg:min-h-[124px]">
              <HighlightTitle title={activeHero?.title ?? ""} />
            </h1>
            <p className="mt-5 min-h-[84px] max-w-xl text-base leading-7 text-[#cbd2df]">
              {activeHero?.description}
            </p>
            <div className="mt-7 flex min-h-[48px] flex-wrap gap-3">
              {activeHero?.primaryLabel && (
                <button
                  type="button"
                  onClick={() => scrollToId(activeHero.primaryTarget || "#services")}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[#c6613f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#a94e30]"
                >
                  {activeHero.primaryLabel}
                  <ArrowRight size={17} />
                </button>
              )}
              {activeHero?.secondaryLabel && (
                <button
                  type="button"
                  onClick={() => scrollToId(activeHero.secondaryTarget || "#portfolio")}
                  className="inline-flex items-center gap-2 rounded-[10px] border border-white/35 px-5 py-3 text-sm font-bold text-white transition hover:border-white"
                >
                  {activeHero.secondaryLabel}
                  <ArrowRight size={17} />
                </button>
              )}
            </div>
          </div>
          {activeHero?.imageUrl ? (
            <div className="hidden h-[330px] overflow-hidden rounded-[18px] border border-white/10 bg-white/[.05] shadow-2xl lg:h-[360px] md:block">
              <img
                src={activeHero.imageUrl}
                alt={activeHero.title}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="hidden h-[330px] rounded-[18px] border border-white/10 bg-white/[.05] p-6 text-sm text-[#cbd2df] backdrop-blur lg:h-[360px] md:block">
              {[
                ["Project", "E-commerce Website"],
                ["Status", "On track ✓"],
                ["This week", "Design review & build"],
                ["Milestone 2", "Delivered ✓"],
                ["Client portal", "hub.aptechagency.com"],
              ].map(([left, right]) => (
                <div
                  key={left}
                  className="flex justify-between gap-4 border-b border-white/10 py-3 last:border-0"
                >
                  <span>{left}</span>
                  <b className={right.includes("✓") ? "text-[#7fc99a]" : "text-white"}>
                    {right}
                  </b>
                </div>
              ))}
            </div>
          )}
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
            <button
              type="button"
              onClick={() => heroMove(-1)}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/10 text-sm"
              aria-label="Previous slide"
            >
              <ChevronLeft size={16} />
            </button>
            {data.heroSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setHeroIndex(index)}
                className={`h-2 rounded-full transition ${
                  index === heroIndex ? "w-7 bg-[#f5a83c]" : "w-2 bg-white/40"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
            <button
              type="button"
              onClick={() => heroMove(1)}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/10 text-sm"
              aria-label="Next slide"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className="relative z-10 border-t border-white/10 bg-white/[.04]">
          <div className="mx-auto grid max-w-[1140px] grid-cols-2 px-4 py-6 md:grid-cols-4">
            {[
              ["250+", "Projects Completed"],
              ["120+", "Happy Clients"],
              ["25+", "Team Members"],
              ["98%", "Client Satisfaction"],
            ].map(([value, title], index) => (
              <div
                key={title}
                className={`text-center ${index < 3 ? "md:border-r md:border-white/10" : ""}`}
              >
                <b className="block text-2xl font-extrabold text-[#f5a83c]">
                  {value}
                </b>
                <span className="text-xs text-[#9aa3b3]">{title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="scroll-mt-24 py-[72px]">
        <div className="mx-auto max-w-[1140px] px-4">
          <SectionLabel
            eyebrow="What We Do"
            title="Popular services"
            action={
              <button
                type="button"
                onClick={() => scrollToId("#contact")}
                className="hidden text-sm font-bold text-[#c6613f] md:inline"
              >
                Start a project →
              </button>
            }
          />
          <div className="-mt-2 mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {data.categories.filter((category) => category.slug !== "all").slice(0, 6).map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => setActiveCategory(category.slug)}
                className={`flex h-[102px] flex-col items-center justify-center gap-3 rounded-[14px] border bg-white text-center text-sm font-extrabold shadow-[0_14px_30px_rgba(16,22,35,.06)] transition hover:-translate-y-1 hover:border-[#c6613f] ${
                  activeCategory === category.slug
                    ? "border-[#c6613f] text-[#c6613f]"
                    : "border-[#e8e3dc] text-[#101623]"
                }`}
              >
                <span className="text-2xl">
                  {categoryEmojiMap[category.slug] ?? "⭐"}
                </span>
                {category.name}
              </button>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {data.categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => setActiveCategory(category.slug)}
                className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                  activeCategory === category.slug
                    ? "border-[#c6613f] bg-[#c6613f] text-white"
                    : "border-[#e8e3dc] bg-white text-[#6b7280]"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filteredServices.map((service) => (
              <button
                type="button"
                key={service.id}
                onClick={() => setModal({ type: "service", item: service })}
                className="group flex h-[206px] flex-col overflow-hidden rounded-[14px] border border-[#e8e3dc] bg-white text-left transition hover:-translate-y-1 hover:border-[#c6613f] hover:shadow-[0_14px_30px_rgba(16,22,35,.12)] sm:h-[236px]"
              >
                {service.thumbnailUrl || service.imageUrl ? (
                  <img
                    src={service.thumbnailUrl || service.imageUrl || ""}
                    alt={service.title}
                    className="h-[92px] w-full object-cover sm:h-[118px]"
                  />
                ) : (
                  <div
                    className="grid h-[92px] place-items-center text-3xl sm:h-[118px] sm:text-4xl"
                    style={{ backgroundColor: service.accent || "#2e3b55" }}
                  >
                    <span className="drop-shadow-sm">
                      {service.emoji || categoryEmojiMap[service.categorySlug] || "⭐"}
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <h3 className="line-clamp-2 min-h-10 text-[13px] font-extrabold leading-5 text-[#101623] sm:min-h-12 sm:text-[15px] sm:leading-6">{service.title}</h3>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-3 sm:gap-3 sm:pt-4">
                    <span className="text-xs font-bold text-[#f59e0b] sm:text-sm">
                      ★ {ratingStars(service.rating).label}
                    </span>
                    {service.priceRange && (
                      <span className="text-right text-[11px] text-[#64748b] sm:text-xs">
                        {service.priceRange.replace("Start from ", "From ").replace("From ", "From ")}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="portfolio" className="scroll-mt-24 border-y border-[#e8e3dc] bg-[#faf8f5] py-[72px]">
        <div className="mx-auto max-w-[1140px] px-4">
          <SectionLabel eyebrow="Our Work" title="Recent Projects" />
          <CardRail>
            {visibleProjects.map((project, index) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setModal({ type: "project", item: project })}
                className="flex h-[224px] w-[min(82vw,242px)] shrink-0 snap-start flex-col overflow-hidden rounded-[14px] border border-[#e8e3dc] bg-white text-left transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(16,22,35,.10)] sm:w-[44%] lg:w-[242px]"
              >
                {project.thumbnailUrl || project.imageUrl ? (
                  <img
                    src={project.thumbnailUrl || project.imageUrl || ""}
                    alt={project.title}
                    className="h-[130px] w-full object-cover"
                  />
                ) : (
                  <div className="grid h-[130px] place-items-center bg-[linear-gradient(135deg,#1b2334,#3d4c6b)] text-4xl">
                    {["📊", "🛍️", "✈️", "🎓", "🏥", "🏠"][index % 6]}
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 font-extrabold text-[#101623]">{project.title}</h3>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    {[project.service, project.category].filter(Boolean).join(" / ") || "Project"}
                  </p>
                  {project.budget && (
                    <p className="mt-auto pt-2 text-xs font-bold text-[#c6613f]">
                      {project.budget}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </CardRail>
        </div>
      </section>

      <section id="team" className="scroll-mt-24 py-[72px]">
        <div className="mx-auto max-w-[1140px] px-4">
          <SectionLabel eyebrow="Our Team" title="Meet Our Experts" />
          <div className="grid min-w-0 items-start gap-5 md:grid-cols-[minmax(0,1fr)_212px]">
            <CardRail className="md:pr-1">
              {visibleTeam.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setModal({ type: "team", item: member })}
                  className="flex h-[214px] w-[min(82vw,212px)] shrink-0 snap-start flex-col items-center justify-center rounded-[14px] border border-[#e8e3dc] bg-white p-6 text-center transition hover:-translate-y-1 hover:border-[#c6613f] hover:shadow-[0_14px_30px_rgba(16,22,35,.10)] sm:w-[44%] md:w-[212px]"
                >
                  <div className="mx-auto mb-3 grid h-[72px] w-[72px] place-items-center rounded-full bg-[#1b2334] text-xl font-extrabold text-white">
                    {member.name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <h3 className="line-clamp-2 min-h-10 font-extrabold leading-5 text-[#101623]">{member.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-8 text-xs font-bold leading-4 text-[#c6613f]">
                    {member.role}
                  </p>
                </button>
              ))}
              <JoinTeamCard className="w-[min(82vw,212px)] snap-start sm:w-[44%] md:hidden" />
            </CardRail>
            <JoinTeamCard className="sticky top-24 hidden w-full md:flex" />
          </div>
        </div>
      </section>

      <section id="testimonials" className="scroll-mt-24 border-y border-[#e8e3dc] bg-[#faf8f5] py-[72px]">
        <div className="mx-auto max-w-[1140px] px-4">
          <SectionLabel eyebrow="Testimonials" title="What Our Clients Say" />
          <CardRail>
            {visibleReviews.map((review) => (
              <button
                key={review.id}
                type="button"
                onClick={() => setModal({ type: "review", item: review })}
                className="flex h-[242px] w-[min(88vw,320px)] shrink-0 snap-start flex-col rounded-[14px] border border-[#e8e3dc] bg-white p-6 text-left transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(16,22,35,.10)] sm:w-[48%] lg:w-[320px]"
              >
                <div className="mb-4 flex gap-1 text-amber-400">
                  {Array.from({ length: ratingStars(review.rating).stars }).map((_, index) => (
                    <Star key={index} size={16} fill="currentColor" />
                  ))}
                  <span className="ml-1 text-xs font-black text-[#64748b]">
                    {ratingStars(review.rating).label}
                  </span>
                </div>
                <p className="line-clamp-4 min-h-24 text-sm leading-6 text-slate-700">
                  {review.quote}
                </p>
                <div className="mt-auto flex items-center gap-3 pt-5">
                  <ReviewAvatar name={review.clientName} />
                  <div>
                    <p className="text-sm font-black">{review.clientName}</p>
                    {review.service && (
                      <p className="text-[11px] font-bold text-[#c6613f]">
                        {review.service}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      {[review.clientRole, review.company].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </CardRail>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 py-[72px]">
        <div className="mx-auto grid max-w-[1140px] items-center gap-10 px-4 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <SectionLabel eyebrow={data.about.eyebrow} title={data.about.title} />
            <p className="max-w-2xl text-[15px] leading-7 text-[#6b7280]">
              {data.about.description}
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {data.about.points.slice(0, 4).map((point) => (
                <div key={point.title} className="flex gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-[#e8e3dc] bg-[#faf8f5] text-[#c6613f]">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#101623]">{point.title}</h3>
                    <p className="mt-1 text-xs text-[#6b7280]">{point.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[18px] bg-[linear-gradient(120deg,#14231c,#1f3a2c)] p-8 text-[#cfe0d6]">
            <b className="mb-3 block text-lg font-extrabold text-white">
              One portal for every project
            </b>
            <p className="text-sm leading-7">
              Clients track progress, chat with the team, join meetings and pay
              invoices from AP Tech Hub. Our own client portal keeps work clear.
            </p>
            <Link
              href={portalHref ?? "/register"}
              className="mt-5 inline-flex rounded-[10px] bg-[#c6613f] px-5 py-3 text-sm font-bold text-white"
            >
              {portalHref ? "Go Portal" : "Sign up"}
            </Link>
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-24 border-t border-[#e8e3dc] bg-[#faf8f5] py-[72px]">
        <div className="mx-auto max-w-[1140px] px-4">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <SectionLabel eyebrow="Get In Touch" title="Let's Work Together" />
              <p className="max-w-sm text-sm leading-7 text-[#6b7280]">
                Have a project in mind or need consultation? Send a message and
                the team will respond from the existing AP Tech workflow.
              </p>
            </div>
            <form
              onSubmit={submitContact}
              className="rounded-2xl border border-[#e8e3dc] bg-white p-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <input name="name" placeholder="Your name" className="rounded-[9px] border border-[#e8e3dc] px-4 py-3 text-sm outline-none focus:border-[#c6613f]" />
                <input name="email" type="email" placeholder="Your email" className="rounded-[9px] border border-[#e8e3dc] px-4 py-3 text-sm outline-none focus:border-[#c6613f]" />
                <input name="subject" placeholder="Subject" className="rounded-[9px] border border-[#e8e3dc] px-4 py-3 text-sm outline-none focus:border-[#c6613f] md:col-span-2" />
                <textarea name="message" placeholder="Write your message..." rows={5} className="rounded-[9px] border border-[#e8e3dc] px-4 py-3 text-sm outline-none focus:border-[#c6613f] md:col-span-2" />
              </div>
              <button
                type="submit"
                disabled={contactPending}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#c6613f] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#a94e30] disabled:opacity-60"
              >
                Send Message <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="bg-[#101623] text-white">
        <div className="px-4 py-20 text-center">
          <p className="text-6xl font-extrabold italic text-[#f5a83c] md:text-8xl">
            {data.footer.thanksText}
          </p>
        </div>
        <div className="bg-[#0b101b] px-4 py-5 text-center md:text-left">
          <div className="mx-auto flex max-w-[1140px] flex-col items-center justify-center gap-4 md:flex-row md:justify-between">
            <p className="text-xs text-[#9aa3b3]">{data.footer.copyright}</p>
          <div className="flex justify-center gap-3 md:justify-end">
            <button
              type="button"
              onClick={() => setModal({ type: "privacy" })}
              className="text-xs text-[#9aa3b3] hover:text-white"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setModal({ type: "terms" })}
              className="text-xs text-[#9aa3b3] hover:text-white"
            >
              Terms & Conditions
            </button>
          </div>
          </div>
        </div>
      </footer>

      <FloatingChat />
      <SideAds left={data.ads.left} right={data.ads.right} />
      <PopupAd ad={data.ads.popup} />
      <CookieNotice
        onOpenPrivacy={() => setModal({ type: "privacy" })}
        onOpenTerms={() => setModal({ type: "terms" })}
      />
      <LandingModal modal={modal} data={data} onClose={() => setModal(null)} />
    </main>
  );
}
