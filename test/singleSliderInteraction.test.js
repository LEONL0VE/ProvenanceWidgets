import assert from "node:assert/strict";
import test from "node:test";

import { shouldCommitSingleSliderChange } from
    "../src/components/singleSliderInteraction.js";

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

test("single slider unknown changes do not bypass the release boundary", () => {
    assert.equal(shouldCommitSingleSliderChange(undefined), false);
    assert.equal(shouldCommitSingleSliderChange({}), false);
});
