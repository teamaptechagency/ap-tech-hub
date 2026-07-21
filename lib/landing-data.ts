import { prisma } from "@/lib/prisma";

export type LandingHeroSlideData = {
  id: string;
  badge?: string | null;
  title: string;
  description: string;
  imageUrl?: string | null;
  primaryLabel?: string | null;
  primaryTarget?: string | null;
  secondaryLabel?: string | null;
  secondaryTarget?: string | null;
};

export type LandingCategoryData = {
  id: string;
  name: string;
  slug: string;
};

export type LandingServiceData = {
  id: string;
  categorySlug: string;
  title: string;
  description: string;
  priceRange?: string | null;
  rating?: string | null;
  accent?: string | null;
  emoji?: string | null;
  details?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  tags?: string[] | null;
  reviews?: LandingReviewData[] | null;
  hidden?: boolean | null;
};

export type LandingProjectData = {
  id: string;
  title: string;
  category?: string | null;
  service?: string | null;
  description: string;
  details?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  projectUrl?: string | null;
  figmaUrl?: string | null;
  budget?: string | null;
  review?: string | null;
  tags?: string[] | null;
  hidden?: boolean | null;
};

export type LandingTeamMemberData = {
  id: string;
  name: string;
  role: string;
  bio?: string | null;
  photoUrl?: string | null;
  skills: string[];
  jobs: string[];
  socialLinks: Record<string, string>;
  hidden?: boolean | null;
};

export type LandingReviewData = {
  id: string;
  clientName: string;
  clientRole?: string | null;
  company?: string | null;
  service?: string | null;
  serviceCategory?: string | null;
  country?: string | null;
  orderNumber?: number | null;
  avatarUrl?: string | null;
  rating: number;
  quote: string;
  details?: string | null;
  hidden?: boolean | null;
};

export type LandingPageData = {
  topBar: {
    enabled: boolean;
    offerText: string;
    countdownEndsAt?: string | null;
    messages: string[];
  };
  ads: {
    popup: LandingAdData;
    top: LandingAdData;
    left: LandingAdData;
    right: LandingAdData;
  };
  heroSlides: LandingHeroSlideData[];
  categories: LandingCategoryData[];
  services: LandingServiceData[];
  projects: LandingProjectData[];
  team: LandingTeamMemberData[];
  reviews: LandingReviewData[];
  seo: {
    title: string;
    description: string;
    keywords: string;
    siteUrl: string;
    targetMarkets: string;
    phone: string;
    email: string;
    address: string;
    socialImageUrl: string;
    importantLinks: string;
    googleVerification: string;
    allowIndexing: boolean;
  };
  about: {
    eyebrow: string;
    title: string;
    description: string;
    imageUrl: string;
    points: { title: string; text: string }[];
  };
  contact: {
    languageNoteEnabled: boolean;
    languageNote: string;
  };
  footer: {
    copyright: string;
    thanksText: string;
    privacyPolicy: string;
    terms: string;
  };
};

export type LandingAdData = {
  enabled: boolean;
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  desktopOnly?: boolean | null;
};

const image = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;

