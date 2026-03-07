/**
 * Przykłady i testy dla systemu kalibracji
 * Pokazuje jak używać všech modułów
 */

import {
  getStyleProfile,
  analyzeAndDiagnose,
  recordAnalysis,
  getAggregationStats,
  calculatePercentiles,
  getAvailableStyles,
  clearMetricsStore,
} from "./index";
import type { AnalysisMetrics } from "./types";

/**
 * Przykład 1: Pobierz profil stylu
 */
export async function example1_getProfile() {
  console.log("\n=== Example 1: Get Style Profile ===");

  const profile = await getStyleProfile("rock");

  if (profile) {
    console.log(`Style: ${profile.display_name}`);
    console.log(`Description: ${profile.description}`);
    console.log(`Total samples: ${profile.total_samples}`);
    console.log(`LUFS percentiles:`, profile.metrics.lufs);
  }
}

/**
 * Przykład 2: Zdiagnozuj miks
 */
export async function example2_diagnoseMix() {
  console.log("\n=== Example 2: Diagnose a Mix ===");

  // Metryki przykładowego mixu
  const metrics: AnalysisMetrics = {
    // Głośność
    lufs: -8.5,
    true_peak: -1.2,
    momentary_loudness: -5.8,

    // Spektrum
    low_ratio: 0.25,
    low_mid_ratio: 0.18,
    mid_ratio: 0.32,
    mid_high_ratio: 0.16,
    high_ratio: 0.11,

    // Stereo
    stereo_correlation: 0.42,
    stereo_width: 0.89,

    // Spektralne
    spectral_centroid: 2500,
    spectral_spread: 4200,
    spectral_tilt: -0.5,

    // Equalizacja
    low_mid_balance: 1.39,
    presence_peak: 2.1,

    // Dynamika
    transient_density: 15.3,
    crest_factor: 8.2,

    // Psychoakustyka
    harshness_index: 38,
    brightness_index: 42,
    warmth_index: 55,

    // Metadata
    engine_version: "1.0",
    sample_rate: 44100,
    duration_seconds: 180,
    analysis_timestamp: Date.now(),
  };

  const diagnosis = await analyzeAndDiagnose(metrics, "rock");

  if (diagnosis) {
    console.log(`\nStyle: ${diagnosis.style}`);
    console.log(`Overall Score: ${diagnosis.overall_score}/100`);
    console.log(`\nIssues:`);
    diagnosis.issues.forEach(issue => {
      console.log(
        `  - [${issue.severity.toUpperCase()}] ${issue.title}`
      );
      console.log(`    ${issue.description}`);
    });

    console.log(`\nStrengths:`);
    diagnosis.strengths.forEach(s => console.log(`  + ${s}`));

    console.log(`\nDAW Tips:`);
    diagnosis.daw_tips.forEach(tip => {
      console.log(`  - ${tip.problem}`);
      console.log(`    Tool: ${tip.tool}, Freq: ${tip.frequency}`);
      console.log(`    Action: ${tip.action}`);
    });
  }
}

/**
 * Przykład 3: Wyślij metrykę do agregacji
 */
export async function example3_submitMetrics() {
  console.log("\n=== Example 3: Submit Metrics for Aggregation ===");

  // Clearing for clean test
  clearMetricsStore();

  // Kilka sample metryk
  const samples = [
    { style: "rock", lufs: -9.2, harshness_index: 35 },
    { style: "rock", lufs: -8.8, harshness_index: 40 },
    { style: "rock", lufs: -9.5, harshness_index: 32 },
    { style: "metal", lufs: -9.0, harshness_index: 45 },
    { style: "metal", lufs: -8.5, harshness_index: 50 },
  ];

  for (const sample of samples) {
    const metrics: AnalysisMetrics = {
      lufs: sample.lufs,
      true_peak: -1.0,
      momentary_loudness: -6.2,
      low_ratio: 0.24,
      low_mid_ratio: 0.18,
      mid_ratio: 0.32,
      mid_high_ratio: 0.16,
      high_ratio: 0.11,
      stereo_correlation: 0.5,
      stereo_width: 0.88,
      spectral_centroid: 2400,
      spectral_spread: 4000,
      spectral_tilt: -0.5,
      low_mid_balance: 1.33,
      presence_peak: 2.0,
      transient_density: 14.5,
      crest_factor: 8.0,
      harshness_index: sample.harshness_index,
      brightness_index: 40,
      warmth_index: 50,
      engine_version: "1.0",
      sample_rate: 44100,
      duration_seconds: 180,
      analysis_timestamp: Date.now(),
    };

    await recordAnalysis(metrics, sample.style);
  }

  const stats = getAggregationStats();
  console.log(`\nTotal records: ${stats.total_records}`);
  console.log("Records by style:", stats.records_by_style);
}

