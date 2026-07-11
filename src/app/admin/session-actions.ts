"use server";

import { redirect } from "next/navigation";
import { deleteCurrentSession } from "@/lib/session";

export async function logoutAction() {
  await deleteCurrentSession();
  redirect("/");
}
