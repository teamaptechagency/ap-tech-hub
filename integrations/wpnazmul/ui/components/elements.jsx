import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Clock, CodeXml, FileText, Flag, Folder, Globe, Grid2X2, LayoutPanelLeft, Menu, MessageCircle, Plus, Receipt, Search, Send, Settings, Sparkles, Store, Upload, User, Users, X, Zap } from 'lucide-react';

const icons = { back: ArrowLeft, arrow: ArrowRight, external: ArrowUpRight, check: Check, clock: Clock, code: CodeXml, file: FileText, flag: Flag, folder: Folder, globe: Globe, grid: Grid2X2, layout: LayoutPanelLeft, menu: Menu, chat: MessageCircle, plus: Plus, receipt: Receipt, search: Search, send: Send, settings: Settings, spark: Sparkles, store: Store, upload: Upload, user: User, users: Users, close: X, bolt: Zap };

export function Icon({ name, size = 20 }) {
  const Component = icons[name] || Folder;
  return <Component className={'icon' + (size > 20 ? ' icon-lg' : '')} size={size} aria-hidden="true" />;
}

export const assets = '/owner/assets/';
export const publicHref = '/';
export function Logo({ className = 'brand', width = 190 }) {
  return <Link className={className} href={publicHref} aria-label="Nazmul Hasan preview home"><img src={assets + 'logo.png'} alt="Nazmul Hasan" width={width} height={Math.round(width * 285 / 1108)} /></Link>;
}

export function ActionLink({ children, href, className = 'btn btn-dark' }) {
  return <Link href={href} className={className}>{children}</Link>;
}

export function Avatar({ initial = 'V', className = '' }) { return <span aria-hidden="true" className={'avatar ' + className}>{initial}</span>; }