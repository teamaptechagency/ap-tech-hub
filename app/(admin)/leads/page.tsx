import { LeadCrmShell, type LeadCollectionRow, type LeadRow } from "@/components/leads/lead-crm-shell";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PrismaWithLeads = typeof prisma & {
  leadCollection?: any;
  lead?: any;
};

type FallbackChat = {
  id: string;
  name: string;
  email: string;
  subject: string;
  messages?: { body: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
};

async function getFallbackChatLeads(): Promise<LeadRow[]> {
  const setting = await prisma.setting
    .findUnique({
      where: { key: "landing.chat.fallback" },
      select: { value: true },
    })
    .catch(() => null);

  if (!setting?.value) return [];

  try {
    const chats = JSON.parse(setting.value);
    if (!Array.isArray(chats)) return [];

    return (chats as FallbackChat[]).map((chat) => ({
      id: `fallback:${chat.id}`,
      collectionId: null,
      collectionName: "Website fallback inbox",
      name: chat.name,
      company: "Landing live chat",
      email: chat.email,
      phone: null,
      source: "WEBSITE",
      status: "NEW",
      value: null,
      currency: "USD",
      tags: "live-chat, fallback",
      notes: `Subject: ${chat.subject}`,
      nextFollowUpAt: null,
      lastContactedAt: null,
      updatedAt: chat.updatedAt,
      activities: (chat.messages ?? []).map((message, index) => ({
        id: `${chat.id}:${index}`,
        type: "NOTE",
        subject: "Live chat message",
        body: message.body,
        status: "DONE",
        scheduledAt: null,
        completedAt: message.createdAt,
        createdAt: message.createdAt,
      })),
    }));
  } catch {
    return [];
  }
}

export default async function LeadsPage() {
  const db = prisma as PrismaWithLeads;
  const fallbackChatLeads = await getFallbackChatLeads();

  if (!db.leadCollection || !db.lead) {
    return (
      <LeadCrmShell
        collections={[]}
        leads={fallbackChatLeads}
        setupMessage="Lead database is not migrated yet. Run prisma generate and migrate deploy, then restart the dev server."
      />
    );
  }

  const [collections, leads] = await Promise.all([
    db.leadCollection.findMany({
      where: { active: true },
      orderBy: [{ createdAt: "desc" }],
      include: { _count: { select: { leads: true } } },
    }),
    db.lead.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: {
        collection: { select: { id: true, name: true } },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            type: true,
            subject: true,
            body: true,
            status: true,
            scheduledAt: true,
            completedAt: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  return (
    <LeadCrmShell
      collections={collections.map(
        (collection: any): LeadCollectionRow => ({
          id: collection.id,
          name: collection.name,
          description: collection.description,
          leadCount: collection._count.leads,
        })
      )}
      leads={[...fallbackChatLeads, ...leads.map(
        (lead: any): LeadRow => ({
          id: lead.id,
          collectionId: lead.collectionId,
          collectionName: lead.collection?.name ?? "No collection",
          name: lead.name,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          status: lead.status,
          value: lead.value ? Number(lead.value) : null,
          currency: lead.currency,
          tags: lead.tags,
          notes: lead.notes,
          nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
          lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
          updatedAt: lead.updatedAt.toISOString(),
          activities: lead.activities.map((activity: any) => ({
            id: activity.id,
            type: activity.type,
            subject: activity.subject,
            body: activity.body,
            status: activity.status,
            scheduledAt: activity.scheduledAt?.toISOString() ?? null,
            completedAt: activity.completedAt?.toISOString() ?? null,
            createdAt: activity.createdAt.toISOString(),
          })),
        })
      )]}
    />
  );
}
