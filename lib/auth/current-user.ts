import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";

export async function getCurrentUser() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    redirect("/employee");
  }

  return user;
}

export async function requireEmployee() {
  const user = await requireUser();

  if (user.role !== "EMPLOYEE") {
    redirect("/admin");
  }

  return user;
}