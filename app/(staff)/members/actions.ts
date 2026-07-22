"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import * as memberService from "@/lib/services/members";
import type { Gender, PaymentMethod, SessionType } from "@/lib/types";

export async function createMemberAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("이름은 필수입니다.");

  const member = await memberService.createMember({
    name,
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    birthDate: String(formData.get("birthDate") ?? "") || undefined,
    gender: (String(formData.get("gender") ?? "") || undefined) as Gender | undefined,
    memo: String(formData.get("memo") ?? ""),
    medicalHistory: String(formData.get("medicalHistory") ?? ""),
    createdByUserId: session.sub,
  });

  await writeAuditLog({ userId: session.sub, action: "member.create", entityType: "Member", entityId: member.id });
  revalidatePath("/members");
  redirect(`/members/${member.id}`);
}

export async function updateMemberAction(memberId: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  await memberService.updateMember(memberId, {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    birthDate: String(formData.get("birthDate") ?? "") || undefined,
    gender: (String(formData.get("gender") ?? "") || undefined) as Gender | undefined,
    memo: String(formData.get("memo") ?? ""),
    medicalHistory: String(formData.get("medicalHistory") ?? ""),
  });

  await writeAuditLog({ userId: session.sub, action: "member.update", entityType: "Member", entityId: memberId });
  revalidatePath(`/members/${memberId}`);
}

export async function addPainRecordAction(memberId: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const severity = Number(formData.get("severity"));
  await memberService.addPainRecord({
    memberId,
    bodyPart: String(formData.get("bodyPart") ?? "").trim(),
    description: String(formData.get("description") ?? ""),
    severity: Number.isFinite(severity) ? severity : 5,
    recordedById: session.sub,
  });

  await writeAuditLog({ userId: session.sub, action: "painRecord.create", entityType: "Member", entityId: memberId });
  revalidatePath(`/members/${memberId}`);
}

export async function addPackageAction(memberId: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const totalSessions = Number(formData.get("totalSessions"));
  const price = Number(formData.get("price"));
  await memberService.addPackage({
    memberId,
    name: String(formData.get("name") ?? "").trim(),
    sessionType: String(formData.get("sessionType") ?? "PT") as SessionType | "MIXED",
    totalSessions: Number.isFinite(totalSessions) && totalSessions > 0 ? totalSessions : undefined,
    price: Number.isFinite(price) ? price : 0,
    endDate: String(formData.get("endDate") ?? "") || undefined,
  });

  await writeAuditLog({ userId: session.sub, action: "package.create", entityType: "Member", entityId: memberId });
  revalidatePath(`/members/${memberId}`);
}

export async function addPaymentAction(memberId: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const amount = Number(formData.get("amount"));
  const packageId = String(formData.get("packageId") ?? "");
  await memberService.addPayment({
    memberId,
    packageId: packageId || undefined,
    amount: Number.isFinite(amount) ? amount : 0,
    method: String(formData.get("method") ?? "CASH") as PaymentMethod,
    memo: String(formData.get("memo") ?? ""),
    recordedById: session.sub,
  });

  await writeAuditLog({ userId: session.sub, action: "payment.create", entityType: "Member", entityId: memberId });
  revalidatePath(`/members/${memberId}`);
}

export async function checkInAction(memberId: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const packageId = String(formData.get("packageId") ?? "");
  await memberService.checkIn({
    memberId,
    sessionType: String(formData.get("sessionType") ?? "PT") as SessionType,
    staffId: session.sub,
    packageId: packageId || undefined,
  });

  await writeAuditLog({ userId: session.sub, action: "attendance.checkIn", entityType: "Member", entityId: memberId });
  revalidatePath(`/members/${memberId}`);
}
