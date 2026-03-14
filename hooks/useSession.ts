"use client";
import { useState } from "react";

export function useSession() {
  const [session, setSession] = useState<any>(null);
  // ...session logic
  return { session, setSession };
}
