import test from "node:test";
import assert from "node:assert/strict";
import {
    buildSuperAggregateBoxes,
    buildSuperInteractionSequence,
    getSuperInteractionSummaries,
    getSuperWidgetColorMap,
    getSuperWidgetIds,
    getRegisteredWidgetValueAtTime,
    restoreRegisteredWidgetsAtTime,
} from "../src/components/superProvenanceData.js";

const time = value => new Date(`2026-07-30T01:00:0${value}.000Z`);

test("does not expose an initial generic baseline as a Super interaction", () => {
    const superProvenance = {
        registeredWidgets: new Map([["single-slider", {}]]),
    };
    const registeredComponents = new Map([
        ["single-slider", {
            hasUserInteracted: false,
            detailedData: new Map([
                [1, {
                    value: 10,
                    time: time(0),
                    index: 1,
                    kind: "baseline",
                }],
            ]),
        }],
    ]);

    assert.deepEqual(buildSuperInteractionSequence({
        superProvenance,
        registeredComponents,
    }), []);
});

test("keeps the baseline for replay but only renders the real interaction", () => {
    const superProvenance = {
        registeredWidgets: new Map([["single-slider", {}]]),
    };
    const registeredComponents = new Map([
        ["single-slider", {
            hasUserInteracted: true,
            detailedData: new Map([
                [1, {
                    value: 10,
                    time: time(0),
                    index: 1,
                    kind: "baseline",
                }],
                [2, {
                    value: 20,
                    time: time(1),
                    index: 2,
                    kind: "interaction",
                }],
                [3, {
                    value: 20,
                    time: time(2),
                    index: 3,
                    kind: "sample",
                }],
            ]),
        }],
    ]);

    const sequence = buildSuperInteractionSequence({
        superProvenance,
        registeredComponents,
        getColor: () => "#123456",
    });

    assert.equal(sequence.length, 1);
    assert.deepEqual(sequence[0], {
        widgetId: "single-slider",
        color: "#123456",
        time: time(1),
        index: 2,
        value: 20,
        width: "100%",
    });
});

test("preserves real selection interactions and orders widgets by time", () => {
    const superProvenance = {
        registeredWidgets: new Map([
            ["checkbox-group", {}],
            ["input-text", {}],
        ]),
    };
    const registeredComponents = new Map([
        ["checkbox-group", {
            detailedData: new Map([
                ["Cheese", [{
                    select: { time: time(2), index: 2 },
                }]],
            ]),
        }],
        ["input-text", {
            detailedData: new Map([
                [1, {
                    value: "pizza",
                    time: time(1),
                    index: 1,
                }],
            ]),
        }],
    ]);

    const sequence = buildSuperInteractionSequence({
        superProvenance,
        registeredComponents,
        widgetColors: {
            "checkbox-group": "orange",
            "input-text": "blue",
        },
    });

    assert.deepEqual(
        sequence.map(record => [
            record.widgetId,
            record.value,
            record.width,
        ]),
        [
            ["input-text", "pizza", "50%"],
            ["checkbox-group", "Cheese", "50%"],
        ]
    );
});

test("Super Aggregate summaries omit zero-interaction and baseline-only widgets", () => {
    const superProvenance = {
        registeredWidgets: new Map([
            ["single-slider", {}],
            ["range-slider", {}],
            ["input-text", {}],
        ]),
        detailedData: new Map([
            ["single-slider", [
                { time: time(0), index: 0, kind: "baseline" },
                { time: time(1), index: 1, kind: "interaction" },
                { time: time(3), index: 3, kind: "interaction" },
            ]],
            ["range-slider", [
                { time: time(0), index: 0, kind: "baseline" },
            ]],
        ]),
    };

    assert.deepEqual(getSuperInteractionSummaries(superProvenance), [{
        widgetId: "single-slider",
        interactionCount: 2,
        lastInteractionTime: time(3),
    }]);
});

test("assigns stable footprint colors to every registered widget before interaction", () => {
    const superProvenance = {
        registeredWidgets: new Map([
            ["checkbox-group", {}],
            ["single-slider", {}],
            ["range-slider", {}],
        ]),
        detailedData: new Map(),
    };

    assert.deepEqual(
        getSuperWidgetColorMap(
            superProvenance,
            index => `color-${index}`
        ),
        {
            "checkbox-group": "color-0",
            "single-slider": "color-1",
            "range-slider": "color-2",
        }
    );
    assert.deepEqual(
        getSuperInteractionSummaries(superProvenance),
        []
    );
});

test("Default View uses colored empty slots without provenance values", () => {
    const superProvenance = {
        registeredWidgets: new Map([
            ["checkbox-group", {}],
            ["single-slider", {}],
            ["range-slider", {}],
        ]),
        detailedData: new Map([
            ["single-slider", [{
                time: time(0),
                index: 0,
                kind: "baseline",
            }]],
        ]),
    };

    assert.deepEqual(
        buildSuperAggregateBoxes({
            superProvenance,
            getColor: index => `color-${index}`,
        }),
        [
            {
                widgetId: "checkbox-group",
                interactionCount: 0,
                lastInteractionTime: null,
                color: "color-0",
                width: 20,
            },
            {
                widgetId: "single-slider",
                interactionCount: 0,
                lastInteractionTime: null,
                color: "color-1",
                width: 20,
            },
            {
                widgetId: "range-slider",
                interactionCount: 0,
                lastInteractionTime: null,
                color: "color-2",
                width: 20,
            },
        ]
    );
});

