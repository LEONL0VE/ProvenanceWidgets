import test from "node:test";
import assert from "node:assert/strict";
import {
    callMultiSelectCallbacks,
    getControlledMultiSelectValue,
    getInitialMultiSelectValue,
    getMultiSelectCaller,
    getMultiSelectKeysAtTimelinePoint,
    getPrimeMultiSelectValue,
    isResolvableMultiSelectValue,
    multiSelectToProvenanceValue,
    provenanceValueToMultiSelect,
    resolveMultiSelectOptions,
    restoreMultiSelectTemporalValue,
} from "../src/shared/logic/multiSelectDropdownValue.js";

const v1Options = [
    { name: "New York", code: "NY" },
    { name: "London", code: "LDN" },
    { name: "Paris", code: "PRS" },
];
const v1Config = {
    dataKey: "code",
    optionLabel: "name",
};

test("maps V1 Multi Select option objects to stable ordered keys", () => {
    assert.deepEqual(
        resolveMultiSelectOptions(
            v1Options,
            ["PRS", "NY", "PRS"],
            v1Config
        ),
        [v1Options[0], v1Options[2]]
    );
    assert.deepEqual(
        multiSelectToProvenanceValue(
            [v1Options[0], v1Options[2]],
            v1Config
        ),
        ["NY", "PRS"]
    );
    assert.deepEqual(
        provenanceValueToMultiSelect(
            ["LDN", "NY"],
            v1Options,
            v1Config
        ),
        [v1Options[0], v1Options[1]]
    );
});

test("supports controlled, default, and cleared Multi Select values", () => {
    assert.deepEqual(
        getControlledMultiSelectValue({
            selected: ["LDN"],
            value: ["NY"],
        }, v1Options, v1Config),
        [v1Options[1]]
    );
    assert.deepEqual(
        getInitialMultiSelectValue({
            defaultSelected: ["NY", "PRS"],
        }, v1Options, v1Config),
        [v1Options[0], v1Options[2]]
    );
    assert.deepEqual(
        getControlledMultiSelectValue({
            selected: [],
        }, v1Options, v1Config),
        []
    );
});

test("uses optionValue only for the underlying PrimeReact array", () => {
    assert.deepEqual(
        getPrimeMultiSelectValue(v1Options.slice(0, 2), {
            optionValue: "code",
        }),
        ["NY", "LDN"]
    );
    const modern = [
        { label: "New York", value: "NY" },
        { label: "London", value: "LDN" },
    ];
    assert.deepEqual(
        getPrimeMultiSelectValue(modern),
        ["NY", "LDN"]
    );
});

test("identifies the single changed option as V1's interaction caller", () => {
    assert.equal(
        getMultiSelectCaller(["NY"], ["NY", "LDN"]),
        "LDN"
    );
    assert.equal(
        getMultiSelectCaller(["NY", "LDN"], ["NY"]),
        "LDN"
    );
    assert.equal(
        getMultiSelectCaller([], ["NY", "LDN"]),
        undefined
    );
});

test("deduplicates V1 and V2 Multi Select callbacks", () => {
    const calls = [];
    const shared = value => calls.push(value);
    callMultiSelectCallbacks({
        onSelectedChange: shared,
        selectedChange: shared,
        onChange: shared,
    }, v1Options.slice(0, 2), { type: "change" });

    assert.deepEqual(calls, [v1Options.slice(0, 2)]);
});

test("restores every option active at the clicked Temporal point", () => {
    const provenance = {
        detailedData: new Map([
            ["NY", [{
                select: { index: 1, time: new Date(1000) },
                unselect: { index: 3, time: new Date(3000) },
            }]],
            ["LDN", [{
                select: { index: 2, time: new Date(2000) },
            }]],
        ]),
    };

    assert.deepEqual(
        getMultiSelectKeysAtTimelinePoint({
            provenance,
            point: 2,
        }),
        ["NY", "LDN"]
    );
    assert.deepEqual(
        getMultiSelectKeysAtTimelinePoint({
            provenance,
            point: 4000,
            mode: "time",
        }),
        ["LDN"]
    );
});

test("restores custom-id Temporal selections through metadata", () => {
    const calls = [];
    assert.equal(
        restoreMultiSelectTemporalValue({
            restoreWidgetValue: (...args) => {
                calls.push(args);
                return true;
            },
            target: "customer-city-multi-filter",
            value: ["NY", "LDN"],
        }),
        true
    );
    assert.deepEqual(calls, [[
        "customer-city-multi-filter",
        ["NY", "LDN"],
        "history",
    ]]);
});

test("rejects unknown primitive keys during history replay", () => {
    assert.equal(
        isResolvableMultiSelectValue(
            ["NY", "UNKNOWN"],
            v1Options,
            v1Config
        ),
        false
    );
    assert.equal(
        isResolvableMultiSelectValue(
            ["NY", "LDN"],
            v1Options,
            v1Config
        ),
        true
    );
});
