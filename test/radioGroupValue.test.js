import test from "node:test";
import assert from "node:assert/strict";
import {
    callRadioGroupCallbacks,
    getControlledRadioGroupValue,
    getInitialRadioGroupValue,
    getRadioGroupCaller,
    getRadioOptionLabel,
    getRadioOptionValue,
    resolveRadioGroupValue,
    restoreRadioGroupTemporalValue,
} from "../src/shared/logic/radioGroupValue.js";

const v1Data = [
    { label: "Cheese", value: "cheese", inputId: "ingredient-1" },
    { label: "Mushroom", value: "mushroom", inputId: "ingredient-2" },
];

test("maps PW 1.0 radio data to scalar values and visible labels", () => {
    assert.equal(getRadioOptionValue(v1Data[0]), "cheese");
    assert.equal(getRadioOptionLabel(v1Data[1]), "Mushroom");
    assert.equal(
        resolveRadioGroupValue(v1Data, ["mushroom"]),
        "mushroom"
    );
});

test("supports PW 1.0 custom data field names", () => {
    const data = [
        { cityCode: "NY", cityName: "New York" },
        { cityCode: "LDN", cityName: "London" },
    ];
    const config = {
        optionValue: "cityCode",
        optionLabel: "cityName",
    };

    assert.equal(
        getRadioOptionValue(data[1], config),
        "LDN"
    );
    assert.equal(
        getRadioOptionLabel(data[1], config),
        "London"
    );
    assert.equal(
        resolveRadioGroupValue(data, "NY", config),
        "NY"
    );
});

test("supports selected, value, defaults, and legacy child state", () => {
    assert.equal(
        getControlledRadioGroupValue({
            selected: "mushroom",
            value: "cheese",
        }, v1Data),
        "mushroom"
    );
    assert.equal(
        getInitialRadioGroupValue({
            defaultSelected: "cheese",
        }, v1Data),
        "cheese"
    );
    assert.equal(
        getInitialRadioGroupValue({
            defaultValue: "mushroom",
        }, v1Data),
        "mushroom"
    );
    assert.equal(
        getInitialRadioGroupValue(
            {},
            ["Cheese", "Mushroom"],
            {},
            "Cheese"
        ),
        "Cheese"
    );
    assert.equal(
        getControlledRadioGroupValue({
            selected: null,
        }, v1Data),
        null
    );
});

test("rejects unknown history values when radio options are known", () => {
    assert.equal(
        resolveRadioGroupValue(v1Data, "unknown"),
        null
    );
});

test("deduplicates PW 1.0 and React group callbacks", () => {
    const calls = [];
    const shared = value => calls.push(value);
    callRadioGroupCallbacks({
        onSelectedChange: shared,
        selectedChange: shared,
        onChange: shared,
    }, "mushroom", { type: "change" });

    assert.deepEqual(calls, ["mushroom"]);
});

test("restores a custom-id radio Temporal value through metadata", () => {
    const calls = [];
    const restored = restoreRadioGroupTemporalValue({
        restoreWidgetValue: (...args) => {
            calls.push(args);
            return true;
        },
        target: "pizza-topping-filter",
        value: "mushroom",
    });

    assert.equal(restored, true);
    assert.deepEqual(calls, [[
        "pizza-topping-filter",
        "mushroom",
        "history",
    ]]);
    assert.equal(
        getRadioGroupCaller("cheese", "mushroom"),
        "mushroom"
    );
    assert.equal(
        getRadioGroupCaller("mushroom", null),
        "mushroom"
    );
});
