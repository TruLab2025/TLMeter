"use client";
import { useState } from "react";

export function useAnalysisResults() {
  const [sections, setSections] = useState<any[]>([]);
  // ...results logic
  return { sections, setSections };
}