test("Aggregate View reserves original fixed slots for non-interacted widgets", () => {
    const superProvenance = {
        registeredWidgets: new Map([
            ["checkbox-group", {}],
            ["single-slider", {}],
            ["range-slider", {}],
        ]),
        detailedData: new Map([
            ["checkbox-group", [
                { time: time(1), index: 1, kind: "interaction" },
                { time: time(2), index: 2, kind: "interaction" },
            ]],
        ]),
    };

    assert.deepEqual(
        buildSuperAggregateBoxes({
            superProvenance,
            getColor: index => `color-${index}`,
        }),
        [
            {
                widgetId: "single-slider",
                interactionCount: 0,
                lastInteractionTime: null,
                color: "color-1",
                width: 20,
            },
            {
                widgetId: "range-slider",
                interactionCount: 0,
                lastInteractionTime: null,
                color: "color-2",
                width: 20,
            },
            {
                widgetId: "checkbox-group",
                interactionCount: 2,
                lastInteractionTime: time(2),
                color: "color-0",
                width: 360,
            },
        ]
    );
});

test("Temporal View keeps every registered widget row before interaction", () => {
    const superProvenance = {
        registeredWidgets: new Map([
            ["single-slider", {}],
            ["range-slider", {}],
            ["input-text", {}],
            ["checkbox-group", {}],
        ]),
        detailedData: new Map(),
    };

    assert.deepEqual(getSuperWidgetIds(superProvenance), [
        "single-slider",
        "range-slider",
        "input-text",
        "checkbox-group",
    ]);
    assert.deepEqual(buildSuperInteractionSequence({
        superProvenance,
        registeredComponents: new Map(),
    }), []);
});

test("resolves the latest generic value at a Super timeline time", () => {
    const registration = {
        id: "single-slider",
        type: "single-slider",
        provenance: {
            detailedData: new Map([
                [1, {
                    value: 10,
                    time: time(0),
                    index: 1,
                    kind: "baseline",
                }],
                [2, {
                    value: 20,
                    time: time(2),
                    index: 2,
                    kind: "interaction",
                }],
            ]),
        },
        getValue: () => 20,
        setValue: () => {},
    };

    assert.deepEqual(
        getRegisteredWidgetValueAtTime(registration, time(1)),
        { found: true, value: 10 }
    );
    assert.deepEqual(
        getRegisteredWidgetValueAtTime(registration, time(3)),
        { found: true, value: 20 }
    );
});

test("uses registration type for single and multiple selection replay", () => {
    const provenance = {
        detailedData: new Map([
            ["Cheese", [{
                select: { time: time(1), index: 1 },
                unselect: { time: time(3), index: 3 },
            }]],
            ["Mushroom", [{
                select: { time: time(2), index: 2 },
            }]],
        ]),
    };

    assert.deepEqual(
        getRegisteredWidgetValueAtTime({
            id: "custom-id-without-type-name",
            type: "radio-group",
            provenance,
        }, time(2)),
        { found: true, value: "Mushroom" }
    );
    assert.deepEqual(
        getRegisteredWidgetValueAtTime({
            id: "another-custom-id",
            type: "checkbox-group",
            provenance,
        }, time(2)),
        { found: true, value: ["Cheese", "Mushroom"] }
    );
});

test("uses dropdown metadata for custom-id Super replay", () => {
    const provenance = {
        detailedData: new Map([
            ["NY", [{
                select: { time: time(1), index: 1 },
                unselect: { time: time(2), index: 2 },
            }]],
            ["LDN", [{
                select: { time: time(2), index: 2 },
            }]],
        ]),
    };

    assert.deepEqual(
        getRegisteredWidgetValueAtTime({
            id: "customer-city-filter",
            type: "dropdown",
            provenance,
        }, time(3)),
        { found: true, value: "LDN" }
    );
});

test("uses multiselect metadata for custom-id Super replay", () => {
    const provenance = {
        detailedData: new Map([
            ["NY", [{
                select: { time: time(1), index: 1 },
            }]],
            ["LDN", [{
                select: { time: time(2), index: 2 },
                unselect: { time: time(3), index: 3 },
            }]],
        ]),
    };

    assert.deepEqual(
        getRegisteredWidgetValueAtTime({
            id: "customer-city-multi-filter",
            type: "multiselect",
            provenance,
        }, time(2)),
        { found: true, value: ["NY", "LDN"] }
    );
});

test("Super timeline replay calls each registration setValue with history source", () => {
    const restored = [];
    const registrations = new Map([
        ["single-slider", {
            id: "single-slider",
            type: "single-slider",
            provenance: {
                detailedData: new Map([
                    [1, {
                        value: 25,
                        time: time(1),
                        index: 1,
                    }],
                ]),
            },
            setValue: (value, source) =>
                restored.push(["single-slider", value, source]),
        }],
    ]);

    assert.deepEqual(
        restoreRegisteredWidgetsAtTime({
            registrations,
            widgetIds: ["single-slider", "missing-widget"],
            targetTime: time(2),
        }),
        [{ widgetId: "single-slider", value: 25 }]
    );
    assert.deepEqual(restored, [
        ["single-slider", 25, "history"],
    ]);
});
