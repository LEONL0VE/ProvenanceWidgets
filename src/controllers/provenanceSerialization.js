export const PROVENANCE_SCHEMA_VERSION = 2;
export const DEFAULT_PROVENANCE_MODE = "interaction";
export const DEFAULT_SAMPLE_INTERVAL_MS = 1000;

const SUPPORTED_MODES = new Set(["interaction", "time"]);
const SUPPORTED_SOURCES = new Set([
    "initial",
    "user",
    "history",
    "external",
    "time",
]);
const SUPPORTED_KINDS = new Set(["baseline", "interaction", "sample"]);
const SUPPORTED_WIDGET_TYPES = new Set([
    "single-slider",
    "range-slider",
    "input-text",
    "dropdown",
    "multiselect",
    "radio-group",
    "checkbox-group",
]);

const assertObject = (value, message) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError(message);
    }
};

export const normalizeMode = (mode = DEFAULT_PROVENANCE_MODE) => {
    if (!SUPPORTED_MODES.has(mode)) {
        throw new TypeError(`Unsupported provenance mode: ${String(mode)}`);
    }
    return mode;
};

export const normalizeSampleInterval = (
    sampleIntervalMs = DEFAULT_SAMPLE_INTERVAL_MS
) => {
    const value = Number(sampleIntervalMs);
    if (!Number.isFinite(value) || value <= 0) {
        throw new TypeError("sampleIntervalMs must be a positive number");
    }
    return value;
};

export const normalizeTimestamp = (timestamp) => {
    const date = timestamp instanceof Date
        ? timestamp
        : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        throw new TypeError(`Invalid provenance timestamp: ${String(timestamp)}`);
    }

    return date.toISOString();
};

export const cloneProvenanceValue = (value, seen = new WeakSet()) => {
    if (
        value === null ||
        typeof value === "string" ||
        typeof value === "boolean"
    ) {
        return value;
    }

    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            throw new TypeError("Provenance values must contain finite numbers");
        }
        return value;
    }

    if (value instanceof Date) {
        return normalizeTimestamp(value);
    }

    if (Array.isArray(value)) {
        if (seen.has(value)) {
            throw new TypeError("Provenance values cannot contain cycles");
        }
        seen.add(value);
        const cloned = value.map(item => cloneProvenanceValue(item, seen));
        seen.delete(value);
        return cloned;
    }

    if (typeof value === "object") {
        if (seen.has(value)) {
            throw new TypeError("Provenance values cannot contain cycles");
        }
        if (value instanceof Map || value instanceof Set) {
            throw new TypeError(
                "Use arrays or plain objects for public provenance values"
            );
        }

        seen.add(value);
        const cloned = {};
        for (const [key, child] of Object.entries(value)) {
            if (child === undefined) continue;
            cloned[key] = cloneProvenanceValue(child, seen);
        }
        seen.delete(value);
        return cloned;
    }

    throw new TypeError(
        `Unsupported provenance value type: ${typeof value}`
    );
};

const normalizeLegacyValue = (value, widgetType) => {
    if (
        widgetType === "single-slider" &&
        Array.isArray(value) &&
        value.length === 1
    ) {
        return value[0];
    }
    if (widgetType === "range-slider") {
        if (
            !Array.isArray(value) ||
            value.length !== 2 ||
            !value.every(
                item =>
                    typeof item === "number" &&
                    Number.isFinite(item)
            ) ||
            value[0] >= value[1]
        ) {
            throw new TypeError(
                "Range slider provenance values must be " +
                "finite [lowValue, highValue] pairs with lowValue < highValue"
            );
        }
    }
    if (
        widgetType === "dropdown" ||
        widgetType === "radio-group"
    ) {
        if (Array.isArray(value)) {
            if (value.length > 1) {
                throw new TypeError(
                    "Single-selection provenance values must contain " +
                    "at most one selected key"
                );
            }
            return value[0] ?? null;
        }
    }
    return value;
};

export const normalizeProvenanceRecord = (
    record,
    {
        widgetType,
        defaultSource = "external",
        defaultKind = "interaction",
    }
) => {
    assertObject(record, "Each provenance record must be an object");
    if (!Object.prototype.hasOwnProperty.call(record, "value")) {
        throw new TypeError("Each provenance record must include a value");
    }

    const source = record.source ?? defaultSource;
    const kind = record.kind ?? defaultKind;

    if (!SUPPORTED_SOURCES.has(source)) {
        throw new TypeError(`Unsupported provenance source: ${String(source)}`);
    }
    if (!SUPPORTED_KINDS.has(kind)) {
        throw new TypeError(`Unsupported provenance record kind: ${String(kind)}`);
    }

    const normalized = {
        value: cloneProvenanceValue(
            normalizeLegacyValue(record.value, widgetType)
        ),
        timestamp: normalizeTimestamp(record.timestamp),
        source,
        kind,
    };

    if (record.caller !== undefined) {
        if (
            typeof record.caller !== "string" &&
            typeof record.caller !== "number"
        ) {
            throw new TypeError("Provenance record caller must be a string or number");
        }
        normalized.caller = record.caller;
    }

    return normalized;
};

