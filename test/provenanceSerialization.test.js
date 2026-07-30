import test from "node:test";
import assert from "node:assert/strict";
import {
    cloneProvenanceValue,
    normalizeSerializedProvenance,
    provenanceValuesEqual,
} from "../src/controllers/provenanceSerialization.js";

const options = {
    widgetId: "price",
    widgetType: "single-slider",
    mode: "interaction",
    sampleIntervalMs: 1000,
};

test("normalizes V1 data and unwraps the legacy single-slider value", () => {
    const time = new Date("2026-07-30T01:02:03.000Z");
    const legacy = {
        data: [
            { value: [25], timestamp: time },
            { value: [50], timestamp: "2026-07-30T01:02:04.000Z" },
        ],
        revalidate: true,
    };

    const result = normalizeSerializedProvenance(legacy, options);

    assert.deepEqual(result, {
        schemaVersion: 2,
        widgetId: "price",
        widgetType: "single-slider",
        mode: "interaction",
        sampleIntervalMs: 1000,
        data: [
            {
                value: 25,
                timestamp: "2026-07-30T01:02:03.000Z",
                source: "initial",
                kind: "baseline",
            },
            {
                value: 50,
                timestamp: "2026-07-30T01:02:04.000Z",
                source: "user",
                kind: "interaction",
            },
        ],
    });
    assert.deepEqual(legacy.data[0].value, [25]);
    assert.equal(legacy.data[0].timestamp, time);
});

test("normalizes the V1 selections format without changing array values", () => {
    const legacy = {
        selections: [
            {
                value: ["Cheese", "Beef"],
                timestamp: 1785373323000,
            },
        ],
    };

    const result = normalizeSerializedProvenance(legacy, {
        ...options,
        widgetId: "toppings",
        widgetType: "multiselect",
    });

    assert.deepEqual(result.data[0].value, ["Cheese", "Beef"]);
    assert.equal(result.data[0].timestamp, "2026-07-30T01:02:03.000Z");
});

test("normalizes V1 Range Slider history as low/high pairs", () => {
    const result = normalizeSerializedProvenance({
        data: [
            {
                value: [10, 40],
                timestamp: "2026-07-30T01:02:03.000Z",
            },
            {
                value: [20, 70],
                timestamp: "2026-07-30T01:02:04.000Z",
            },
        ],
    }, {
        ...options,
        widgetId: "price-range",
        widgetType: "range-slider",
    });

    assert.deepEqual(
        result.data.map(record => record.value),
        [[10, 40], [20, 70]]
    );
    assert.deepEqual(
        result.data.map(record => record.kind),
        ["baseline", "interaction"]
    );
});

test("creates a JSON-safe defensive copy of public provenance values", () => {
    const source = {
        range: [20, 40],
        nested: { enabled: true, ignored: undefined },
        date: new Date("2026-07-30T01:02:03.000Z"),
    };

    const cloned = cloneProvenanceValue(source);
    source.range[0] = 99;
    source.nested.enabled = false;

    assert.deepEqual(cloned, {
        range: [20, 40],
        nested: { enabled: true },
        date: "2026-07-30T01:02:03.000Z",
    });
    assert.deepEqual(JSON.parse(JSON.stringify(cloned)), cloned);
});

test("rejects invalid public provenance instead of silently corrupting it", () => {
    assert.throws(
        () => normalizeSerializedProvenance(
            { data: [{ value: 20, timestamp: "not-a-date" }] },
            options
        ),
        /Invalid provenance timestamp/
    );
    assert.throws(
        () => normalizeSerializedProvenance(
            { mode: "sometimes", data: [] },
            options
        ),
        /Unsupported provenance mode/
    );
    assert.throws(
        () => normalizeSerializedProvenance(
            { sampleIntervalMs: 0, data: [] },
            options
        ),
        /positive number/
    );
    assert.throws(
        () => normalizeSerializedProvenance(
            {
                schemaVersion: 2,
                widgetId: "city",
                widgetType: "dropdown",
                mode: "interaction",
                sampleIntervalMs: 1000,
                data: [],
            },
            options
        ),
        /Cannot restore dropdown provenance into a single-slider widget/
    );
    assert.throws(
        () => cloneProvenanceValue(new Map([["value", 20]])),
        /arrays or plain objects/
    );
    assert.throws(
        () => normalizeSerializedProvenance(
            {
                data: [{
                    value: [40, 20],
                    timestamp: "2026-07-30T01:02:03.000Z",
                }],
            },
            {
                ...options,
                widgetId: "price-range",
                widgetType: "range-slider",
            }
        ),
        /finite \[lowValue, highValue\] pairs/
    );
});

test("compares scalar, array, and object values structurally", () => {
    assert.equal(provenanceValuesEqual(20, 20), true);
    assert.equal(provenanceValuesEqual([20, 40], [20, 40]), true);
    assert.equal(provenanceValuesEqual([20, 40], [20, 50]), false);
    assert.equal(
        provenanceValuesEqual(
            { selected: ["a"], open: false },
            { open: false, selected: ["a"] }
        ),
        true
    );
});
