"use client";
import { useState } from "react";
import type { SectionResult } from "@/lib/analyze/report-sections";

export function useAnalysisResults() {
  const [sections, setSections] = useState<SectionResult[]>([]);
  // ...results logic
  return { sections, setSections };
}
