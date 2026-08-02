"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { deleteAdminDrugSnapshot, refreshAdminDrugSnapshot } from "@/lib/admin/cache-admin";
import { requireAdminUser } from "@/lib/auth/admin";

function slugFrom(formData: FormData) {
  const value = formData.get("slug");
  return typeof value === "string" ? value : "";
}

export async function refreshSnapshotAction(formData: FormData) {
  await requireAdminUser();
  await refreshAdminDrugSnapshot(slugFrom(formData));
  revalidatePath("/admin");
  redirect("/admin?notice=refreshed");
}

export async function deleteSnapshotAction(formData: FormData) {
  await requireAdminUser();
  const deleted = await deleteAdminDrugSnapshot(slugFrom(formData));
  revalidatePath("/admin");
  redirect(`/admin?notice=${deleted ? "deleted" : "not-found"}`);
}
