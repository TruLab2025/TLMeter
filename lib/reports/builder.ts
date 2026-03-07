import type { Plan } from "@/lib/license";
import { generateCoreJsonReport, generateFreeJsonReport, generateLiteJsonReport, generateProJsonReport, generatePremiumJsonReport } from "@/lib/reports/core-metrics";
import { generateRawJsonReport } from "@/lib/reports/raw-builder";
import type { CoreJsonReport, RawAnalysisResult, RawJsonReport, PublicJsonReport } from "@/lib/reports/types";

export function generateRawDspDump(raw: RawAnalysisResult, style: string, plan: Plan): RawJsonReport {
  return generateRawJsonReport({ raw, plan, style });
}

export function generateCoreReportFromRaw(rawReport: RawJsonReport, style: string, plan: Plan): CoreJsonReport {
  return generateCoreJsonReport({ raw: rawReport, plan, style });
}

export function generateCoreReportFromAnalysis(raw: RawAnalysisResult, style: string, plan: Plan): CoreJsonReport {
  const rawReport = generateRawDspDump(raw, style, plan);
  return generateCoreReportFromRaw(rawReport, style, plan);
}

// ============================================================================
// Plan-specific Report Generation (NEW)
// ============================================================================

export function generatePublicReportFromAnalysis(raw: RawAnalysisResult, style: string, plan: Plan): PublicJsonReport {
  const rawReport = generateRawDspDump(raw, style, plan);
  
  switch (plan) {
    case "free":
      return generateFreeJsonReport({ raw: rawReport, style });
    case "lite":
      return generateLiteJsonReport({ raw: rawReport, style });
    case "pro":
      return generateProJsonReport({ raw: rawReport, style });
    case "premium":
      return generatePremiumJsonReport({ raw: rawReport, style });
    default:
      return generateFreeJsonReport({ raw: rawReport, style });
  }
}
