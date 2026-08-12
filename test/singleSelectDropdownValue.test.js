import test from "node:test";
import assert from "node:assert/strict";
import {
    callSingleSelectCallbacks,
    getControlledSingleSelectValue,
    getInitialSingleSelectValue,
    getPrimeSingleSelectValue,
    getSingleSelectCaller,
    getSingleSelectOptionKey,
    getSingleSelectOptionLabel,
    isSingleSelectOptionDisabled,
    provenanceValueToSingleSelect,
    resolveSingleSelectOption,
    restoreSingleSelectTemporalValue,
    singleSelectToProvenanceValue,
} from "../src/components/singleSelectDropdownValue.js";

const v1Options = [
    { name: "New York", code: "NY" },
    { name: "London", code: "LDN" },
];
const v1Config = {
    dataKey: "code",
    optionLabel: "name",
};

test("maps V1 option objects to stable provenance keys and labels", () => {
    assert.equal(
        getSingleSelectOptionKey(v1Options[1], v1Config),
        "LDN"
    );
    assert.equal(
        getSingleSelectOptionLabel(v1Options[1], v1Config),
        "London"
    );
    assert.equal(
        singleSelectToProvenanceValue(v1Options[1], v1Config),
        "LDN"
    );
    assert.equal(
        provenanceValueToSingleSelect(
            ["LDN"],
            v1Options,
            v1Config
        ),
        v1Options[1]
    );
});

test("supports modern label/value options and replacement references", () => {
    const options = [
        { label: "Paris", value: "Paris" },
        { label: "Mumbai", value: "Mumbai" },
    ];
    assert.equal(
        resolveSingleSelectOption(
            options,
            { label: "new reference", value: "Mumbai" }
        ),
        options[1]
    );
    assert.equal(
        provenanceValueToSingleSelect("Paris", options),
        options[0]
    );
});

test("resolves controlled and default selection contracts", () => {
    assert.equal(
        getControlledSingleSelectValue({
            selected: v1Options[1],
            value: v1Options[0],
        }, v1Options, v1Config),
        v1Options[1]
    );
    assert.equal(
        getInitialSingleSelectValue({
            defaultSelected: "NY",
        }, v1Options, v1Config),
        v1Options[0]
    );
    assert.equal(
        getInitialSingleSelectValue({
            defaultValue: "LDN",
        }, v1Options, v1Config),
        v1Options[1]
    );
    assert.equal(
        getControlledSingleSelectValue({
            selected: null,
        }, v1Options, v1Config),
        null
    );
});

test("uses optionValue only for the underlying PrimeReact value", () => {
    const option = { name: "London", code: "LDN" };
    assert.equal(
        getPrimeSingleSelectValue(option, {
            optionValue: "code",
        }),
        "LDN"
    );
    assert.equal(getPrimeSingleSelectValue(option), option);
    assert.equal(
        getPrimeSingleSelectValue({
            label: "London",
            value: "LDN",
        }),
        "LDN"
    );
});

test("respects default, field, and callback disabled options", () => {
    assert.equal(
        isSingleSelectOptionDisabled({ disabled: true }),
        true
    );
    assert.equal(
        isSingleSelectOptionDisabled(
            { unavailable: true },
            "unavailable"
        ),
        true
    );
    assert.equal(
        isSingleSelectOptionDisabled(
            { code: "LDN" },
            option => option.code === "LDN"
        ),
        true
    );
    assert.equal(
        isSingleSelectOptionDisabled({ disabled: false }),
        false
    );
});

test("deduplicates V1 and V2 selection callbacks", () => {
    const calls = [];
    const shared = value => calls.push(value);
    callSingleSelectCallbacks({
        onSelectedChange: shared,
        selectedChange: shared,
        onChange: shared,
    }, v1Options[1], { type: "change" });

    assert.deepEqual(calls, [v1Options[1]]);
});

test("restores custom-id Temporal values through registry metadata", () => {
    const calls = [];
    const restored = restoreSingleSelectTemporalValue({
        restoreWidgetValue: (...args) => {
            calls.push(args);
            return true;
        },
        target: "customer-city-filter",
        value: "LDN",
    });

    assert.equal(restored, true);
    assert.deepEqual(calls, [[
        "customer-city-filter",
        "LDN",
        "history",
    ]]);
    assert.equal(getSingleSelectCaller("NY", "LDN"), "LDN");
    assert.equal(getSingleSelectCaller("LDN", null), "LDN");
});

test("does not select an unknown primitive provenance key", () => {
    assert.equal(
        provenanceValueToSingleSelect(
            "UNKNOWN",
            v1Options,
            v1Config
        ),
        null
    );
});
