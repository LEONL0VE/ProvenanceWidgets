import assert from "node:assert/strict";
import test from "node:test";

import {
    getSingleSliderBarGeometry,
} from "../src/components/singleSliderBarGeometry.js";

test("single-slider bars center on the continuous slider coordinate", () => {
    const geometry = getSingleSliderBarGeometry({
        value: 1980,
        min: 1955,
        max: 2000,
        width: 405,
        keyCount: 10,
        barWidthFactor: 0.25,
    });

    assert.equal(geometry.center, 225);
    assert.equal(geometry.width, 11.25);
    assert.equal(geometry.x + geometry.width / 2, geometry.center);
});

test("single-slider endpoint bars remain centered on both endpoints", () => {
    const shared = {
        min: 0,
        max: 100,
        width: 460,
        keyCount: 21,
        barWidthFactor: 0.25,
    };

    const first = getSingleSliderBarGeometry({ ...shared, value: 0 });
    const last = getSingleSliderBarGeometry({ ...shared, value: 100 });

    assert.equal(first.center, 0);
    assert.equal(last.center, 460);
    assert.equal(first.x + first.width / 2, 0);
    assert.equal(last.x + last.width / 2, 460);
});