export const defaultLandingData: LandingPageData = {
  topBar: {
    enabled: true,
    offerText: "Get 20% Off",
    countdownEndsAt: "",
    messages: [
      "Popular service offer: 20% off WordPress website, UI/UX, SEO and branding projects.",
      "Start a website, landing page or Next.js app this week with free planning support.",
      "Need growth? Lead generation, outreach, social media and SEO campaign slots are open.",
      "Design support available for Figma UI/UX, logo, branding and campaign graphics.",
      "Architecture service slots open for interior, exterior and 3D modeling projects.",
      "Business support available for accounting, office freelancing and document cleanup.",
      "Website maintenance, bug fixing, speed optimization and monthly support are available.",
      "New client offer: free project planning session with selected web and UI/UX orders.",
      "Trusted remote team for websites, branding, SEO, 3D modeling and office support.",
    ],
  },
  ads: {
    popup: {
      enabled: false,
      title: "Get 20% Off",
      body: "Start your website, UI/UX, SEO, branding or 3D modeling project before this offer ends.",
      buttonLabel: "Start now",
      buttonUrl: "#contact",
    },
    top: {
      enabled: false,
      title: "Popular service offer",
      body: "20% off selected website, design, SEO, lead generation and 3D modeling services.",
      buttonLabel: "Start now",
      buttonUrl: "#contact",
    },
    left: {
      enabled: false,
      title: "Need a website?",
      body: "WordPress, Elementor, Next.js and Laravel project support.",
      buttonLabel: "Contact",
      buttonUrl: "#contact",
      desktopOnly: true,
    },
    right: {
      enabled: false,
      title: "Need growth?",
      body: "SEO, lead generation, outreach and social media support.",
      buttonLabel: "Start",
      buttonUrl: "#contact",
      desktopOnly: true,
    },
  },
  heroSlides: [
    {
      id: "hero-1",
      badge: "We Build Digital Success",
      title: "Creative Solutions That Drive Results",
      description:
        "We help businesses grow with smart digital solutions, modern technologies and a results-driven approach.",
      imageUrl: image("photo-1556761175-b413da4baf72"),
      primaryLabel: "Our Services",
      primaryTarget: "#services",
      secondaryLabel: "View Portfolio",
      secondaryTarget: "#portfolio",
    },
    {
      id: "hero-web",
      badge: "Web Development",
      title: "Launch Fast Websites That Bring Real Leads",
      description:
        "WordPress, Elementor, Next.js and Laravel websites built for speed, trust and conversion.",
      imageUrl: image("photo-1460925895917-afdab827c52f"),
      primaryLabel: "Start Web Project",
      primaryTarget: "#contact",
      secondaryLabel: "View Services",
      secondaryTarget: "#services",
    },
    {
      id: "hero-uiux",
      badge: "UI/UX & Product Design",
      title: "Design Clear Interfaces Customers Can Trust",
      description:
        "Figma-first UI/UX, landing pages, product flows and conversion-focused design systems.",
      imageUrl: image("photo-1559028012-481c04fa702d"),
      primaryLabel: "Plan Design",
      primaryTarget: "#contact",
      secondaryLabel: "Meet Team",
      secondaryTarget: "#team",
    },
    {
      id: "hero-marketing",
      badge: "Marketing & SEO",
      title: "Grow With SEO, Content And Campaign Support",
      description:
        "Search optimization, social media support, outreach and reporting for steady business growth.",
      imageUrl: image("photo-1551288049-bebda4e38f71"),
      primaryLabel: "Grow My Business",
      primaryTarget: "#contact",
      secondaryLabel: "Popular Services",
      secondaryTarget: "#services",
    },
    {
      id: "hero-leadgen",
      badge: "Lead Generation",
      title: "Find Better Prospects And Follow Up Smarter",
      description:
        "Targeted lead lists, outreach copy and follow-up systems for agencies, startups and service teams.",
      imageUrl: image("photo-1556761175-5973dc0f32e7"),
      primaryLabel: "Start Outreach",
      primaryTarget: "#contact",
      secondaryLabel: "View Reviews",
      secondaryTarget: "#testimonials",
    },
    {
      id: "hero-architecture",
      badge: "3D & Architecture",
      title: "Interior And Exterior 3D Visuals For Projects",
      description:
        "Architecture visualization, interior modeling and exterior renders for presentations and approvals.",
      imageUrl: image("photo-1503387762-592deb58ef4e"),
      primaryLabel: "Request 3D Work",
      primaryTarget: "#contact",
      secondaryLabel: "View Projects",
      secondaryTarget: "#portfolio",
    },
    {
      id: "hero-business",
      badge: "Office & Accounts Support",
      title: "Clean Business Support For Daily Operations",
      description:
        "Accounting support, document cleanup, data entry, research and office freelancing help when your team needs backup.",
      imageUrl: image("photo-1554224155-6726b3ff858f"),
      primaryLabel: "Get Support",
      primaryTarget: "#contact",
      secondaryLabel: "View Services",
      secondaryTarget: "#services",
    },
  ],
  categories: [
    { id: "all", name: "All Services", slug: "all" },
    { id: "web", name: "Web Development", slug: "web-development" },
    { id: "uiux", name: "UI/UX Design", slug: "ui-ux-design" },
    { id: "wordpress", name: "WordPress", slug: "wordpress" },
    { id: "marketing", name: "Digital Marketing", slug: "digital-marketing" },
    { id: "leadgen", name: "Lead Generation", slug: "lead-generation" },
    { id: "seo", name: "SEO", slug: "seo" },
    { id: "creative", name: "Creative Design", slug: "creative-design" },
    { id: "office", name: "Office Support", slug: "office-support" },
    { id: "accounts", name: "Accounting", slug: "accounting" },
    { id: "architecture", name: "3D & Architecture", slug: "3d-architecture" },
  ],
  services: [
    {
      id: "service-web",
      categorySlug: "web-development",
      title: "Web Development",
      description: "Custom websites and web apps built with modern technology.",
      priceRange: "Start from 120 USD",
      rating: "4.9",
      accent: "#2e3b55",
      emoji: "💻",
      details:
        "We plan, design and build responsive web experiences that are easy to manage and ready to scale.",
      icon: "briefcase",
    },
    {
      id: "service-ui",
      categorySlug: "ui-ux-design",
      title: "UI/UX Design",
      description: "Beautiful, user-friendly interfaces that turn visitors into customers.",
      priceRange: "Start from 100 USD",
      rating: "4.8",
      accent: "#7b5bb8",
      emoji: "🎨",
      details:
        "Our design process focuses on clarity, conversion and the workflows your customers actually use.",
      icon: "pen",
    },
    {
      id: "service-marketing",
      categorySlug: "digital-marketing",
      title: "Digital Marketing",
      description: "Campaigns that increase visibility, traffic and sales.",
      priceRange: "Start from 50 USD",
      rating: "4.7",
      accent: "#1f8cab",
      emoji: "📣",
      details:
        "We manage strategy, creative and reporting so every campaign has a clear business purpose.",
      icon: "megaphone",
    },
    {
      id: "service-seo",
      categorySlug: "seo",
      title: "SEO Optimization",
      description: "Improve rankings and organic growth with focused search work.",
      priceRange: "Start from 50 USD",
      rating: "4.9",
      accent: "#206c3a",
      emoji: "📈",
      details:
        "Technical SEO, content planning and ongoing improvements are handled with measurable goals.",
      icon: "chart",
    },
    {
      id: "service-support",
      categorySlug: "web-development",
      title: "Support & Maintenance",
      description: "Reliable updates and maintenance to keep your site running.",
      priceRange: "Start from 40 USD",
      rating: "4.8",
      accent: "#2f3341",
      emoji: "🛠️",
      details:
        "We keep your platform secure, updated and ready for future changes.",
      icon: "headphones",
    },
    {
      id: "service-interior-3d",
      categorySlug: "3d-architecture",
      title: "Interior 3D Modeling",
      description:
        "Realistic interior models and renders for rooms, offices and commercial spaces.",
      priceRange: "Start from 150 USD",
      rating: "4.7",
      accent: "#a45216",
      emoji: "🏠",
      details:
        "We create polished interior 3D visuals for planning, presentations and client approvals.",
      icon: "pen",
      tags: ["Interior", "3D Modeling", "Render"],
    },
    {
      id: "service-exterior-3d",
      categorySlug: "3d-architecture",
      title: "Exterior 3D Modeling",
      description:
        "Exterior building visuals with clean materials, lighting and environment.",
      priceRange: "Start from 180 USD",
      rating: "4.7",
      accent: "#256a44",
      emoji: "🏢",
      details:
        "We prepare exterior 3D models and render-ready visuals for homes, buildings and real estate presentations.",
      icon: "chart",
      tags: ["Exterior", "Architecture", "3D Render"],
    },
    {
      id: "service-architecture",
      categorySlug: "3d-architecture",
      title: "Architecture Service",
      description:
        "Architecture planning support, concept visuals and presentation-ready design assets.",
      priceRange: "Start from 250 USD",
      rating: "4.8",
      accent: "#4d3f8d",
      emoji: "📐",
      details:
        "Architecture service covers concept support, plans, visuals and presentation material for residential and commercial projects.",
      icon: "briefcase",
      tags: ["Architecture", "Planning", "Design"],
    },
    {
      id: "service-graphics-design",
      categorySlug: "creative-design",
      title: "Graphics Design",
      description:
        "Professional social, print and marketing graphics for everyday business needs.",
      priceRange: "Start from 30 USD",
      rating: "4.6",
      accent: "#7b5bb8",
      emoji: "🎨",
      details:
        "We design social media creatives, ads, banners, flyers, posters and branded graphics that look clean and campaign-ready.",
      icon: "pen",
      tags: ["Graphics", "Social Media", "Print Design"],
    },
    {
      id: "service-logo-design",
      categorySlug: "creative-design",
      title: "Logo Design",
      description:
        "Memorable logo concepts with clean files for web, print and social use.",
      priceRange: "Start from 50 USD",
      rating: "4.6",
      accent: "#c6613f",
      emoji: "✨",
      details:
        "Logo service includes concept direction, polished logo design and export-ready brand files for digital and print use.",
      icon: "pen",
      tags: ["Logo", "Brand Identity", "Design"],
    },
    {
      id: "service-branding",
      categorySlug: "creative-design",
      title: "Branding Service",
      description:
        "Brand identity support with colors, typography, visual style and usage direction.",
      priceRange: "Start from 120 USD",
      rating: "4.7",
      accent: "#101623",
      emoji: "🏷️",
      details:
        "Branding service helps shape a consistent visual identity across logo, colors, typography, social templates and business materials.",
      icon: "briefcase",
      tags: ["Branding", "Identity", "Guidelines"],
    },
    {
      id: "service-office-freelancing",
      categorySlug: "office-support",
      title: "Virtual Office Support",
      description:
        "Remote office support for data entry, documents, research and admin tasks.",
      priceRange: "Start from 25 USD",
      rating: "4.9",
      accent: "#2f3341",
      emoji: "📋",
      details:
        "Virtual office support covers data entry, web research, document formatting, spreadsheet cleanup, file organization and daily admin work.",
      icon: "briefcase",
      tags: ["Office", "Data Entry", "Virtual Assistant"],
    },
    {
      id: "service-accounting",
      categorySlug: "accounting",
      title: "Accounting & Bookkeeping",
      description:
        "Organized bookkeeping, expense tracking, invoice records and financial reports.",
      priceRange: "Start from 60 USD",
      rating: "4.6",
      accent: "#206c3a",
      emoji: "🧾",
      details:
        "Accounting support includes bookkeeping, invoice and expense tracking, basic financial summaries, reconciliation support and clean monthly reporting.",
      icon: "chart",
      tags: ["Accounting", "Bookkeeping", "Reports"],
    },
    {
      id: "service-wordpress-launch",
      categorySlug: "wordpress",
      title: "WordPress website — design, build & launch",
      description:
        "Complete WordPress website setup with design, build, launch and basic optimization.",
      priceRange: "From $125",
      rating: "4.9",
      accent: "#2e3b55",
      emoji: "🧩",
      details:
        "A complete WordPress website service covering design, development, launch setup, responsive layout and a clean handover.",
      icon: "briefcase",
      tags: ["WordPress", "Website", "Launch"],
    },
    {
      id: "service-elementor-landing",
      categorySlug: "wordpress",
      title: "Elementor landing page that converts",
      description:
        "Conversion-focused Elementor landing page for campaigns, products and services.",
      priceRange: "From $85",
      rating: "4.8",
      accent: "#d86d45",
      emoji: "⚡",
      details:
        "Elementor landing pages are built for clear messaging, responsive design, lead capture and fast campaign launch.",
      icon: "pen",
      tags: ["Elementor", "Landing Page", "Conversion"],
    },
    {
      id: "service-nextjs-app",
      categorySlug: "web-development",
      title: "Next.js web application development",
      description:
        "Modern Next.js web apps with fast UI, clean workflows and scalable structure.",
      priceRange: "From $450",
      rating: "4.9",
      accent: "#267444",
      emoji: "🚀",
      details:
        "We build custom Next.js applications, dashboards, portals and workflow tools with responsive UI and production-focused architecture.",
      icon: "briefcase",
      tags: ["Next.js", "Web App", "Portal"],
    },
    {
      id: "service-uiux-figma-product",
      categorySlug: "ui-ux-design",
      title: "UI/UX design — Figma to finished product",
      description:
        "Product-ready UI/UX design in Figma for websites, dashboards and applications.",
      priceRange: "From $95",
      rating: "4.8",
      accent: "#7b5bb8",
      emoji: "🎨",
      details:
        "UI/UX design service includes user flow, wireframe direction, polished Figma screens and developer-friendly handoff.",
      icon: "pen",
      tags: ["Figma", "UI/UX", "Product Design"],
    },
    {
      id: "service-social-media-management",
      categorySlug: "digital-marketing",
      title: "Social media management & content",
      description:
        "Content planning, graphics and social media management for growing brands.",
      priceRange: "From $150/mo",
      rating: "4.9",
      accent: "#1f9fc7",
      emoji: "📣",
      details:
        "Social media support covers content planning, creative posts, captions, scheduling support and monthly brand consistency.",
      icon: "megaphone",
      tags: ["Social Media", "Content", "Marketing"],
    },
    {
      id: "service-lead-generation-outreach",
      categorySlug: "lead-generation",
      title: "Lead generation & outreach campaigns",
      description:
        "Targeted lead lists, outreach messages and campaign follow-up support.",
      priceRange: "From $200/mo",
      rating: "4.8",
      accent: "#b35b14",
      emoji: "✉️",
      details:
        "Lead generation includes prospect research, list building, outreach copy, campaign setup support and follow-up planning.",
      icon: "megaphone",
      tags: ["Lead Generation", "Outreach", "B2B"],
    },
  ],
  projects: [
    {
      id: "project-finance",
      title: "Finance Dashboard",
      category: "Web Application",
      description: "A clean reporting dashboard for finance teams.",
      details: "Built with performance-focused dashboards, charts and approval flows.",
      imageUrl: image("photo-1551288049-bebda4e38f71"),
      review: "“Our finance team finally has one dashboard everyone trusts.” — Ryan Cooper, Ledgerline Partners (USA)",
    },
    {
      id: "project-commerce",
      title: "TrendStore E-commerce",
      category: "E-commerce",
      description: "A modern store experience for product discovery.",
      details: "Includes product cards, checkout-friendly UI and campaign-ready sections.",
      imageUrl: image("photo-1556742049-0cfed4f6a45d"),
      review: "“Product pages finally load fast and checkouts feel effortless.” — Priya Nair, TrendStore Retail (India)",
    },
    {
      id: "project-travel",
      title: "Travel Explorer",
      category: "Web Design",
      description: "A visual landing experience for travel packages.",
      details: "Designed to highlight locations, packages, reviews and lead capture.",
      imageUrl: image("photo-1500530855697-b586d89ba3ee"),
      review: "“Visitors finally spend time browsing instead of bouncing.” — Marco Rossi, Explora Viaggi (Italy)",
    },
    {
      id: "project-health",
      title: "HealthCare Plus",
      category: "Web Application",
      description: "A service platform for patient-friendly scheduling.",
      details: "Focused on clarity, mobile-first layouts and simple inquiry flows.",
      imageUrl: image("photo-1576091160399-112ba8d25d1d"),
      review: "“Patients book appointments without calling the front desk anymore.” — Fatima Al-Sayed, Wellspring Clinic (UAE)",
    },
  ],
  team: [
    {
      id: "team-nazmul",
      name: "Nazmul Hasan",
      role: "Founder & CEO",
      bio: "Leads AP Tech delivery across WordPress, Elementor, theme and plugin work, AI workflows, PHP Laravel, React websites, SEO and long-term support.",
      photoUrl: "",
      skills: [
        "WordPress",
        "Elementor",
        "Theme Customization",
        "Plugin Setup",
        "AI Expert",
        "PHP Laravel",
        "React Website",
        "Next.js",
        "SEO",
        "Support & Maintenance",
      ],
      jobs: [
        "WordPress business website design, build and launch",
        "Elementor landing page setup with conversion-focused sections",
        "Theme customization, plugin setup and maintenance support",
        "PHP Laravel website and admin workflow development",
        "React or Next.js website and client portal delivery",
        "SEO audit, on-page setup, indexing checks and monthly support planning",
      ],
      socialLinks: {},
    },
    {
      id: "team-nahida",
      name: "Nahdia Nasrin",
      role: "UI/UX Designer",
      bio: "Designs clean user journeys, Figma screens and polished layouts for landing pages, dashboards and mobile-friendly portals.",
      photoUrl: "",
      skills: ["UI/UX", "Figma", "Wireframe", "Landing Page UI", "Dashboard Design"],
      jobs: [
        "Landing page wireframe and final Figma UI",
        "Dashboard screen design with reusable components",
        "Mobile responsive layout review",
        "Design system cleanup for developer handoff",
      ],
      socialLinks: {},
    },
    {
      id: "team-raihan",
      name: "Raihan Ahmed",
      role: "UI/UX & Product Designer",
      bio: "Turns client briefs into structured product flows, clickable prototypes and conversion-focused web layouts.",
      photoUrl: "",
      skills: ["Figma", "Prototype", "Product UX", "Website Redesign", "Client Portal UI"],
      jobs: [
        "Product flow planning and clickable prototype",
        "Website redesign concept with stronger hierarchy",
        "Client portal UI screens and empty states",
        "Checkout and lead form UX improvement",
      ],
      socialLinks: {},
    },
    {
      id: "team-tahmina",
      name: "Tahmina Akter",
      role: "UI/UX Research Assistant",
      bio: "Supports UI/UX projects with competitor research, content structure, usability notes and design QA before delivery.",
      photoUrl: "",
      skills: ["UX Research", "Content Layout", "Design QA", "Competitor Review", "User Notes"],
      jobs: [
        "Landing page content mapping",
        "Competitor UI and service page review",
        "Design QA notes before development",
        "Simple user journey and section priority notes",
      ],
      socialLinks: {},
    },
    {
      id: "team-nirob",
      name: "KS Nirob",
      role: "React Full Stack Developer",
      bio: "Builds React and Next.js applications with clean interfaces, API-connected dashboards and practical workflow tools.",
      photoUrl: "",
      skills: ["React", "Next.js", "Node.js", "API Integration", "Dashboard"],
      jobs: [
        "React dashboard with cards, tables and filters",
        "Next.js client portal feature development",
        "API-connected web app screens",
        "Admin workflow and role-based UI implementation",
      ],
      socialLinks: {},
    },
    {
      id: "team-tanzina",
      name: "Tanzina Pinaz",
      role: "Architecture & 3D Modeling Specialist",
      bio: "Creates interior, exterior and architecture-focused 3D models, presentation scenes and render-ready visuals.",
      photoUrl: "",
      skills: ["Interior 3D", "Exterior 3D", "Architecture", "Rendering", "Scene Setup"],
      jobs: [
        "Interior room visualization with furniture layout",
        "Exterior building model and facade presentation",
        "Architecture presentation board support",
        "Render-ready scene setup for client approval",
      ],
      socialLinks: {},
    },
    {
      id: "team-rifatul",
      name: "Rifatul Islam",
      role: "Graphics & Branding Designer",
      bio: "Designs brand visuals, logo concepts, social creatives and campaign-ready graphics for web and marketing use.",
      photoUrl: "",
      skills: ["Graphics Design", "Logo Design", "Branding", "Social Creative", "Print Asset"],
      jobs: [
        "Logo concept set with color direction",
        "Social media ad pack for campaigns",
        "Brand guideline support for new businesses",
        "Service thumbnail and banner design",
      ],
      socialLinks: {},
    },
    {
      id: "team-zia",
      name: "Ziauddin Kader",
      role: "Accounting & Bookkeeping Specialist",
      bio: "Supports accounting-related service work with bookkeeping, invoice records, expense tracking and monthly summaries.",
      photoUrl: "",
      skills: ["Accounting", "Bookkeeping", "Invoices", "Expense Tracking", "Reports"],
      jobs: [
        "Monthly bookkeeping cleanup",
        "Invoice and payment record organization",
        "Expense tracking sheet preparation",
        "Financial summary and report formatting",
      ],
      socialLinks: {},
    },
  ],
  reviews: [
    {
      id: "review-john",
      clientName: "John Smith",
      clientRole: "CEO",
      company: "TechCorp",
      country: "United States",
      rating: 4.9,
      quote:
        "AP Tech Agency delivered an outstanding website that exceeded our expectations.",
      details:
        "The team handled planning, design and delivery with excellent communication.",
      avatarUrl: "",
    },
    {
      id: "review-sarah",
      clientName: "Sarah Johnson",
      clientRole: "Marketing Director",
      company: "ShopEase",
      country: "United Kingdom",
      rating: 4.6,
      quote:
        "They understood our requirements perfectly and delivered on time.",
      details:
        "The final design was clean, modern and easy for our team to manage.",
      avatarUrl: "",
    },
    {
      id: "review-sarah-2",
      clientName: "Sarah Johnson",
      clientRole: "Marketing Director",
      company: "ShopEase",
      country: "United Kingdom",
      orderNumber: 2,
      rating: 4.8,
      quote:
        "We came back for a second project and the handover was just as smooth as the first time.",
      details:
        "This time it was the SEO and campaign setup - same steady communication as our first website project.",
      avatarUrl: "",
    },
    {
      id: "review-david",
      clientName: "David Brown",
      clientRole: "Founder",
      company: "TrendyMart",
      country: "Canada",
      rating: 4.4,
      quote:
        "Our online store saw a huge improvement after their SEO and marketing work.",
      details:
        "The campaign reporting made it easy to understand what was working.",
      avatarUrl: "",
    },
    {
      id: "review-emily",
      clientName: "Emily Carter",
      clientRole: "Operations Manager",
      company: "BrightNest Studio",
      country: "Australia",
      rating: 4.8,
      quote:
        "The website refresh made our service pages much easier for clients to understand.",
      details:
        "AP Tech improved the structure, visuals and contact flow without making the process complicated.",
      avatarUrl: "",
    },
    {
      id: "review-michael",
      clientName: "Michael Reed",
      clientRole: "Director",
      company: "NorthPeak Consulting",
      country: "United States",
      rating: 4.7,
      quote:
        "Their team gave practical suggestions and delivered a clean, professional result.",
      details:
        "The final pages felt clearer, faster and easier for our team to update.",
      avatarUrl: "",
    },
    {
      id: "review-olivia",
      clientName: "Olivia Bennett",
      clientRole: "Founder",
      company: "BloomCare",
      country: "Ireland",
      rating: 4.9,
      quote:
        "The UI/UX work helped us explain our offer with a lot more confidence.",
      details:
        "They handled wireframes, responsive sections and small details that made the page feel polished.",
      avatarUrl: "",
    },
    {
      id: "review-daniel",
      clientName: "Daniel Fischer",
      clientRole: "Product Lead",
      company: "Trackly GmbH",
      country: "Germany",
      rating: 4.3,
      quote:
        "Unser Dashboard-Prototyp ließ sich nach ihrer Designarbeit viel leichter präsentieren.",
      details:
        "The team organized complex information into screens that were simple to scan.",
      avatarUrl: "",
    },
    {
      id: "review-ava",
      clientName: "Ava Mitchell",
      clientRole: "Marketing Lead",
      company: "GreenShelf",
      country: "United States",
      rating: 4.6,
      quote:
        "The social media content plan gave our small team a clear monthly direction.",
      details:
        "Captions, creative ideas and posting structure were all prepared in a usable way.",
      avatarUrl: "",
    },
    {
      id: "review-james",
      clientName: "James Wilson",
      clientRole: "Owner",
      company: "Wilson Home Services",
      country: "Canada",
      rating: 4.8,
      quote:
        "They built a service website that looks professional and brings in better inquiries.",
      details:
        "The pages were focused, mobile-friendly and easy for visitors to act on.",
      avatarUrl: "",
    },
    {
      id: "review-sophia",
      clientName: "Sophia Turner",
      clientRole: "Creative Director",
      company: "LumaBrand",
      country: "United Kingdom",
      rating: 4.5,
      quote:
        "The branding and graphics support matched our tone and saved us a lot of time.",
      details:
        "AP Tech prepared clean visual options and kept the design consistent across assets.",
      avatarUrl: "",
    },
    {
      id: "review-liam",
      clientName: "Liam Anderson",
      clientRole: "E-commerce Manager",
      company: "CartPilot",
      country: "Australia",
      rating: 4.9,
      quote:
        "The WooCommerce setup was smooth and the product pages felt much better organized.",
      details:
        "They handled layout, settings and launch checks with steady communication.",
      avatarUrl: "",
    },
    {
      id: "review-mia",
      clientName: "Sofía Ramírez",
      clientRole: "Founder",
      company: "StudioWell",
      country: "Spain",
      rating: 4.2,
      quote:
        "El trabajo en la landing page nos ayudó a probar una nueva oferta rápidamente.",
      details:
        "The page had clear sections, useful copy direction and a simple lead flow.",
      avatarUrl: "",
    },
    {
      id: "review-noah",
      clientName: "Noah Parker",
      clientRole: "Agency Partner",
      company: "BlueOrbit",
      country: "United States",
      rating: 4.8,
      quote:
        "AP Tech supported our overflow development work reliably and stayed organized.",
      details:
        "Their handoff notes and progress updates made collaboration easier.",
      avatarUrl: "",
    },
    {
      id: "review-isabella",
      clientName: "Isabella Moore",
      clientRole: "Real Estate Consultant",
      company: "PrimeHabitat",
      country: "United Arab Emirates",
      rating: 4.4,
      quote:
        "The 3D presentation visuals helped our client understand the space faster.",
      details:
        "Interior and exterior views were prepared cleanly for discussion and approval.",
      avatarUrl: "",
    },
    {
      id: "review-ethan",
      clientName: "Carlos Almeida",
      clientRole: "Founder",
      company: "LeadBridge",
      country: "Brazil",
      rating: 4.5,
      quote:
        "A lista de prospecção e as mensagens de follow-up nos deram um ótimo ponto de partida.",
      details:
        "It was practical, organized and easy for our sales assistant to continue.",
      avatarUrl: "",
    },
    {
      id: "review-charlotte",
      clientName: "Rima Chowdhury",
      clientRole: "Business Manager",
      company: "CarePoint Admin",
      country: "Bangladesh",
      rating: 4.3,
      quote:
        "জমে থাকা ডকুমেন্ট আর স্প্রেডশিট গুছিয়ে দেওয়ায় আমাদের অফিসের কাজ অনেক সহজ হয়ে গেছে।",
      details:
        "The work was organized clearly and returned in a format our team could use immediately.",
      avatarUrl: "",
    },
    {
      id: "review-benjamin",
      clientName: "Julien Moreau",
      clientRole: "CEO",
      company: "NexaFlow",
      country: "France",
      rating: 4.9,
      quote:
        "Le tableau de bord React est propre et l'interface est bien plus stable qu'avant.",
      details:
        "They understood the workflow and improved the UI without adding unnecessary complexity.",
      avatarUrl: "",
    },
    {
      id: "review-amelia",
      clientName: "Amelia Wright",
      clientRole: "Founder",
      company: "CraftLane",
      country: "New Zealand",
      rating: 4.2,
      quote:
        "The logo and brand assets gave our new business a more confident look.",
      details:
        "The final files were tidy, consistent and ready for website and social use.",
      avatarUrl: "",
    },
    {
      id: "review-henry",
      clientName: "Henry Adams",
      clientRole: "Finance Lead",
      company: "ClearLedger",
      country: "Singapore",
      rating: 4.7,
      quote:
        "The bookkeeping sheets and invoice records were much easier to review after cleanup.",
      details:
        "AP Tech organized the data and highlighted the items that needed attention.",
      avatarUrl: "",
    },
    {
      id: "review-grace",
      clientName: "Grace Morgan",
      clientRole: "Marketing Manager",
      company: "EduVista",
      country: "South Africa",
      rating: 4.8,
      quote:
        "Their SEO updates gave our course pages a stronger structure and better clarity.",
      details:
        "The keyword map, headings and technical notes were easy to follow.",
      avatarUrl: "",
    },
  ],
  seo: {
    title: "AP Tech Agency - Creative Solutions That Drive Results",
    description:
      "AP Tech Agency provides web development, UI/UX design, digital marketing, SEO, support, graphics design, branding, office support, accounting, 3D modeling and architecture services for growing businesses.",
    keywords:
      "AP Tech Agency, web development agency, website development service, UI UX design agency, digital marketing services, SEO services, graphics design service, logo design service, branding service, virtual office support, accounting and bookkeeping service, interior 3D modeling, exterior 3D modeling, architecture service, ecommerce website development, business website design, remote agency support",
    siteUrl: "https://aptechagency.com",
    targetMarkets:
      "United States, United Kingdom, Europe, Americas, and international markets outside Bangladesh, India and Pakistan.",
    phone: "+8801799664826",
    email: "info@aptechagency.com",
    address: "Dhaka, Bangladesh",
    socialImageUrl: "",
    importantLinks:
      "https://aptechagency.com, https://aptechagency.com/landing, https://aptechagency.com/login, https://aptechagency.com/register",
    googleVerification: "",
    allowIndexing: true,
  },
  about: {
    eyebrow: "About AP Tech",
    title: "About AP Tech Agency",
    description:
      "We are a team of passionate creators, developers and strategists helping businesses grow with smart digital solutions. Our goal is simple: bring your ideas to life and help your business move faster.",
    imageUrl: image("photo-1551836022-d5d88e9218df"),
    points: [
      { title: "Client Focused", text: "Your success is our priority." },
      { title: "Quality Work", text: "We deliver high-quality results." },
      { title: "On-Time Delivery", text: "Always on schedule." },
      { title: "24/7 Support", text: "We are here when you need us." },
    ],
  },
  contact: {
    languageNoteEnabled: true,
    languageNote:
      "Comfortable in your own language? Feel free to write to us in Bengali, Spanish, French, German, Portuguese or any language you prefer — we'll understand and reply just as easily. No need to translate into English first.",
  },
  footer: {
    thanksText: "Thanks!",
    copyright: "© 2026 AP Tech Agency. All rights reserved.",
    privacyPolicy:
      "Privacy Policy\n\nAP Tech Agency respects your privacy and handles visitor, lead, client and chat information carefully. This policy explains what we collect, why we collect it and how we use it.\n\n1. Information we collect\nWe may collect your name, email address, phone number, company name, project subject, message, live chat details, service interests, uploaded files and any information you submit through forms, chat or project requests. We may also collect basic technical information such as browser type, device type, page visits, approximate location, referral source and cookie preferences.\n\n2. How we use information\nWe use submitted information to respond to inquiries, prepare project recommendations, create leads, manage follow-up messages, provide support, improve our website, prevent misuse and maintain business records. Contact form and live chat submissions may be visible to authorized AP Tech team members inside our internal portal.\n\n3. Cookies and analytics\nWe may use cookies or similar storage to remember preferences, measure page visits, improve user experience and show important notices. You can control cookies from your browser settings. Some features may work differently if cookies are disabled.\n\n4. Lead follow-up and email\nIf you submit a form, chat or request, we may contact you about that request, related services or follow-up information. You can ask us to stop non-essential follow-up messages at any time.\n\n5. Files and project documents\nFiles uploaded for consultation or project work are used only for review, quotation, communication, delivery and record keeping. Please do not upload sensitive personal or financial documents unless they are required for the requested service.\n\n6. Sharing information\nWe do not sell personal information. We may share information only with authorized team members, service providers or tools required to operate the website, deliver services, send email, process communication or comply with legal requirements.\n\n7. Data security\nWe use reasonable administrative and technical safeguards to protect information. No internet-based system is 100% secure, so users should avoid submitting unnecessary sensitive information.\n\n8. Data retention\nWe keep lead, contact, chat and project information as long as needed for business, support, audit, legal or service improvement purposes. You may request correction or removal where applicable.\n\n9. Contact\nFor privacy questions or data requests, contact AP Tech Agency at info@aptechagency.com or +8801799664826.",
    terms:
      "Terms & Conditions\n\nBy using the AP Tech Agency website, public portal, contact form, live chat or client request system, you agree to these terms.\n\n1. Website use\nYou agree to use this website for lawful business communication only. Do not submit spam, harmful files, false information, abusive content or anything that may disrupt the website or our internal systems.\n\n2. Service inquiry and quotation\nInformation shown on the website, including price ranges, timelines, offers and service descriptions, is for general guidance. Final price, timeline and scope depend on project requirements, complexity, revisions, content, integrations and approval process.\n\n3. Project scope\nA project starts only after both sides agree on the scope, price, payment terms and delivery plan. Work outside the approved scope may require an additional quote or timeline adjustment.\n\n4. Payments\nPayment terms may vary by project. Some projects may require advance payment, milestone payment or full payment before delivery. Third-party charges such as domain, hosting, plugins, stock assets, paid tools, ads or marketplace fees are usually paid by the client unless agreed otherwise.\n\n5. Revisions\nReasonable revisions are included only when they are part of the agreed scope. New features, major design changes, extra pages, extra integrations or changes after approval may be treated as additional work.\n\n6. Refund policy\nRefunds depend on the stage of work. If work has not started, a refund may be possible after deducting payment gateway, administrative or planning costs. If work has started, partial or no refund may apply based on completed planning, design, development, research, communication or delivery work. Completed, delivered or approved work is normally non-refundable.\n\n7. Client responsibilities\nClients must provide accurate project details, content, brand assets, access credentials, feedback and approvals on time. Delay in providing required information may delay delivery.\n\n8. Intellectual property\nAfter full payment, final approved deliverables prepared specifically for the client may be handed over according to the agreed terms. AP Tech Agency may keep internal working files, reusable methods, templates, code patterns, know-how and non-client-specific materials. We may display completed work in our portfolio unless the client requests confidentiality in writing.\n\n9. Third-party platforms\nProjects may use third-party tools such as hosting providers, payment gateways, email services, analytics, social platforms, marketplaces or plugins. AP Tech Agency is not responsible for outages, policy changes, pricing changes or limitations controlled by third-party services.\n\n10. Communication and approvals\nOfficial project decisions should be confirmed through our accepted communication channels. Delayed feedback, unclear instructions or repeated changes may affect timeline and cost.\n\n11. Limitation of liability\nAP Tech Agency aims to provide reliable service, but we are not responsible for indirect loss, lost profit, platform bans, third-party service failure, client-side misuse, incorrect information provided by the client or events outside our control.\n\n12. Changes to terms\nWe may update these terms when needed. Continued use of the website or services means you accept the updated terms.\n\n13. Contact\nFor questions about these terms, contact AP Tech Agency at info@aptechagency.com or +8801799664826.",
  },
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string"
    )
  );
}

