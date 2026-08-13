import test from "node:test";
import assert from "node:assert/strict";
import {
    callCheckboxGroupCallbacks,
    getCheckboxGroupCaller,
    getCheckboxKeysAtTimelinePoint,
    getCheckboxOptionLabel,
    getCheckboxOptionValue,
    getControlledCheckboxGroupValue,
    getInitialCheckboxGroupValue,
    isResolvableCheckboxGroupValue,
    resolveCheckboxGroupValue,
    restoreCheckboxGroupTemporalValue,
} from "../src/components/checkboxGroupValue.js";

const v1Data = [
    { label: "Chicken", value: "chicken", inputId: "protein-1" },
    { label: "Beef", value: "beef", inputId: "protein-2" },
    { label: "Lamb", value: "lamb", inputId: "protein-3" },
];

test("maps PW 1.0 checkbox data to ordered stable key arrays", () => {
    assert.equal(getCheckboxOptionValue(v1Data[0]), "chicken");
    assert.equal(getCheckboxOptionLabel(v1Data[1]), "Beef");
    assert.deepEqual(
        resolveCheckboxGroupValue(
            v1Data,
            ["lamb", "chicken", "chicken"]
        ),
        ["chicken", "lamb"]
    );
});

test("supports PW 1.0 custom value and label fields", () => {
    const data = [
        { proteinCode: "C", proteinName: "Chicken" },
        { proteinCode: "B", proteinName: "Beef" },
    ];
    const config = {
        optionValue: "proteinCode",
        optionLabel: "proteinName",
    };

    assert.equal(
        getCheckboxOptionValue(data[1], config),
        "B"
    );
    assert.equal(
        getCheckboxOptionLabel(data[0], config),
        "Chicken"
    );
    assert.deepEqual(
        resolveCheckboxGroupValue(data, ["B"], config),
        ["B"]
    );
});

test("resolves controlled, default, cleared, and checked-child values", () => {
    assert.deepEqual(
        getControlledCheckboxGroupValue({
            selected: ["beef"],
            value: ["chicken"],
        }, v1Data),
        ["beef"]
    );
    assert.deepEqual(
        getInitialCheckboxGroupValue({
            defaultSelected: ["lamb", "chicken"],
        }, v1Data),
        ["chicken", "lamb"]
    );
    assert.deepEqual(
        getInitialCheckboxGroupValue({
            selected: [],
        }, v1Data),
        []
    );
    assert.deepEqual(
        getInitialCheckboxGroupValue(
            {},
            ["Chicken", "Beef"],
            {},
            ["Beef"]
        ),
        ["Beef"]
    );
});

test("identifies the one toggled checkbox as PW's caller", () => {
    assert.equal(
        getCheckboxGroupCaller(
            ["chicken"],
            ["chicken", "beef"]
        ),
        "beef"
    );
    assert.equal(
        getCheckboxGroupCaller(
            ["chicken", "beef"],
            ["beef"]
        ),
        "chicken"
    );
});

test("restores the complete selected set at a Temporal point", () => {
    const provenance = {
        detailedData: new Map([
            ["chicken", [{
                select: { index: 1 },
                unselect: { index: 3 },
            }]],
            ["beef", [{
                select: { index: 2 },
            }]],
        ]),
    };

    assert.deepEqual(
        getCheckboxKeysAtTimelinePoint({
            provenance,
            point: 2,
        }),
        ["chicken", "beef"]
    );
    assert.deepEqual(
        getCheckboxKeysAtTimelinePoint({
            provenance,
            point: 4,
        }),
        ["beef"]
    );
});

test("deduplicates callbacks and restores through custom-id metadata", () => {
    const callbackCalls = [];
    const shared = value => callbackCalls.push(value);
    callCheckboxGroupCallbacks({
        onSelectedChange: shared,
        selectedChange: shared,
        onChange: shared,
    }, ["chicken"], { type: "change" });
    assert.deepEqual(callbackCalls, [["chicken"]]);

    const restoreCalls = [];
    assert.equal(
        restoreCheckboxGroupTemporalValue({
            restoreWidgetValue: (...args) => {
                restoreCalls.push(args);
                return true;
            },
            target: "protein-filter",
            value: ["chicken", "beef"],
        }),
        true
    );
    assert.deepEqual(restoreCalls, [[
        "protein-filter",
        ["chicken", "beef"],
        "history",
    ]]);
});

test("rejects unknown checkbox keys during history replay", () => {
    assert.equal(
        isResolvableCheckboxGroupValue(
            ["chicken", "unknown"],
            v1Data
        ),
        false
    );
    assert.equal(
        isResolvableCheckboxGroupValue(
            ["chicken", "beef"],
            v1Data
        ),
        true
    );
});
