import test from "node:test";
import assert from "node:assert/strict";
import {
    getProvenanceButtonState,
    getProvenanceButtonTooltip,
    hasUserProvenance,
    isInsideProvenanceInteraction,
} from "../src/components/provenanceButtonState.js";

const provenance = ({
    interacted,
    kind = "baseline",
} = {}) => ({
    hasUserInteracted: interacted,
    detailedData: new Map([
        [1, { value: 10, kind }],
    ]),
});

test("keeps the footprint disabled for a baseline-only slider", () => {
    assert.equal(hasUserProvenance(provenance({
        interacted: false,
    })), false);
    assert.equal(getProvenanceButtonState({
        provenance: provenance({ interacted: false }),
    }), "disabled");
});

test("detects interaction records when a framework flag is stale", () => {
    assert.equal(hasUserProvenance(provenance({
        interacted: false,
        kind: "interaction",
    })), true);
});

test("switches the footprint between Aggregate and Temporal states", () => {
    const interacted = provenance({ interacted: true });
    assert.equal(getProvenanceButtonState({
        provenance: interacted,
        open: false,
    }), "aggregate");
    assert.equal(getProvenanceButtonState({
        provenance: interacted,
        open: true,
    }), "temporal");
});

test("visualize=false hides the separately rendered footprint", () => {
    assert.equal(getProvenanceButtonState({
        provenance: provenance({ interacted: true }),
        visualize: false,
        open: true,
    }), "hidden");
});

test("describes every visible footprint state", () => {
    assert.deepEqual(getProvenanceButtonTooltip("disabled"), {
        title: "No provenance yet",
        description: "Interact with this widget to create provenance.",
    });
    assert.match(
        getProvenanceButtonTooltip("aggregate").description,
        /overall frequency/
    );
    assert.match(
        getProvenanceButtonTooltip("temporal").action,
        /restore/
    );
    assert.equal(getProvenanceButtonTooltip("hidden"), null);
});

test("clicking a Temporal point is inside the footprint interaction boundary", () => {
    const chart = {
        getAttribute: name =>
            name === "data-provenance-chart-target"
                ? "single-slider"
                : null,
    };
    const point = {
        closest: selector => selector.includes(
            "[data-provenance-chart-target]"
        ) ? chart : null,
    };

    assert.equal(isInsideProvenanceInteraction({
        eventTarget: point,
        buttonElement: { contains: () => false },
        target: "single-slider",
    }), true);
    assert.equal(isInsideProvenanceInteraction({
        eventTarget: point,
        buttonElement: { contains: () => false },
        target: "another-widget",
    }), false);
});

test("interacting with the same widget keeps its footprint open", () => {
    const widget = {
        getAttribute: name => name === "data-widget-id"
            ? "range-slider"
            : null,
    };
    const handle = {
        closest: selector => selector.includes("[data-widget-id]")
            ? widget
            : null,
    };

    assert.equal(isInsideProvenanceInteraction({
        eventTarget: handle,
        buttonElement: { contains: () => false },
        target: "range-slider",
    }), true);
});

test("interacting with a matching dropdown panel keeps its footprint open", () => {
    const option = {
        closest: selector => selector.includes(
            ".provenance-multiselect-panel-multi-select"
        ) ? {} : null,
    };

    assert.equal(isInsideProvenanceInteraction({
        eventTarget: option,
        buttonElement: { contains: () => false },
        target: "multi select",
    }), true);
});
