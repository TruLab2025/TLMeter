/**
 * Agregacja danych metryki do aktualizacji profili stylów
 * Zbiera anonimowe metryki i oblicza percentyle dla każdego stylu
 */

import {
  MetricsRecord,
  ProfileAggregation,
  AnalysisMetrics,
  MetricPercentiles,
} from "./types";
import { calculatePercentiles, blendPercentiles } from "./percentiles";
import {
  getStyleProfile,
  updateProfileWithAggregation,
} from "./profiles";

/**
 * In-memory storage dla anonimowych rekordów
 * W produkcji byłoby to baza danych
 */
class MetricsStore {
  private records: MetricsRecord[] = [];
  private MAX_RECORDS = 10000; // Limit aby uniknąć memory leak

  add(record: MetricsRecord): void {
    this.records.push(record);

    // Trim jeśli przekroczymy limit
    if (this.records.length > this.MAX_RECORDS) {
      this.records = this.records.slice(-this.MAX_RECORDS);
    }
  }

  getByStyle(style: string): MetricsRecord[] {
    return this.records.filter(r => r.style === style);
  }

  getAllRecords(): MetricsRecord[] {
    return this.records;
  }

  clear(): void {
    this.records = [];
  }

  getTotalCount(): number {
    return this.records.length;
  }
}

const metricsStore = new MetricsStore();

/**
 * Przekonwertuj AnalysisMetrics do MetricsRecord
 * ANONIMIZACJA: Usuwa wszelkie identyfikowalne dane
 * 
 * Usuwa:
 * - filename (NIGDY nie wysyłamy nazwy pliku!)
 * - duration_seconds (może ujawnić szczegóły piosenki)
 * - sample_rate (może ujawnić sprzęt)
 * - user identifiers
 * 
 * Przesyła:
 * ✅ 19 metryk DSP (liczby)
 * ✅ Styl muzyki
 * ✅ Wersja algorytmu
 * ❌ Audio
 * ❌ Nazwa pliku
 * ❌ Metadane piosenki
 * ❌ ID użytkownika
 */
export function metricsToRecord(
  metrics: AnalysisMetrics,
  style: string
): MetricsRecord {
  // Strip all PII (Personally Identifiable Information)

  const record: MetricsRecord = {
    style,
    metrics: {
      lufs: metrics.lufs,
      true_peak: metrics.true_peak,
      momentary_loudness: metrics.momentary_loudness,
      low_ratio: metrics.low_ratio,
      low_mid_ratio: metrics.low_mid_ratio,
      mid_ratio: metrics.mid_ratio,
      mid_high_ratio: metrics.mid_high_ratio,
      high_ratio: metrics.high_ratio,
      stereo_correlation: metrics.stereo_correlation,
      stereo_width: metrics.stereo_width,
      spectral_centroid: metrics.spectral_centroid,
      spectral_spread: metrics.spectral_spread,
      spectral_tilt: metrics.spectral_tilt,
      low_mid_balance: metrics.low_mid_balance,
      presence_peak: metrics.presence_peak,
      transient_density: metrics.transient_density,
      crest_factor: metrics.crest_factor,
      harshness_index: metrics.harshness_index,
      brightness_index: metrics.brightness_index,
      warmth_index: metrics.warmth_index,
    },
    engine_version: metrics.engine_version,
    timestamp: Math.floor(Date.now() / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000), // Round to day for privacy
  };

  // SAFETY CHECK: Upewnij się że nie ma filename czy identyfikatorów
  if ((record as any).filename || (record as any).user_id || (record as any).artist || (record as any).title) {
    console.warn("⚠️ PII detected in metrics record - stripping");
    delete (record as any).filename;
    delete (record as any).user_id;
    delete (record as any).artist;
    delete (record as any).title;
  }

  return record;
}

/**
 * Dodaj metrykę do zbioru dla agregacji
 */
export function submitMetrics(
  metrics: AnalysisMetrics,
  style: string
): void {
  const record = metricsToRecord(metrics, style);
  metricsStore.add(record);
}

/**
 * Agreguj metryki dla danego stylu
 */
