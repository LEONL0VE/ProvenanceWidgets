import assert from "node:assert/strict";
import test from "node:test";

import { shouldCommitSliderChange } from "../src/shared/logic/sliderInteraction.js";

test("single slider pointer changes remain previews until slide end", () => {
    for (const type of [
        "mousemove",
        "mouseup",
        "pointermove",
        "pointerup",
        "touchmove",
        "touchend",
        "click",
    ]) {
        assert.equal(
            shouldCommitSliderChange({ originalEvent: { type } }),
            false,
            `${type} should not commit from onChange`,
        );
    }
});

test("single slider keyboard changes commit without waiting for slide end", () => {
    assert.equal(
        shouldCommitSliderChange({
            originalEvent: { type: "keydown" },
        }),
        true,
    );
});

test("range and brush sliders share the same release boundary", () => {
    const pointerMove = { originalEvent: { type: "pointermove" } };
    const keyboardStep = { originalEvent: { type: "keydown" } };

    assert.equal(shouldCommitSliderChange(pointerMove), false);
    assert.equal(shouldCommitSliderChange(keyboardStep), true);
});

test("single slider unknown changes do not bypass the release boundary", () => {
    assert.equal(shouldCommitSliderChange(undefined), false);
    assert.equal(shouldCommitSliderChange({}), false);
});
