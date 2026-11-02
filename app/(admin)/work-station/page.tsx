import Link from "next/link";
import type { Metadata } from "next";
import { LiveDevicePanel } from "@/components/devices/live-device-panel";
export const metadata: Metadata = { title: "Work Station | AP Tech Hub", robots: { index: false, follow: false } };
export default function WorkStationPage() { return <><Link href="/business-office" className="mb-4 inline-flex rounded-lg border px-4 py-2 text-sm">Business Office · Role-based records</Link><LiveDevicePanel /></>; }
