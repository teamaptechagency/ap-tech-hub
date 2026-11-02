import type { Metadata } from "next";
import { LiveDevicePanel } from "@/components/devices/live-device-panel";
export const metadata: Metadata = { title: "Work Station | AP Tech Hub", robots: { index: false, follow: false } };
export default function WorkStationPage() { return <LiveDevicePanel />; }
