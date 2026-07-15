import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/roles";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect(homeFor(session.user.role));
  redirect("/login");
}