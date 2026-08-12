import assert from "node:assert/strict";
import test from "node:test";

import {
    getSliderViewPanelLayout,
    hasVisibleTemporalBrush,
} from "../src/components/sliderViewLayout.js";

test("uses the compact slider-view gutter for a single history entry", () => {
    assert.deepEqual(
        getSliderViewPanelLayout({
            temporalBrush: true,
            entryCount: 1,
        }),
        {
            brushVisible: false,
            leftGutter: 58,
            rightGutter: 22,
            panelOffset: -58,
            panelExtraWidth: 80,
        }
    );
});

test("uses the brush gutter without shifting the slider value plot", () => {
    assert.equal(
        hasVisibleTemporalBrush({ temporalBrush: true, entryCount: 2 }),
        true
    );
    assert.deepEqual(
        getSliderViewPanelLayout({
            temporalBrush: true,
            entryCount: 2,
        }),
        {
            brushVisible: true,
            leftGutter: 86,
            rightGutter: 22,
            panelOffset: -86,
            panelExtraWidth: 108,
        }
    );
});
