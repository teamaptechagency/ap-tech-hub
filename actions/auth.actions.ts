"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { homeFor } from "@/lib/roles";

// ============================================
// LOGIN
// Returns { redirectTo } on success — the client
// component navigates (fresh session cookie applies)
// ============================================
export async function login(formData: { email: string; password: string }) {
  try {
    await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }

  // Look up the role directly for the redirect target
  const user = await prisma.user.findUnique({
    where: { email: formData.email },
    select: { role: true },
  });

  return { redirectTo: user ? homeFor(user.role) : "/login" };
}

// ============================================
// LOGOUT
// ============================================
export async function logout() {
  await signOut({ redirectTo: "/login" });
}