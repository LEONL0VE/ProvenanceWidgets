import test from "node:test";
import assert from "node:assert/strict";
import {
    buildSliderLabels,
    buildSliderTicks,
    getSliderPosition,
} from "../src/shared/logic/sliderTicks.js";

test("builds PW 1.0 showTicks values from the slider step", () => {
    assert.deepEqual(
        buildSliderTicks({ min: 2, max: 14, step: 1 }),
        [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
    );
    assert.deepEqual(
        buildSliderTicks({ min: 34900, max: 755000, step: 100000 }),
        [34900, 134900, 234900, 334900, 434900, 534900, 634900, 734900, 755000]
    );
});

test("labels endpoints and handles without overlapping nearby values", () => {
    assert.deepEqual(
        buildSliderLabels({ min: 2, max: 14, values: 5 }),
        [2, 5, 14]
    );
    assert.deepEqual(
        buildSliderLabels({
            min: 34900,
            max: 755000,
            values: [34900, 734900],
        }),
        [34900, 734900]
    );
    assert.equal(getSliderPosition(5, 2, 14), 25);
});
