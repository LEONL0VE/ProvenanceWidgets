export type ProvenanceMode = "interaction" | "time";

export type ProvenanceView = "default" | "aggregate" | "temporal";

export type ProvenanceChangeSource =
  | "initial"
  | "user"
  | "history"
  | "external"
  | "time";

export type ProvenanceRecordKind = "baseline" | "interaction" | "sample";

export type ProvenanceWidgetType =
  | "single-slider"
  | "range-slider"
  | "input-text"
  | "dropdown"
  | "multiselect"
  | "radio-group"
  | "checkbox-group";

export interface SerializedProvenanceRecord<V> {
  value: V;
  timestamp: string;
  source: ProvenanceChangeSource;
  kind: ProvenanceRecordKind;
  caller?: string | number;
}

/**
 * Public, JSON-safe provenance exchange format for V2.
 *
 * Aggregate statistics are intentionally not serialized. They are derived
 * from `data` when provenance is restored, following V1's `revalidate`
 * behavior.
 */
export interface SerializedProvenance<V> {
  schemaVersion: 2;
  widgetId: string;
  widgetType: ProvenanceWidgetType;
  mode: ProvenanceMode;
  sampleIntervalMs: number;
  data: SerializedProvenanceRecord<V>[];
}

export interface LegacyProvenanceRecord<V> {
  value: V;
  timestamp: Date | string | number;
}

/**
 * Minimal V1 formats accepted by the V2 compatibility adapter.
 *
 * Sliders and input text use `data`; selection widgets use `selections`.
 */
export type LegacySerializedProvenance<V> =
  | {
      data: LegacyProvenanceRecord<V>[];
      revalidate?: boolean;
    }
  | {
      selections: LegacyProvenanceRecord<V>[];
      revalidate?: boolean;
    };

export interface ProvenanceChangeMeta<V> {
  source: ProvenanceChangeSource;
  record: SerializedProvenanceRecord<V>;
}

export interface CommonProvenanceWidgetProps<V> {
  id: string;
  provenance?: SerializedProvenance<V> | LegacySerializedProvenance<V>;
  onProvenanceChange?: (
    provenance: SerializedProvenance<V>,
    meta: ProvenanceChangeMeta<V>
  ) => void;
  mode?: ProvenanceMode;
  sampleIntervalMs?: number;
  freeze?: boolean;
  visualize?: boolean;
  dataLabel?: string;
  "data-label"?: string;
}

export interface WidgetRegistration<V> {
  id: string;
  type: ProvenanceWidgetType;
  provenance: unknown;
  getProvenance?: () => SerializedProvenance<V>;
  getValue: () => V;
  setValue: (value: V, source: ProvenanceChangeSource) => boolean | void;
  visualize?: boolean;
  mode?: ProvenanceMode;
  focus?: () => void;
  element?: HTMLElement | null;
  elementRef?: { current: HTMLElement | null };
}
