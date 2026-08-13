import test from "node:test";
import assert from "node:assert/strict";
import {
    buildSelectionTimelineBars,
    getSelectionTimeDomain,
    normalizeSelectionBrushRange,
} from "../src/shared/logic/selectionTimeline.js";

const time = second =>
    new Date(`2026-07-30T10:00:0${second}.000Z`);

test("builds PW-style interaction intervals with a visible now endpoint", () => {
    const bars = buildSelectionTimelineBars({
        records: [
            {
                select: { index: 1, time: time(1) },
                unselect: { index: 2, time: time(2) },
            },
            {
                select: { index: 3, time: time(3) },
            },
        ],
        maxIndex: 4,
    });

    assert.equal(bars.length, 2);
    assert.equal(bars[0].left, 0);
    assert.equal(Math.round(bars[0].width), 33);
    assert.equal(bars[0].startValue, 0);
    assert.equal(bars[0].endValue, 1);
    assert.equal(bars[0].visibleMin, 0);
    assert.equal(bars[0].visibleMax, 3);
    assert.equal(bars[0].isLatest, false);
    assert.equal(Math.round(bars[1].left), 67);
    assert.equal(Math.round(bars[1].width), 33);
    assert.equal(bars[1].isLatest, true);
});

test("brushes the visible interaction interval without deleting history", () => {
    const bars = buildSelectionTimelineBars({
        records: [{
            select: { index: 3, time: time(3) },
        }],
        maxIndex: 5,
        brushRange: [50, 100],
    });

    assert.equal(bars.length, 1);
    assert.equal(bars[0].left, 0);
    assert.equal(bars[0].width, 100);
    assert.deepEqual(
        normalizeSelectionBrushRange([90, 20]),
        [20, 90]
    );
});

test("positions time mode intervals by elapsed time", () => {
    const records = [
        { timestamp: time(0).toISOString() },
        { timestamp: time(4).toISOString() },
    ];
    const domain = getSelectionTimeDomain(records);
    const bars = buildSelectionTimelineBars({
        records: [{
            select: { index: 1, time: time(1) },
            unselect: { index: 2, time: time(3) },
        }],
        maxIndex: 3,
        mode: "time",
        timeDomain: domain,
    });

    assert.equal(bars.length, 1);
    assert.equal(bars[0].left, 25);
    assert.equal(bars[0].width, 50);
});