/**
 * Przykład 4: Oblicz percentyle
 */
export function example4_calculatePercentiles() {
  console.log("\n=== Example 4: Calculate Percentiles ===");

  const lufsValues = [-9.2, -8.8, -9.5, -8.9, -10.1, -8.5, -9.3, -8.7, -9.0, -9.4];

  const percentiles = calculatePercentiles(lufsValues);

  console.log("LUFS Values:", lufsValues);
  console.log("\nPercentiles:");
  console.log(`  p10: ${percentiles.p10.toFixed(2)}`);
  console.log(`  p25: ${percentiles.p25.toFixed(2)}`);
  console.log(`  p50 (median): ${percentiles.p50.toFixed(2)}`);
  console.log(`  p75: ${percentiles.p75.toFixed(2)}`);
  console.log(`  p90: ${percentiles.p90.toFixed(2)}`);
  console.log(`  mean: ${percentiles.mean.toFixed(2)}`);
  console.log(`  std_dev: ${percentiles.std_dev.toFixed(3)}`);
  console.log(`  count: ${percentiles.count}`);
}

/**
 * Przykład 5: Dostępne style
 */
export function example5_availableStyles() {
  console.log("\n=== Example 5: Available Styles ===");

  const styles = getAvailableStyles();
  console.log("Available styles:");
  styles.forEach(style => console.log(`  - ${style}`));
}

/**
 * Uruchom wszystkie przykłady
 */
export async function runAllExamples() {
  try {
    await example1_getProfile();
    await example2_diagnoseMix();
    await example3_submitMetrics();
    example4_calculatePercentiles();
    example5_availableStyles();

    console.log("\n=== All examples completed ===\n");
  } catch (error) {
    console.error("Error running examples:", error);
  }
}

/**
 * Test integracyjny
 */
export async function integrationTest() {
  console.log("\n=== Integration Test ===\n");

  // Wyczyść
  clearMetricsStore();

  // 1. Obsłużyć profile
  const rockProfile = await getStyleProfile("rock");
  console.log("✓ Rock profile loaded");

  // 2. Zdiagnozuj miks
  const testMetrics: AnalysisMetrics = {
    lufs: -9.0,
    true_peak: -1.0,
    momentary_loudness: -6.0,
    low_ratio: 0.24,
    low_mid_ratio: 0.18,
    mid_ratio: 0.32,
    mid_high_ratio: 0.16,
    high_ratio: 0.12,
    stereo_correlation: 0.45,
    stereo_width: 0.88,
    spectral_centroid: 2500,
    spectral_spread: 4200,
    spectral_tilt: -0.5,
    low_mid_balance: 1.33,
    presence_peak: 2.0,
    transient_density: 15.0,
    crest_factor: 8.0,
    harshness_index: 35,
    brightness_index: 40,
    warmth_index: 50,
    engine_version: "1.0",
    sample_rate: 44100,
    duration_seconds: 180,
    analysis_timestamp: Date.now(),
  };

  const diagnosis = await analyzeAndDiagnose(testMetrics, "rock");
  console.log(`✓ Diagnosis completed (score: ${diagnosis?.overall_score})`);

  // 3. Wyślij metryki
  await recordAnalysis(testMetrics, "rock");
  console.log("✓ Metrics recorded");

  // 4. Sprawdź agregację
  const stats = getAggregationStats();
  console.log(`✓ Aggregation stats: ${stats.total_records} records`);

  console.log("\n=== Integration test passed ===\n");
}
