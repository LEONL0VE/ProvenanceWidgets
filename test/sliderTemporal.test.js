import test from "node:test";
import assert from "node:assert/strict";
import {
    buildTemporalSliderConnections,
    brushSelectionToIndexRange,
    brushSelectionToPositionRange,
    filterTemporalEntries,
    getTemporalYPositions,
    normalizeTemporalBrush,
    resolveTemporalBrushEnabled,
    TEMPORAL_LINE_COLOR,
    TEMPORAL_LINE_WIDTH,
    restoreTemporalPoint,
} from "../src/shared/logic/sliderTemporal.js";

test("uses a fixed temporal trajectory style", () => {
    assert.equal(TEMPORAL_LINE_COLOR, "#495057");
    assert.equal(TEMPORAL_LINE_WIDTH, 1);
});

test("connects Range Slider low and high endpoints as separate trajectories", () => {
    const entry = (label, low, high) => [
        label,
        [{
            select: { index: low },
            unselect: { index: high },
        }],
    ];
    const connections = buildTemporalSliderConnections({
        entries: [
            entry("0", 0, 100),
            entry("1", 0, 100),
            entry("2", 0, 70),
        ],
        yPositions: [8, 125, 242],
        domainMin: 0,
        domainMax: 100,
        range: true,
    });

    assert.deepEqual(connections, [
        {
            endpoint: "low",
            fromIndex: 0,
            toIndex: 1,
            x1: 0,
            y1: 8,
            x2: 0,
            y2: 125,
        },
        {
            endpoint: "high",
            fromIndex: 0,
            toIndex: 1,
            x1: 100,
            y1: 8,
            x2: 100,
            y2: 125,
        },
        {
            endpoint: "low",
            fromIndex: 1,
            toIndex: 2,
            x1: 0,
            y1: 125,
            x2: 0,
            y2: 242,
        },
        {
            endpoint: "high",
            fromIndex: 1,
            toIndex: 2,
            x1: 100,
            y1: 125,
            x2: 70,
            y2: 242,
        },
    ]);
});

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

test("normalizes the Temporal brush render flag", () => {
    assert.equal(normalizeTemporalBrush(undefined), false);
    assert.equal(normalizeTemporalBrush(false), false);
    assert.equal(normalizeTemporalBrush(true), true);
});

test("enables Temporal range selection by default", () => {
    assert.equal(resolveTemporalBrushEnabled(), true);
    assert.equal(resolveTemporalBrushEnabled({}), true);
    assert.equal(
        resolveTemporalBrushEnabled({ temporalBrush: false }),
        false
    );
    assert.equal(
        resolveTemporalBrushEnabled({ temporalBrush: true }),
        true
    );
    assert.equal(
        resolveTemporalBrushEnabled({ enableTemporalBrush: false }),
        false
    );
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

test("condenses long interaction histories into a fixed PW1 plot", () => {
    const entries = Array.from(
        { length: 100 },
        (_, index) => [String(index), [{ select: { index } }]]
    );
    const positions = getTemporalYPositions(
        entries,
        "interaction",
        250
    );

    assert.equal(positions.length, 100);
    assert.equal(positions[0], 8);
    assert.equal(positions.at(-1), 242);
    assert.ok(positions.every((position, index) => (
        index === 0 || position > positions[index - 1]
    )));
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

test("restores the complete range from either Range Temporal endpoint", () => {
    const calls = [];
    const record = {
        value: [20, 60],
        select: { index: 20 },
        unselect: { index: 60 },
    };

    const restored = restoreTemporalPoint({
        restoreWidgetValue: (...args) => {
            calls.push(args);
            return true;
        },
        target: "custom-range-id",
        record,
        range: true,
    });

    assert.equal(restored, true);
    assert.deepEqual(calls, [[
        "custom-range-id",
        [20, 60],
        "history",
    ]]);
});