export function aggregateMetricsForStyle(
  style: string
): ProfileAggregation | null {
  const records = metricsStore.getByStyle(style);

  if (records.length === 0) {
    return null;
  }

  const metricCalculations: Record<
    string,
    {
      values: number[];
      percentiles: MetricPercentiles;
    }
  > = {};

  const engineVersions: Record<string, number> = {};

  // Oblicz percentyle dla każdej metryki
  records.forEach(record => {
    Object.entries(record.metrics).forEach(([metricName, value]) => {
      if (typeof value !== "number") return;

      if (!metricCalculations[metricName]) {
        metricCalculations[metricName] = { values: [], percentiles: {} as any };
      }

      metricCalculations[metricName].values.push(value);
    });

    // Śledź wersje
    engineVersions[record.engine_version] =
      (engineVersions[record.engine_version] || 0) + 1;
  });

  // Oblicz percentyle
  Object.entries(metricCalculations).forEach(([metricName, data]) => {
    try {
      data.percentiles = calculatePercentiles(data.values);
    } catch (e) {
      console.error(`Failed to calculate percentiles for ${metricName}:`, e);
    }
  });

  return {
    style,
    period: {
      start: Date.now() - 30 * 24 * 60 * 60 * 1000, // ostatnie 30 dni
      end: Date.now(),
    },
    total_records: records.length,
    metric_calculations: metricCalculations,
    engine_versions: engineVersions,
  };
}

/**
 * Aktualizuj profil stylu na podstawie agregacji
 * (Łączy curated + user data wg wag)
 */
export async function updateStyleProfileFromAggregation(
  style: string
): Promise<void> {
  const aggregation = aggregateMetricsForStyle(style);
  if (!aggregation) {
    console.warn(
      `No metrics to aggregate for style: ${style}`
    );
    return;
  }

  const profile = await getStyleProfile(style);
  if (!profile) {
    console.warn(`Profile not found for style: ${style}`);
    return;
  }

  // Nowe percentyle z user data
  const newUserPercentiles: Record<string, MetricPercentiles> = {};

  Object.entries(aggregation.metric_calculations).forEach(
    ([metricName, data]) => {
      newUserPercentiles[metricName] = data.percentiles;
    }
  );

  // Scalenie z curated (jeśli istnieją)
  const blendedPercentiles: Record<string, MetricPercentiles> = {};

  Object.entries(newUserPercentiles).forEach(([metricName, userPercentiles]) => {
    const curatedPercentiles =
      profile.metrics[metricName as keyof typeof profile.metrics];

    if (curatedPercentiles && curatedPercentiles.count > 0) {
      // Scale obydwa źródła
      blendedPercentiles[metricName] = blendPercentiles(
        curatedPercentiles as MetricPercentiles,
        userPercentiles,
        profile.curated_weight
      );
    } else {
      // Tylko user data dostępna
      blendedPercentiles[metricName] = userPercentiles;
    }
  });

  // Zaktualizuj profil
  updateProfileWithAggregation(style, blendedPercentiles);

  console.log(
    `Updated profile for ${style} with ${aggregation.total_records} records`
  );
}

/**
 * Agreguj wszystkie style
 */
export async function aggregateAllStyles(): Promise<void> {
  const styles = metricsStore
    .getAllRecords()
    .map(r => r.style)
    .filter((v, i, a) => a.indexOf(v) === i);

  for (const style of styles) {
    await updateStyleProfileFromAggregation(style);
  }
}

/**
 * Pobierz statystykę agregacji
 */
export function getAggregationStats(): {
  total_records: number;
  records_by_style: Record<string, number>;
} {
  const records = metricsStore.getAllRecords();
  const recordsByStyle: Record<string, number> = {};

  records.forEach(r => {
    recordsByStyle[r.style] = (recordsByStyle[r.style] || 0) + 1;
  });

  return {
    total_records: records.length,
    records_by_style: recordsByStyle,
  };
}

/**
 * Debug: clearuj wszystkie czy się
 */
export function clearMetricsStore(): void {
  metricsStore.clear();
}

/**
 * Debug: Pobierz surowe rekordy (tylko do testów!)
 */
export function getMetricsStoreDebug() {
  return metricsStore.getAllRecords();
}
