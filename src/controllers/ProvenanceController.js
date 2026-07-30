import {
    DEFAULT_PROVENANCE_MODE,
    DEFAULT_SAMPLE_INTERVAL_MS,
    cloneProvenanceValue,
    cloneSerializedProvenance,
    normalizeMode,
    normalizeSampleInterval,
    normalizeSerializedProvenance,
    normalizeTimestamp,
    provenanceValuesEqual,
} from "./provenanceSerialization.js";

const defaultScheduler = {
    setInterval: (callback, interval) => globalThis.setInterval(callback, interval),
    clearInterval: intervalId => globalThis.clearInterval(intervalId),
};

const validInteractionSources = new Set(["user", "history", "external"]);

/**
 * Framework-independent controller shared by every provenance-aware widget.
 *
 * React components use the hook wrapper in `useProvenanceController.js`;
 * Web Components can use this class directly.
 */
export default class ProvenanceController {
    constructor({
        id,
        widgetType,
        value,
        provenance,
        mode = DEFAULT_PROVENANCE_MODE,
        sampleIntervalMs = DEFAULT_SAMPLE_INTERVAL_MS,
        freeze = false,
        visualize = true,
        onProvenanceChange,
        strategy,
        strategyFactory,
        now = () => new Date(),
        scheduler = defaultScheduler,
        valuesEqual = provenanceValuesEqual,
        autoStart = true,
    }) {
        if (typeof id !== "string" || id.length === 0) {
            throw new TypeError("A non-empty widget id is required");
        }
        if (typeof widgetType !== "string" || widgetType.length === 0) {
            throw new TypeError("A non-empty widgetType is required");
        }

        this.id = id;
        this.widgetType = widgetType;
        this.mode = normalizeMode(mode);
        this.sampleIntervalMs = normalizeSampleInterval(sampleIntervalMs);
        this.freeze = Boolean(freeze);
        this.visualize = Boolean(visualize);
        this.view = "default";
        this.onProvenanceChange = onProvenanceChange;
        this.now = now;
        this.scheduler = scheduler;
        this.valuesEqual = valuesEqual;
        this.strategyFactory = strategyFactory;
        this.strategy = strategy;
        this.currentValue = value === undefined
            ? undefined
            : cloneProvenanceValue(value);
        this.listeners = new Set();
        this.intervalId = null;
        this.disposed = false;
        this.active = Boolean(autoStart);

        const normalized = normalizeSerializedProvenance(provenance, {
            widgetId: id,
            widgetType,
            mode: this.mode,
            sampleIntervalMs: this.sampleIntervalMs,
        });
        this.history = normalized.data;

        if (this.history.length > 0) {
            this.currentValue = cloneProvenanceValue(
                this.history.at(-1).value
            );
        } else if (this.currentValue !== undefined) {
            this.history.push(this._createRecord(this.currentValue, {
                source: "initial",
                time: this.now(),
                kind: "baseline",
            }));
        }

        this._rebuildStrategy();
        if (this.visualize && this.hasInteractions()) {
            this.view = "aggregate";
        }
        this._syncSampling();
    }

    hasInteractions() {
        return this.history.some(record => record.kind === "interaction");
    }

    getSnapshot() {
        return {
            id: this.id,
            widgetType: this.widgetType,
            mode: this.mode,
            sampleIntervalMs: this.sampleIntervalMs,
            freeze: this.freeze,
            visualize: this.visualize,
            view: this.view,
            currentValue: this.currentValue === undefined
                ? undefined
                : cloneProvenanceValue(this.currentValue),
            hasProvenance: this.hasInteractions(),
            provenance: this.exportProvenance(),
            strategy: this.strategy,
        };
    }

    exportProvenance() {
        return cloneSerializedProvenance({
            schemaVersion: 2,
            widgetId: this.id,
            widgetType: this.widgetType,
            mode: this.mode,
            sampleIntervalMs: this.sampleIntervalMs,
            data: this.history,
        });
    }

