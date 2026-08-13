import assert from "node:assert/strict";
import test from "node:test";

import {
    getSingleSliderBarGeometry,
    SINGLE_SLIDER_BAR_WIDTH,
} from "../src/shared/logic/singleSliderBarGeometry.js";

test("single-slider bars center on the continuous slider coordinate", () => {
    const geometry = getSingleSliderBarGeometry({
        value: 1980,
        min: 1955,
        max: 2000,
        width: 405,
    });

    assert.equal(geometry.center, 225);
    assert.equal(geometry.width, SINGLE_SLIDER_BAR_WIDTH);
    assert.equal(geometry.x + geometry.width / 2, geometry.center);
});

test("single-slider endpoint bars remain centered on both endpoints", () => {
    const shared = {
        min: 0,
        max: 100,
        width: 460,
    };

    const first = getSingleSliderBarGeometry({ ...shared, value: 0 });
    const last = getSingleSliderBarGeometry({ ...shared, value: 100 });

    assert.equal(first.center, 0);
    assert.equal(last.center, 460);
    assert.equal(first.x + first.width / 2, 0);
    assert.equal(last.x + last.width / 2, 460);
});

test("single-slider bars keep the PW1 fixed width across page sizes", () => {
    const compactPage = getSingleSliderBarGeometry({
        value: 50,
        min: 0,
        max: 100,
        width: 280,
    });
    const widePage = getSingleSliderBarGeometry({
        value: 1980,
        min: 1955,
        max: 2000,
        width: 640,
    });

    assert.equal(compactPage.width, 8);
    assert.equal(widePage.width, 8);
});
