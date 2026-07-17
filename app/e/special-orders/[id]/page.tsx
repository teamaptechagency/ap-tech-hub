import { redirect } from "next/navigation";

export default async function EmployeeSpecialOrderRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/p/special-orders/${id}`);
}
