"use client";
import { useState } from "react";

export function useSponsorAd() {
  const [showSponsor, setShowSponsor] = useState(false);
  // ...sponsor logic
  return { showSponsor, setShowSponsor };
}
