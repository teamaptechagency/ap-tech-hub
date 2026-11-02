import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { workstationAccess, sameOriginWrite, parseSetting } from "@/lib/workstation-access";
import { businessUnits, readOfficeProfile } from "@/lib/office-roles";
import { dhakaDay } from "@/lib/device-attendance";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store, private" } });
const unitSchema = z.enum(businessUnits);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const date = new Date(value + "T12:00:00+06:00"); return Number.isFinite(date.getTime()) && dhakaDay(date) === value; });
const form = z.discriminatedUnion("op", [
  z.object({ op: z.literal("case"), operationId: z.string().uuid(), unit: unitSchema, name: z.string().trim().min(1).max(100), phone: z.string().trim().max(40), service: z.string().trim().min(1).max(150), day: dateSchema, time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), note: z.string().trim().max(500), reference: z.string().trim().max(80) }).strict(),
  z.object({ op: z.literal("status"), operationId: z.string().uuid(), unit: unitSchema, id: z.string().uuid(), status: z.enum(["WAITING", "IN_PROGRESS", "DONE", "CANCELLED"]), reason: z.string().trim().min(1).max(300) }).strict(),
  z.object({ op: z.literal("money"), operationId: z.string().uuid(), unit: unitSchema, day: dateSchema, direction: z.enum(["INCOME", "EXPENSE"]), amount: z.string().regex(/^\d{1,9}(\.\d{1,2})?$/).refine(value => Number(value) > 0), currency: z.enum(["BDT", "USD", "SAR"]), category: z.string().trim().min(1).max(100), reference: z.string().trim().max(80), note: z.string().trim().max(500) }).strict(),
  z.object({ op: z.literal("salary"), operationId: z.string().uuid(), unit: unitSchema, day: dateSchema, employeeId: z.string().min(1).max(80), period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), amount: z.string().regex(/^\d{1,9}(\.\d{1,2})?$/).refine(value => Number(value) > 0), currency: z.enum(["BDT", "USD", "SAR"]), method: z.enum(["CASH", "BANK", "MOBILE_BANKING"]), reference: z.string().trim().max(80), note: z.string().trim().max(500) }).strict(),
  z.object({ op: z.literal("void"), operationId: z.string().uuid(), unit: unitSchema, id: z.string().uuid(), reason: z.string().trim().min(3).max(300) }).strict(),
  z.object({ op: z.literal("stock"), operationId: z.string().uuid(), unit: z.enum(["PHOTOCOPY", "KIDS_LEARNING"]), day: dateSchema, item: z.string().trim().min(1).max(100), direction: z.enum(["IN", "OUT"]), quantity: z.number().int().min(1).max(1000000), note: z.string().trim().min(1).max(300) }).strict(),
]);
function accessInfo(access: Awaited<ReturnType<typeof workstationAccess>>) {
  const role = access.employee ? access.officeProfile.role : "ADMIN";
  return { role, units: access.admin ? [...businessUnits] : access.officeProfile.units, finance: Boolean(access.employee && role === "ACCOUNTS"), service: Boolean(access.admin || access.employee && role !== "ACCOUNTS"), stock: Boolean(access.admin || access.employee && ["OPERATIONS", "MANAGER"].includes(role)) };
}
export async function GET(request: Request) {
  try {
    const access = await workstationAccess(request); if (!access.admin && !access.employee) return reply({ error: "Office login required" }, 401);
    const caps = accessInfo(access), params = new URL(request.url).searchParams, unit = params.get("unit") || caps.units[0];
    if (!caps.units.includes(unit as typeof businessUnits[number])) return reply({ error: "Business access denied" }, 403);
    const start = params.get("from") || dhakaDay(new Date()), end = params.get("to") || start;
    if (!dateSchema.safeParse(start).success || !dateSchema.safeParse(end).success || start > end || (Date.parse(end) - Date.parse(start)) / 86400000 > 366) return reply({ error: "Select a date range of at most 366 days" }, 400);
    const mode = params.get("view") || (caps.finance ? "money" : "case");
    if (mode === "hub") {
      if (!caps.finance || unit !== "AP_TECH") return reply({ error: "AP Tech financial history is Accounts only" }, 403);
      const range = { gte: new Date(start + "T00:00:00+06:00"), lt: new Date(new Date(end + "T00:00:00+06:00").getTime() + 86400000) };
      const [earnings, expenses] = await Promise.all([
        prisma.earning.findMany({ where: { createdAt: range }, select: { id: true, title: true, amountBdt: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 251 }),
        prisma.expense.findMany({ where: { createdAt: range }, select: { id: true, title: true, amountBdt: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 251 }),
      ]);
      const records = [...earnings.slice(0,250).map(row => ({ id: row.id, category: row.title, direction: "INCOME", amount: String(row.amountBdt), currency: "BDT", day: dhakaDay(row.createdAt), note: "Existing Hub earning · BDT equivalent", readOnly: true })), ...expenses.slice(0,250).map(row => ({ id: row.id, category: row.title, direction: "EXPENSE", amount: String(row.amountBdt), currency: "BDT", day: dhakaDay(row.createdAt), note: "Existing Hub expense · BDT equivalent", readOnly: true }))].sort((a,b)=>b.day.localeCompare(a.day));
      return reply({ ...caps, unit, view: mode, from: start, to: end, records, truncated: earnings.length > 250 || expenses.length > 250 });
    }
    if (!["case", "money", "stock"].includes(mode) || mode === "money" && !caps.finance || mode === "case" && !caps.service || mode === "stock" && !caps.stock) return reply({ error: "This role cannot view these records. Money is Accounts only." }, 403);
    const prefix = `office.${mode}.${unit}.`;
    // Date-first keys make bounded range reads efficient without loading other businesses.
    const rows = await prisma.setting.findMany({ where: { key: { gte: prefix + start + ".", lt: prefix + end + ".~" } }, orderBy: { key: "desc" }, take: 501 });
    const records = rows.slice(0, 500).map(row => parseSetting(row.value));
    const employees = caps.finance ? await prisma.deviceEmployee.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" }, take: 500 }) : [];
    const profiles = caps.finance ? await prisma.setting.findMany({ where: { key: { in: employees.map(employee => `workstation.profile.${employee.id}`) } } }) : [];
    const staff = employees.filter(employee => readOfficeProfile(profiles.find(row => row.key === `workstation.profile.${employee.id}`)?.value).units.includes(unit as typeof businessUnits[number]));
    return reply({ staff, ...caps, unit, view: mode, from: start, to: end, records, truncated: rows.length > 500 });
  } catch { return reply({ error: "Office records unavailable. Retry shortly." }, 503); }
}
export async function POST(request: Request) {
  try {
    if (!sameOriginWrite(request)) return reply({ error: "Cross-origin request denied" }, 403);
    const access = await workstationAccess(request); if (!access.admin && !access.employee) return reply({ error: "Office login required" }, 401);
    const raw = await request.text(); if (raw.length > 6000) return reply({ error: "Request too large" }, 413);
    let body; try { body = JSON.parse(raw); } catch { return reply({ error: "Invalid request" }, 400); }
    const parsed = form.safeParse(body); if (!parsed.success) return reply({ error: "Check required fields, date, amount and reference" }, 400);
    const data = parsed.data, caps = accessInfo(access);
    if (!caps.units.includes(data.unit)) return reply({ error: "Business access denied" }, 403);
    if ((data.op === "money" || data.op === "salary" || data.op === "void") && !caps.finance || (data.op === "case" || data.op === "status") && !caps.service || data.op === "stock" && !caps.stock) return reply({ error: "Money is Accounts only; your role cannot perform this action" }, 403);
    let salaryEmployee: { id: string; name: string } | null = null;
    if (data.op === "salary") {
      salaryEmployee = await prisma.deviceEmployee.findUnique({ where: { id: data.employeeId }, select: { id: true, name: true } });
      const profile = await prisma.setting.findUnique({ where: { key: `workstation.profile.${data.employeeId}` } });
      if (!salaryEmployee || !readOfficeProfile(profile?.value).units.includes(data.unit)) return reply({ error: "Employee is not assigned to this business" }, 400);
      if (data.method !== "CASH" && !data.reference) return reply({ error: "Bank or mobile payment reference is required" }, 400);
    }
    const actorId = access.employee?.id || access.admin!.id, actorName = access.employee?.name || access.admin!.name;
    const operationKey = `office.operation.${actorId}.${data.operationId}`;
    const fingerprint = createHash("sha256").update(JSON.stringify(data)).digest("hex");
    const previousOperation = await prisma.setting.findUnique({ where: { key: operationKey } });
    if (previousOperation) return parseSetting(previousOperation.value).fingerprint === fingerprint ? reply({ success: true, duplicate: true }) : reply({ error: "This request was already saved with different values. Refresh records, then start a new entry." }, 409);
    await prisma.$transaction(async tx => {
      const audit = { actorId, actorName, pcName: access.device?.pcName || null, at: new Date().toISOString() };
      if (data.op === "void" || data.op === "status") {
        const kind = data.op === "void" ? "money" : "case", prefix = `office.${kind}.${data.unit}.`;
        const row = await tx.setting.findFirst({ where: { AND: [{ key: { startsWith: prefix } }, { key: { endsWith: "." + data.id } }] } });
        if (!row) throw new Error("MISSING_RECORD");
        const record = parseSetting(row.value);
        if (data.op === "void" && record.voided) throw new Error("ALREADY_VOIDED");
        await tx.setting.update({ where: { key: row.key }, data: { value: JSON.stringify({ ...record, ...(data.op === "void" ? { voided: true, voidReason: data.reason } : { status: data.status }), updatedBy: audit }) } });
      } else {
        const id = randomUUID();
        const serialNumber = data.op === "case" ? await tx.setting.count({ where: { key: { startsWith: `office.case.${data.unit}.${data.day}.` } } }) + 1 : 0;
        // Ruqyah/front-desk records intentionally contain scheduling details, no diagnosis or medical history.
        const { operationId: _operation, op, ...fields } = data; void _operation;
        await tx.setting.create({ data: { key: `office.${op === "salary" ? "money" : op}.${data.unit}.${data.day}.${id}`, value: JSON.stringify({ id, ...fields, ...(op === "salary" ? { direction: "EXPENSE", category: "Salary payment", employeeName: salaryEmployee!.name, paymentType: "SALARY" } : {}), ...(op === "case" ? { status: "WAITING", serial: data.day.replaceAll("-", "") + "-" + String(serialNumber).padStart(3, "0") } : {}), createdBy: audit }) } });
      }
      await tx.setting.create({ data: { key: operationKey, value: JSON.stringify({ ...audit, fingerprint, op: data.op, unit: data.unit, ...(data.op === "void" || data.op === "status" ? { recordId: data.id, reason: data.reason, ...(data.op === "status" ? { status: data.status } : {}) } : {}) }) } });
    }, { isolationLevel: "Serializable" });
    return reply({ success: true });
  } catch (error) { return reply({ error: error instanceof Error && error.message === "MISSING_RECORD" ? "Record not found" : "Record changed or could not be saved. Refresh and retry; the request ID prevents duplicates." }, 409); }
}
