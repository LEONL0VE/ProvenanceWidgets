import assert from "node:assert/strict";
import test from "node:test";

import {
    getMostRecentScentKey,
    getRangeScentIntervals,
    getVisibleScentKeys,
} from "../src/components/scentBarsData.js";

test("scent bars omit options without provenance", () => {
    const provenance = {
        aggregateData: new Map([
            ["Rome", { interactions: 2, index: 3 }],
        ]),
        detailedData: new Map([
            ["London", [{ select: { index: 1 } }]],
        ]),
    };

    assert.deepEqual(
        getVisibleScentKeys(
            provenance,
            ["New York", "Rome", "London"]
        ),
        ["Rome", "London"]
    );
});

test("scent bars identify the most recent aggregate option", () => {
    const provenance = {
        aggregateData: new Map([
            ["Rome", { index: 2 }],
            ["London", { index: 5 }],
            ["Paris", { index: 3 }],
        ]),
    };

    assert.equal(
        getMostRecentScentKey(
            provenance,
            ["Rome", "London", "Paris"]
        ),
        "London"
    );
});

test("range scent intervals preserve order and pixel geometry", () => {
    const provenance = {
        detailedData: new Map([
            [2, { value: [60, 20], index: 2 }],
            [1, { value: [10, 30], index: 1 }],
        ]),
    };

    assert.deepEqual(
        getRangeScentIntervals({
            provenance,
            min: 0,
            max: 100,
            width: 500,
        }),
        [
            {
                low: 10,
                high: 30,
                index: 1,
                x: 50,
                width: 100,
            },
            {
                low: 20,
                high: 60,
                index: 2,
                x: 100,
                width: 200,
            },
        ]
    );
});

test("range scent intervals can show an unrecorded current range", () => {
    assert.deepEqual(
        getRangeScentIntervals({
            provenance: { detailedData: new Map() },
            rangeInterval: [25, 75],
            min: 0,
            max: 100,
            width: 400,
        }),
        [{
            low: 25,
            high: 75,
            index: 1,
            x: 100,
            width: 200,
        }]
    );
});
