"use client";
import { useState } from "react";
import type { SessionData } from "@/lib/license";

export function useSession() {
  const [session, setSession] = useState<SessionData | null>(null);
  // ...session logic
  return { session, setSession };
}