export const normalizeSerializedProvenance = (
    provenance,
    {
        widgetId,
        widgetType,
        mode = DEFAULT_PROVENANCE_MODE,
        sampleIntervalMs = DEFAULT_SAMPLE_INTERVAL_MS,
    }
) => {
    if (typeof widgetId !== "string" || widgetId.length === 0) {
        throw new TypeError("A non-empty widgetId is required");
    }
    if (typeof widgetType !== "string" || widgetType.length === 0) {
        throw new TypeError("A non-empty widgetType is required");
    }
    if (!SUPPORTED_WIDGET_TYPES.has(widgetType)) {
        throw new TypeError(`Unsupported provenance widget type: ${widgetType}`);
    }

    const normalizedMode = normalizeMode(provenance?.mode ?? mode);
    const normalizedInterval = normalizeSampleInterval(
        provenance?.sampleIntervalMs ?? sampleIntervalMs
    );

    if (provenance === undefined || provenance === null) {
        return {
            schemaVersion: PROVENANCE_SCHEMA_VERSION,
            widgetId,
            widgetType,
            mode: normalizedMode,
            sampleIntervalMs: normalizedInterval,
            data: [],
        };
    }

    assertObject(provenance, "provenance must be an object");

    if (
        provenance.schemaVersion !== undefined &&
        provenance.schemaVersion !== PROVENANCE_SCHEMA_VERSION
    ) {
        throw new TypeError(
            `Unsupported provenance schema version: ${String(provenance.schemaVersion)}`
        );
    }

    const rawData = Array.isArray(provenance.data)
        ? provenance.data
        : Array.isArray(provenance.selections)
            ? provenance.selections
            : null;

    if (!rawData) {
        throw new TypeError(
            "provenance must include a data or selections array"
        );
    }

    const isV2 = provenance.schemaVersion === PROVENANCE_SCHEMA_VERSION;
    if (
        isV2 &&
        provenance.widgetType !== undefined &&
        provenance.widgetType !== widgetType
    ) {
        throw new TypeError(
            `Cannot restore ${String(provenance.widgetType)} provenance ` +
            `into a ${widgetType} widget`
        );
    }
    const effectiveWidgetType = isV2
        ? provenance.widgetType ?? widgetType
        : widgetType;
    const legacySingleSelectionWithoutBaseline =
        !isV2 &&
        (
            effectiveWidgetType === "dropdown" ||
            effectiveWidgetType === "radio-group"
        ) &&
        provenance.hasUserInteracted === true &&
        rawData.length === 1;

    return {
        schemaVersion: PROVENANCE_SCHEMA_VERSION,
        widgetId: isV2 ? provenance.widgetId ?? widgetId : widgetId,
        widgetType: effectiveWidgetType,
        mode: normalizedMode,
        sampleIntervalMs: normalizedInterval,
        data: rawData.map((record, index) => normalizeProvenanceRecord(record, {
            widgetType: effectiveWidgetType,
            defaultSource: isV2
                ? "external"
                : index === 0
                    ? "initial"
                    : "user",
            // V1 initializes provenance with the widget's starting value. It
            // is part of the temporal line, but does not enable the footprint.
            defaultKind: isV2
                ? "interaction"
                : index === 0 &&
                  !legacySingleSelectionWithoutBaseline
                    ? "baseline"
                    : "interaction",
        })),
    };
};

export const cloneSerializedProvenance = provenance => ({
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    widgetId: provenance.widgetId,
    widgetType: provenance.widgetType,
    mode: normalizeMode(provenance.mode),
    sampleIntervalMs: normalizeSampleInterval(provenance.sampleIntervalMs),
    data: provenance.data.map(record => ({
        ...record,
        value: cloneProvenanceValue(record.value),
    })),
});

export const provenanceValuesEqual = (left, right) => {
    if (Object.is(left, right)) return true;
    if (typeof left !== typeof right || left === null || right === null) {
        return false;
    }

    if (Array.isArray(left) || Array.isArray(right)) {
        return (
            Array.isArray(left) &&
            Array.isArray(right) &&
            left.length === right.length &&
            left.every((value, index) =>
                provenanceValuesEqual(value, right[index])
            )
        );
    }

    if (typeof left === "object") {
        const leftKeys = Object.keys(left);
        const rightKeys = Object.keys(right);
        return (
            leftKeys.length === rightKeys.length &&
            leftKeys.every(
                key =>
                    Object.prototype.hasOwnProperty.call(right, key) &&
                    provenanceValuesEqual(left[key], right[key])
            )
        );
    }

    return false;
};
