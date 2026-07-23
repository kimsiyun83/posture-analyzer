"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import * as memberService from "@/lib/services/members";
import * as ptService from "@/lib/services/pt";
import * as pilatesService from "@/lib/services/pilates";
import * as stretchingService from "@/lib/services/stretching";
import type { Gender, PaymentMethod, PilatesEquipment, PilatesLevel, SessionType } from "@/lib/types";

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

export async function addExerciseLogAction(memberId: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const reps = Number(formData.get("reps"));
  const weightKg = Number(formData.get("weightKg"));
  await ptService.addExerciseLog({
    memberId,
    exerciseName: String(formData.get("exerciseName") ?? "").trim(),
    sets: [{ reps: Number.isFinite(reps) ? reps : 0, weightKg: Number.isFinite(weightKg) ? weightKg : undefined }],
    notes: String(formData.get("notes") ?? ""),
    trainerId: session.sub,
  });

  await writeAuditLog({ userId: session.sub, action: "exerciseLog.create", entityType: "Member", entityId: memberId });
  revalidatePath(`/members/${memberId}`);
}

export async function addPersonalRecordAction(memberId: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const value = Number(formData.get("value"));
  await ptService.addPersonalRecord({
    memberId,
    exerciseName: String(formData.get("exerciseName") ?? "").trim(),
    value: Number.isFinite(value) ? value : 0,
    unit: String(formData.get("unit") ?? "kg"),
  });

  await writeAuditLog({ userId: session.sub, action: "personalRecord.create", entityType: "Member", entityId: memberId });
  revalidatePath(`/members/${memberId}`);
}

export async function addPilatesRecordAction(memberId: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const exerciseName = String(formData.get("exerciseName") ?? "").trim();
  await pilatesService.addPilatesRecord({
    memberId,
    equipment: String(formData.get("equipment") ?? "REFORMER") as PilatesEquipment,
    level: String(formData.get("level") ?? "BEGINNER") as PilatesLevel,
    exercises: exerciseName ? [{ name: exerciseName }] : [],
    notes: String(formData.get("notes") ?? ""),
    trainerId: session.sub,
  });

  await writeAuditLog({ userId: session.sub, action: "pilatesRecord.create", entityType: "Member", entityId: memberId });
  revalidatePath(`/members/${memberId}`);
}

export async function addStretchLogAction(memberId: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const intensity = Number(formData.get("intensity"));
  const romBefore = Number(formData.get("romBefore"));
  const romAfter = Number(formData.get("romAfter"));
  const painBefore = Number(formData.get("painBefore"));
  const painAfter = Number(formData.get("painAfter"));
  await stretchingService.addStretchLog({
    memberId,
    bodyPart: String(formData.get("bodyPart") ?? "").trim(),
    intensity: Number.isFinite(intensity) ? intensity : 3,
    romBefore: Number.isFinite(romBefore) ? romBefore : undefined,
    romAfter: Number.isFinite(romAfter) ? romAfter : undefined,
    painBefore: Number.isFinite(painBefore) ? painBefore : undefined,
    painAfter: Number.isFinite(painAfter) ? painAfter : undefined,
    notes: String(formData.get("notes") ?? ""),
    trainerId: session.sub,
  });

  await writeAuditLog({ userId: session.sub, action: "stretchLog.create", entityType: "Member", entityId: memberId });
  revalidatePath(`/members/${memberId}`);
}
