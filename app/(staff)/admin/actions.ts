"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createStaffAccount, setStaffActive } from "@/lib/services/admin";
import type { Role } from "@/lib/auth";

export async function createStaffAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "trainer") as Role;

  if (!email || !password || !name) throw new Error("이메일, 비밀번호, 이름은 필수입니다.");
  if (password.length < 8) throw new Error("비밀번호는 8자 이상이어야 합니다.");

  const staff = await createStaffAccount({
    email,
    password,
    name,
    role,
    specialty: String(formData.get("specialty") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });

  await writeAuditLog({ userId: session.sub, action: "staff.create", entityType: "User", entityId: staff.id });
  revalidatePath("/admin");
}

export async function toggleStaffActiveAction(userId: string, active: boolean) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");

  await setStaffActive(userId, active);
  await writeAuditLog({ userId: session.sub, action: active ? "staff.activate" : "staff.deactivate", entityType: "User", entityId: userId });
  revalidatePath("/admin");
}
