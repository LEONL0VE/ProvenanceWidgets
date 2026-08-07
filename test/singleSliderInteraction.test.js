import assert from "node:assert/strict";
import test from "node:test";

import {
    shouldCommitSingleSliderChange,
    shouldCommitSliderChange,
} from "../src/components/singleSliderInteraction.js";

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
            shouldCommitSingleSliderChange({ originalEvent: { type } }),
            false,
            `${type} should not commit from onChange`,
        );
    }
});

test("single slider keyboard changes commit without waiting for slide end", () => {
    assert.equal(
        shouldCommitSingleSliderChange({
            originalEvent: { type: "keydown" },
        }),
        true,
    );
});

test("the release boundary is shared by single, range, and brush sliders", () => {
    const pointerMove = { originalEvent: { type: "pointermove" } };
    const keyboardStep = { originalEvent: { type: "keydown" } };

    assert.equal(shouldCommitSliderChange(pointerMove), false);
    assert.equal(shouldCommitSliderChange(keyboardStep), true);
    assert.equal(
        shouldCommitSingleSliderChange,
        shouldCommitSliderChange,
    );
});

test("single slider unknown changes do not bypass the release boundary", () => {
    assert.equal(shouldCommitSingleSliderChange(undefined), false);
    assert.equal(shouldCommitSingleSliderChange({}), false);
});
