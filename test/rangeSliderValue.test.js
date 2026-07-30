import test from "node:test";
import assert from "node:assert/strict";
import {
    callRangeSliderCallbacks,
    getControlledRangeSliderValue,
    getInitialRangeSliderValue,
    normalizeRangeSliderValue,
    rangeSliderValueKey,
    rangeSliderValuesEqual,
} from "../src/components/rangeSliderValue.js";

test("supports both React array values and V1 low/high values", () => {
    assert.deepEqual(
        getControlledRangeSliderValue(
            { value: [20, 60] },
            0,
            100
        ),
        [20, 60]
    );
    assert.deepEqual(
        getControlledRangeSliderValue(
            { value: 20, highValue: 60 },
            0,
            100
        ),
        [20, 60]
    );
    assert.deepEqual(
        getInitialRangeSliderValue(
            { defaultValue: 25, defaultHighValue: 75 },
            0,
            100
        ),
        [25, 75]
    );
});

test("normalizes live range values without creating zero-width history", () => {
    assert.deepEqual(
        normalizeRangeSliderValue([80, 20], 0, 100),
        [20, 80]
    );
    assert.deepEqual(
        normalizeRangeSliderValue([-10, 120], 0, 100),
        [0, 100]
    );
    assert.equal(
        normalizeRangeSliderValue([40, 40], 0, 100),
        null
    );
    assert.equal(
        normalizeRangeSliderValue(["bad", 40], 0, 100),
        null
    );
});

test("emits live and completed-selection callbacks at separate phases", () => {
    const calls = [];
    const sharedSelection = value =>
        calls.push(["selection", value]);
    const props = {
        onChange: value => calls.push(["change", value]),
        onSelectedChange: sharedSelection,
        selectedChange: sharedSelection,
    };

    callRangeSliderCallbacks(props, [20, 50], { type: "change" }, {
        includeSelection: false,
    });
    callRangeSliderCallbacks(props, [30, 60], { type: "slide-end" }, {
        includeChange: false,
    });

    assert.deepEqual(calls, [
        ["change", [20, 50]],
        ["selection", [30, 60]],
    ]);
    assert.equal(
        rangeSliderValuesEqual([20, 50], [20, 50]),
        true
    );
    assert.equal(
        rangeSliderValueKey([20, 50]),
        rangeSliderValueKey([20, 50])
    );
});