    subscribe(listener) {
        if (typeof listener !== "function") {
            throw new TypeError("A provenance subscriber must be a function");
        }
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    setCurrentValue(value) {
        if (this.valuesEqual(this.currentValue, value)) return false;
        this.currentValue = cloneProvenanceValue(value);
        this._notify();
        return true;
    }

    recordInteraction(
        value,
        {
            source = "user",
            caller,
            time = this.now(),
        } = {}
    ) {
        if (!validInteractionSources.has(source)) {
            throw new TypeError(
                `recordInteraction does not accept source: ${String(source)}`
            );
        }

        const changed = !this.valuesEqual(this.currentValue, value);
        this.currentValue = cloneProvenanceValue(value);

        if (!changed || this.freeze) {
            this._notify();
            return false;
        }

        const record = this._createRecord(value, {
            source,
            caller,
            time,
            kind: "interaction",
        });
        this.history.push(record);
        this._insertIntoStrategy(record);

        if (this.mode === "time") {
            this.history.push(this._createRecord(value, {
                source: "time",
                time,
                kind: "sample",
            }));
        }

        if (this.visualize) {
            this.view = "aggregate";
        }
        this._syncSampling();
        this._notify();
        this._emitProvenanceChange(record);
        return true;
    }

    recordExternalChange(value, options = {}) {
        return this.recordInteraction(value, {
            ...options,
            source: "external",
        });
    }

    restoreValue(value, options = {}) {
        return this.recordInteraction(value, {
            ...options,
            source: "history",
        });
    }

    replaceProvenance(provenance, { emit = false } = {}) {
        const normalized = normalizeSerializedProvenance(provenance, {
            widgetId: this.id,
            widgetType: this.widgetType,
            mode: this.mode,
            sampleIntervalMs: this.sampleIntervalMs,
        });

        this.mode = normalized.mode;
        this.sampleIntervalMs = normalized.sampleIntervalMs;
        this.history = normalized.data;
        if (this.history.length > 0) {
            this.currentValue = cloneProvenanceValue(
                this.history.at(-1).value
            );
        }

        this._rebuildStrategy();
        this.view = this.visualize && this.hasInteractions()
            ? "aggregate"
            : "default";
        this._syncSampling();
        this._notify();

        if (emit && this.history.length > 0) {
            const record = this.history.at(-1);
            this._emitProvenanceChange(record);
        }
        return this.exportProvenance();
    }

    setOptions({
        mode = this.mode,
        sampleIntervalMs = this.sampleIntervalMs,
        freeze = this.freeze,
        visualize = this.visualize,
        onProvenanceChange = this.onProvenanceChange,
    } = {}) {
        const nextMode = normalizeMode(mode);
        const nextInterval = normalizeSampleInterval(sampleIntervalMs);
        const samplingChanged =
            nextMode !== this.mode ||
            nextInterval !== this.sampleIntervalMs ||
            Boolean(freeze) !== this.freeze;

        this.mode = nextMode;
        this.sampleIntervalMs = nextInterval;
        this.freeze = Boolean(freeze);
        this.visualize = Boolean(visualize);
        this.onProvenanceChange = onProvenanceChange;

        if (!this.visualize) {
            this.view = "default";
        } else if (this.hasInteractions() && this.view === "default") {
            this.view = "aggregate";
        }

        if (samplingChanged) {
            this._syncSampling();
        }
        this._notify();
    }

    toggleView() {
        if (!this.visualize || !this.hasInteractions()) {
            this.view = "default";
            this._notify();
            return this.view;
        }

        this.view = this.view === "aggregate"
            ? "temporal"
            : "aggregate";
        this._notify();
        return this.view;
    }

    start() {
        if (this.disposed) {
            throw new Error("A disposed ProvenanceController cannot be started");
        }
        this.active = true;
        this._syncSampling();
    }

    stop() {
        this.active = false;
        this._stopSampling();
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.stop();
        this.listeners.clear();
    }

    _createRecord(value, { source, caller, time, kind }) {
        const record = {
            value: cloneProvenanceValue(value),
            timestamp: normalizeTimestamp(time),
            source,
            kind,
        };
        if (caller !== undefined) record.caller = caller;
        return record;
    }

    _rebuildStrategy() {
        if (this.strategyFactory) {
            this.strategy = this.strategyFactory();
        }
        if (!this.strategy?.insert) return;

        for (const record of this.history) {
            if (record.kind === "sample") continue;
            this._insertIntoStrategy(record);
        }
    }

    _insertIntoStrategy(record) {
        if (!this.strategy?.insert) return;
        this.strategy.insert(cloneProvenanceValue(record.value), {
            time: new Date(record.timestamp),
            caller: record.caller,
            source: record.source,
            kind: record.kind,
        });
    }

    _sampleCurrentValue() {
        if (
            this.disposed ||
            !this.active ||
            this.freeze ||
            this.mode !== "time" ||
            this.currentValue === undefined ||
            !this.hasInteractions()
        ) {
            return;
        }

        const sample = this._createRecord(this.currentValue, {
            source: "time",
            time: this.now(),
            kind: "sample",
        });

        if (this.history.at(-1)?.kind === "sample") {
            this.history[this.history.length - 1] = sample;
        } else {
            this.history.push(sample);
        }
        this._notify();
    }

    _syncSampling() {
        this._stopSampling();
        if (
            this.disposed ||
            !this.active ||
            this.freeze ||
            this.mode !== "time" ||
            !this.hasInteractions()
        ) {
            return;
        }

        this.intervalId = this.scheduler.setInterval(
            () => this._sampleCurrentValue(),
            this.sampleIntervalMs
        );
    }

    _stopSampling() {
        if (this.intervalId === null) return;
        this.scheduler.clearInterval(this.intervalId);
        this.intervalId = null;
    }

    _emitProvenanceChange(record) {
        this.onProvenanceChange?.(this.exportProvenance(), {
            source: record.source,
            record: {
                ...record,
                value: cloneProvenanceValue(record.value),
            },
        });
    }

    _notify() {
        for (const listener of this.listeners) listener();
    }
}