function readSavedLandingContent(value: unknown) {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Partial<LandingPageData>)
        : null;
    } catch {
      return null;
    }
  }

  return typeof value === "object" && !Array.isArray(value)
    ? (value as Partial<LandingPageData>)
    : null;
}

function normalizeKey(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function looksLikeOldSampleTeam(team: LandingTeamMemberData[] | undefined) {
  if (!team?.length) return false;

  const names = new Set(team.map((member) => normalizeKey(member.name)));
  const hasOldPlaceholder =
    team.some(
      (member) =>
        normalizeKey(member.name) === "rafat hasan" ||
        normalizeKey(member.name) === "nahida islam" ||
        (normalizeKey(member.name) === "ziauddin kader" &&
          normalizeKey(member.role).includes("ceo"))
    );

  const missingRequestedMembers = defaultLandingData.team.some(
    (member) => !names.has(normalizeKey(member.name))
  );

  return hasOldPlaceholder || (team.length < defaultLandingData.team.length && missingRequestedMembers);
}

function mergeTeamMembers(
  savedTeam: LandingTeamMemberData[] | undefined,
  liveTeam: LandingTeamMemberData[]
) {
  const source =
    savedTeam?.length && !looksLikeOldSampleTeam(savedTeam)
      ? savedTeam
      : liveTeam.length && !looksLikeOldSampleTeam(liveTeam)
        ? liveTeam
        : defaultLandingData.team;

  const existingNames = new Set(
    source.map((member) => normalizeKey(member.name))
  );

  return [
    ...source,
    ...defaultLandingData.team.filter(
      (member) => !existingNames.has(normalizeKey(member.name))
    ),
  ];
}

function mergeReviews(reviews: LandingReviewData[] | undefined) {
  const source = reviews?.length ? reviews : defaultLandingData.reviews;
  const existingKeys = new Set(
    source.map((review) =>
      normalizeKey(`${review.clientName}-${review.company}-${review.quote}`)
    )
  );

  return [
    ...source,
    ...defaultLandingData.reviews.filter(
      (review) =>
        !existingKeys.has(
          normalizeKey(`${review.clientName}-${review.company}-${review.quote}`)
        )
    ),
  ].map((review) => ({
    ...review,
    avatarUrl: "",
    rating: Math.max(4.2, Math.min(Number(review.rating) || 4.8, 4.9)),
  }));
}

function mergeFooter(savedFooter: Partial<LandingPageData["footer"]> | undefined) {
  const privacyPolicy =
    savedFooter?.privacyPolicy && savedFooter.privacyPolicy.length > 220
      ? savedFooter.privacyPolicy
      : defaultLandingData.footer.privacyPolicy;
  const terms =
    savedFooter?.terms && savedFooter.terms.length > 220
      ? savedFooter.terms
      : defaultLandingData.footer.terms;

  return {
    ...defaultLandingData.footer,
    ...(savedFooter ?? {}),
    privacyPolicy,
    terms,
  };
}

function mergeTopBarMessages(savedMessages: string[] | undefined) {
  const cleanedSaved = (savedMessages ?? [])
    .map((message) => message.trim())
    .filter(Boolean);
  const messages = cleanedSaved.length
    ? [...cleanedSaved, ...defaultLandingData.topBar.messages]
    : defaultLandingData.topBar.messages;

  return Array.from(new Set(messages));
}

function mergeHeroSlides(savedSlides: LandingHeroSlideData[] | undefined) {
  const slides = savedSlides?.length ? savedSlides : defaultLandingData.heroSlides;
  const cleanedSlides = slides.filter(
    (slide) =>
      !(
        slide.id === "hero-2" &&
        slide.title === "Agency Support For Fast-Moving Teams"
      )
  );
  const existingKeys = new Set(
    cleanedSlides.map((slide) => (slide.id || slide.title).trim().toLowerCase())
  );
  const mergedSlides = [
    ...cleanedSlides,
    ...defaultLandingData.heroSlides.filter(
      (slide) => !existingKeys.has((slide.id || slide.title).trim().toLowerCase())
    ),
  ];

  return mergedSlides.length ? mergedSlides : defaultLandingData.heroSlides;
}

function mergeLandingContent(
  saved: Partial<LandingPageData>,
  liveTeam = defaultLandingData.team
): LandingPageData {
  const mergeByKey = <T>(
    savedItems: T[] | undefined,
    defaultItems: T[],
    getKey: (item: T) => string
  ) => {
    const items = savedItems?.length ? savedItems : defaultItems;
    const existingKeys = new Set(
      items.map((item) => getKey(item).trim().toLowerCase())
    );
    return [
      ...items,
      ...defaultItems.filter(
        (item) => !existingKeys.has(getKey(item).trim().toLowerCase())
      ),
    ];
  };
  const mergeServices = (services: LandingServiceData[] | undefined) =>
    mergeByKey(
      services,
      defaultLandingData.services,
      (service) => service.id || service.title
    ).map((service) => {
      const defaultService = defaultLandingData.services.find(
        (item) =>
          item.id === service.id ||
          item.title.toLowerCase() === service.title.toLowerCase()
      );

      return defaultService
        ? {
            ...defaultService,
            ...service,
            title: defaultService.title,
            description: service.description || defaultService.description,
            details: service.details || defaultService.details,
            priceRange: service.priceRange || defaultService.priceRange,
            rating:
              service.rating && service.rating !== "5.0"
                ? service.rating
                : defaultService.rating,
          }
        : service;
    });

  return {
    topBar: {
      ...defaultLandingData.topBar,
      ...(saved.topBar ?? {}),
      messages: mergeTopBarMessages(saved.topBar?.messages),
    },
    ads: {
      popup: {
        ...defaultLandingData.ads.popup,
        ...(saved.ads?.popup ?? {}),
      },
      top: {
        ...defaultLandingData.ads.top,
        ...(saved.ads?.top ?? {}),
      },
      left: {
        ...defaultLandingData.ads.left,
        ...(saved.ads?.left ?? {}),
      },
      right: {
        ...defaultLandingData.ads.right,
        ...(saved.ads?.right ?? {}),
      },
    },
    heroSlides: mergeHeroSlides(saved.heroSlides),
    categories: mergeByKey(
      saved.categories,
      defaultLandingData.categories,
      (category) => category.slug
    ),
    services: mergeServices(saved.services),
    projects: saved.projects?.length
      ? saved.projects
      : defaultLandingData.projects,
    team: mergeTeamMembers(saved.team, liveTeam),
    reviews: mergeReviews(saved.reviews),
    seo: {
      ...defaultLandingData.seo,
      ...(saved.seo ?? {}),
    },
    about: {
      ...defaultLandingData.about,
      ...(saved.about ?? {}),
    },
    contact: {
      ...defaultLandingData.contact,
      ...(saved.contact ?? {}),
    },
    footer: mergeFooter(saved.footer),
  };
}

export async function getLandingPageData(): Promise<LandingPageData> {
  try {
    const landingPrisma = prisma as typeof prisma & {
      landingHeroSlide?: typeof prisma.landingHeroSlide;
      landingServiceCategory?: typeof prisma.landingServiceCategory;
      landingService?: typeof prisma.landingService;
      landingProject?: typeof prisma.landingProject;
      landingTeamMember?: typeof prisma.landingTeamMember;
      landingReview?: typeof prisma.landingReview;
      landingPageContent?: typeof prisma.landingPageContent;
      user?: typeof prisma.user;
    };

    const settingContent = await prisma.setting
      .findUnique({
        where: { key: "landing.page" },
        select: { value: true },
      })
      .catch(() => null);
    const savedFromSetting = readSavedLandingContent(settingContent?.value);

    if (
      !landingPrisma.landingHeroSlide ||
      !landingPrisma.landingServiceCategory ||
      !landingPrisma.landingService ||
      !landingPrisma.landingProject ||
      !landingPrisma.landingTeamMember ||
      !landingPrisma.landingReview ||
      !landingPrisma.landingPageContent
    ) {
      return savedFromSetting
        ? mergeLandingContent(savedFromSetting)
        : defaultLandingData;
    }

    const [
      heroSlides,
      categories,
      services,
      projects,
      team,
      reviews,
      content,
      users,
    ] = await Promise.all([
      landingPrisma.landingHeroSlide.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      landingPrisma.landingServiceCategory.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      landingPrisma.landingService.findMany({
        where: { active: true },
        include: { category: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      landingPrisma.landingProject.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      }),
      landingPrisma.landingTeamMember.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      landingPrisma.landingReview.findMany({
        where: { active: true, verified: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      }),
      landingPrisma.landingPageContent.findMany(),
      landingPrisma.user
        ? landingPrisma.user.findMany({
            where: {
              role: { in: ["SUPER_ADMIN", "ADMIN", "CEO", "TEAM_MEMBER"] },
              accountStatus: "ACTIVE",
            },
            include: { skills: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
            take: 12,
          })
        : Promise.resolve([]),
    ]);

    const teamFromUsers: LandingTeamMemberData[] = users.map((user) => ({
      id: `user-${user.id}`,
      name: user.name,
      role:
        user.profession ||
        user.role
          .toLowerCase()
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
      bio: user.bio,
      photoUrl: user.photoUrl || user.image,
      skills: user.skills.map((skill) => skill.name),
      jobs: user.profession ? [user.profession] : [],
      socialLinks: {},
    }));

    const databaseTeam: LandingTeamMemberData[] = team.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      bio: member.bio,
      photoUrl: member.photoUrl,
      skills: stringArray(member.skills),
      jobs: stringArray(member.jobs),
      socialLinks: stringRecord(member.socialLinks),
    }));

    const liveTeam = databaseTeam.length ? databaseTeam : defaultLandingData.team;

    const contentMap = Object.fromEntries(
      content.map((item) => [item.key, item.value])
    );

    const pageContent = readSavedLandingContent(
      contentMap["landing.page"] ?? savedFromSetting
    );
    if (pageContent) {
      const saved = pageContent;
      const savedTeamLooksDemo =
        saved.team?.length &&
        saved.team.every((member) => String(member.id).startsWith("team-"));

      return mergeLandingContent(
        {
          ...saved,
          team:
            saved.team?.length && !savedTeamLooksDemo
              ? saved.team
              : liveTeam,
        },
        liveTeam
      );
    }

    const about =
      contentMap.about &&
      typeof contentMap.about === "object" &&
      !Array.isArray(contentMap.about)
        ? {
            ...defaultLandingData.about,
            ...(contentMap.about as Partial<LandingPageData["about"]>),
          }
        : defaultLandingData.about;

    const footer =
      contentMap.footer &&
      typeof contentMap.footer === "object" &&
      !Array.isArray(contentMap.footer)
        ? {
            ...defaultLandingData.footer,
            ...(contentMap.footer as Partial<LandingPageData["footer"]>),
          }
        : defaultLandingData.footer;

    const seo =
      contentMap.seo &&
      typeof contentMap.seo === "object" &&
      !Array.isArray(contentMap.seo)
        ? {
            ...defaultLandingData.seo,
            ...(contentMap.seo as Partial<LandingPageData["seo"]>),
          }
        : defaultLandingData.seo;

    const contact =
      contentMap.contact &&
      typeof contentMap.contact === "object" &&
      !Array.isArray(contentMap.contact)
        ? {
            ...defaultLandingData.contact,
            ...(contentMap.contact as Partial<LandingPageData["contact"]>),
          }
        : defaultLandingData.contact;

    const cmsCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    }));
    const mergedCategories = mergeLandingContent({
      categories: cmsCategories.length
        ? [{ id: "all", name: "All Services", slug: "all" }, ...cmsCategories]
        : undefined,
    }).categories;
    const cmsServices = services.map((service) => ({
      id: service.id,
      categorySlug: service.category?.slug ?? "all",
      title: service.title,
      description: service.description,
      details: service.details,
      icon: service.icon,
      imageUrl: service.imageUrl,
    }));
    const mergedServices = mergeLandingContent({
      services: cmsServices.length ? cmsServices : undefined,
    }).services;

    return {
      topBar: defaultLandingData.topBar,
      ads: defaultLandingData.ads,
      heroSlides: heroSlides.length
        ? heroSlides
        : defaultLandingData.heroSlides,
      categories: mergedCategories,
      services: mergedServices,
      projects: projects.length ? projects : defaultLandingData.projects,
      team: liveTeam,
      reviews: reviews.length ? reviews : defaultLandingData.reviews,
      seo,
      about,
      contact,
      footer,
    };
  } catch (error) {
    console.error("Failed to load landing data:", error);
    return defaultLandingData;
  }
}
