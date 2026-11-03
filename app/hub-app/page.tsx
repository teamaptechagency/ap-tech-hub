import { PortalApp } from "@/components/portal-app";
import "./style.css";
export const dynamic="force-dynamic";
export default async function HubAppPage({searchParams}:{searchParams:Promise<{surface?:string}>}){const params=await searchParams;return <PortalApp surface={params.surface==='work'?'work':'mobile'}/>;}
