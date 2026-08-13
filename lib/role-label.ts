/**
 * What a role is called when someone outside the team reads it.
 *
 * The stored names describe permissions, which is the wrong thing to show a
 * partner or a client: "super admin" tells them how much access the person has
 * rather than what the person does for them. These say the job instead.
 */
const LABELS: Record<string, string> = {
  SUPER_ADMIN: "Project manager",
  ADMIN: "Project manager",
  CEO: "Director",
  TEAM_MEMBER: "Team member",
  CLIENT: "Client",
  CLIENT_MEMBER: "Client",
  BUSINESS_PARTNER: "Business partner",
  SO_PARTNER: "Special order partner",
  REFERRAL_PARTNER: "Referral partner",
};

export function roleLabel(role: string | null | undefined) {
  if (!role) return "";
  return (
    LABELS[role] ??
    // Anything not listed still reads as words rather than a constant.
    role
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}
