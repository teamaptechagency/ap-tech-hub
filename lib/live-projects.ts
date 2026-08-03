import type { LandingProjectData } from "@/lib/landing-data";

/**
 * Shipped client work, from the team's own project list.
 *
 * Every URL here was checked as live before being included. Three entries from
 * that list are deliberately absent:
 *
 *  - benchmarker.com — the list itself marks it "Broken Website: contact the
 *    client to fix". It loads, but a portfolio link to a site the team already
 *    knows is faulty costs more than it earns.
 *  - dna-digital.vercel.app — marked "Almost Done", and still on a vercel.app
 *    address rather than the client's own domain.
 *  - jorg.aptechagency.com — a client review link, not published work.
 *
 * Descriptions are written from what each site actually says about itself, so
 * nothing here claims a result the team has not evidenced.
 */
export const liveProjects: LandingProjectData[] = [
  {
    id: "project-flypharma",
    title: "FlyPharma",
    category: "Web Development",
    service: "WordPress Development",
    description:
      "Website for a biologics biomanufacturing company, built to explain a technical process to partners and investors without losing them.",
    details:
      "Full WordPress build. The structure leads with the science, then routes different visitors — partners, investors, candidates — to the page each of them needs.",
    projectUrl: "https://flypharma.bio/",
    tags: ["WordPress", "Biotech", "Corporate"],
  },
  {
    id: "project-hoffman-biotech-law",
    title: "Hoffman Biotech Law",
    category: "Web Development",
    service: "WordPress Development",
    description:
      "Site for a law firm serving biotech clients, where the job of the page is to establish credibility fast and make contact easy.",
    details:
      "WordPress build with a clear services structure and direct enquiry paths, written for a professional-services audience.",
    projectUrl: "https://hoffmanbiotechlaw.com/",
    tags: ["WordPress", "Legal", "Professional services"],
  },
  {
    id: "project-advisory-consulting",
    title: "Advisory Consulting Solutions",
    category: "Web Development",
    service: "Custom WordPress Solutions",
    description:
      "Compliance consultancy for investment advisers — a regulated field where the site has to read as precise and trustworthy.",
    details:
      "Built to carry a detailed service offering without overwhelming the visitor, with the compliance specialisms laid out plainly.",
    projectUrl: "https://advisoryconsultingsolutions.com/",
    tags: ["WordPress", "Finance", "Compliance"],
  },
  {
    id: "project-bridge-the-gap",
    title: "Bridge The Gap Training",
    category: "Web Development",
    service: "WordPress Development",
    description:
      "Professional development and training provider, with the programmes and booking route as the centre of the site.",
    details:
      "WordPress build organised around the training offer, so a visitor can find the right programme and enquire in a couple of steps.",
    projectUrl: "https://bridgethegap-training.com/",
    tags: ["WordPress", "Training", "Booking"],
  },
  {
    id: "project-mon-legs",
    title: "Mon Legs",
    category: "Web Development",
    service: "Responsive Web Design",
    description:
      "French end-of-life planning service. A sensitive subject, so the design stays calm and the steps stay clear.",
    details:
      "Built in French for a French audience, with the tone and pacing handled as carefully as the layout.",
    projectUrl: "https://www.monlegs.fr/",
    tags: ["WordPress", "French", "Service"],
  },
  {
    id: "project-lena-dugnus",
    title: "Lena Dugnus Photography",
    category: "UI/UX Design",
    service: "Website Redesign",
    description:
      "Photography portfolio where the work has to fill the screen and the interface has to get out of its way.",
    details:
      "Multilingual site built around image-led layouts, with galleries that hold their quality on phones as well as desktops.",
    projectUrl: "https://lena-dugnus-photography.com/en/",
    tags: ["Portfolio", "Multilingual", "Photography"],
  },
  {
    id: "project-udonto-pathok",
    title: "Udonto Pathok",
    category: "Web Development",
    service: "Custom WordPress Solutions",
    description:
      "Bengali-language content site, built so that Bengali typography and reading flow are treated as first-class rather than retrofitted.",
    details:
      "Custom WordPress work with attention to Bengali type rendering, which most stock themes handle badly.",
    projectUrl: "https://udontopathok.com/",
    tags: ["WordPress", "Bengali", "Content"],
  },
  {
    id: "project-afnan-alamin",
    title: "Afnan Alamin",
    category: "UI/UX Design",
    service: "Landing Page Design",
    description:
      "Personal brand site — one page that has to introduce the person and give a reason to get in touch.",
    details:
      "Focused single-purpose design, kept deliberately short so the call to action is never far from the visitor.",
    projectUrl: "http://afnanalamin.com/",
    tags: ["Personal brand", "Landing page"],
  },
];
