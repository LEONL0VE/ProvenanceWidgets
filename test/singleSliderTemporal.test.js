import test from "node:test";
import assert from "node:assert/strict";
import {
    brushSelectionToIndexRange,
    brushSelectionToPositionRange,
    filterTemporalEntries,
    getTemporalYPositions,
    normalizeTemporalBrush,
    restoreTemporalPoint,
} from "../src/components/singleSliderTemporal.js";

test("maps a PW-style vertical brush to an inclusive interaction range", () => {
    assert.deepEqual(
        brushSelectionToIndexRange([50, 150], 200, 8),
        [2, 5]
    );
    assert.deepEqual(
        brushSelectionToIndexRange([199, 200], 200, 8),
        [7, 7]
    );
    assert.equal(
        brushSelectionToIndexRange(null, 200, 8),
        null
    );
});

test("keeps Temporal brush opt-in and hidden by default", () => {
    assert.equal(normalizeTemporalBrush(undefined), false);
    assert.equal(normalizeTemporalBrush(false), false);
    assert.equal(normalizeTemporalBrush(true), true);
});

test("maps a time-mode brush through visible timestamp positions", () => {
    assert.deepEqual(
        brushSelectionToPositionRange([40, 170], [8, 58, 108, 208]),
        [1, 2]
    );
});

test("zooms temporal entries to the brushed interaction range", () => {
    const entries = ["a", "b", "c", "d", "e"];
    assert.deepEqual(
        filterTemporalEntries(entries, [1, 3]),
        ["b", "c", "d"]
    );
    assert.equal(filterTemporalEntries(entries, null), entries);
});

test("positions time mode records by elapsed time rather than row number", () => {
    const entry = (label, timestamp) => [
        label,
        [{
            time: new Date(timestamp),
            select: { time: new Date(timestamp) },
        }],
    ];
    const entries = [
        entry("a", "2026-07-30T00:00:00.000Z"),
        entry("b", "2026-07-30T00:00:01.000Z"),
        entry("c", "2026-07-30T00:00:04.000Z"),
    ];

    assert.deepEqual(
        getTemporalYPositions(entries, "interaction", 216),
        [8, 108, 208]
    );
    assert.deepEqual(
        getTemporalYPositions(entries, "time", 216),
        [8, 58, 208]
    );
});

test("restores a clicked Temporal point through the widget registration", () => {
    const calls = [];
    const restored = restoreTemporalPoint({
        restoreWidgetValue: (...args) => {
            calls.push(args);
            return true;
        },
        target: "price-filter-with-custom-id",
        record: {
            value: 40,
            select: { index: 40 },
        },
    });

    assert.equal(restored, true);
    assert.deepEqual(calls, [[
        "price-filter-with-custom-id",
        40,
        "history",
    ]]);
});
