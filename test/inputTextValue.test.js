import test from "node:test";
import assert from "node:assert/strict";
import {
    buildInputTextTemporalEntries,
    callInputTextCallbacks,
    getControlledInputTextValue,
    getInitialInputTextValue,
    getInputTextEventValue,
    normalizeInputTextValue,
    restoreInputTextTemporalValue,
} from "../src/components/inputTextValue.js";

test("keeps every committed search as a separate Temporal entry", () => {
    const timestamp = new Date("2026-03-01T10:00:00.000Z");
    const sortedRecords = [
        [1, {
            index: 1,
            value: "pizza",
            time: timestamp,
            kind: "interaction",
            source: "user",
        }],
        [2, {
            index: 2,
            value: "pasta",
            time: timestamp,
            kind: "interaction",
            source: "user",
        }],
        [3, {
            index: 3,
            value: "pizza",
            time: timestamp,
            kind: "interaction",
            source: "user",
        }],
    ];

    const entries = buildInputTextTemporalEntries({
        sortedRecords,
        hasRecordKinds: true,
        sequenceTotal: 3,
    });

    assert.equal(entries.length, 3);
    assert.deepEqual(
        entries.map(([, records]) => records[0].value),
        ["pizza", "pasta", "pizza"]
    );
    assert.deepEqual(
        entries.map(([, records]) => records[0].sequenceIndex),
        [1, 2, 3]
    );
    assert.equal(entries[0][1][0].select.index, 1);
    assert.equal(entries[0][1][0].time, timestamp);
});

test("normalizes controlled, default, empty, and field-based text values", () => {
    assert.equal(
        getControlledInputTextValue({ value: "pizza" }),
        "pizza"
    );
    assert.equal(
        getControlledInputTextValue({
            value: { label: "pasta" },
            field: "label",
        }),
        "pasta"
    );
    assert.equal(
        getInitialInputTextValue({ defaultValue: 42 }),
        "42"
    );
    assert.equal(normalizeInputTextValue(null), "");
    assert.equal(normalizeInputTextValue(undefined), undefined);
});

test("commits the live native input value instead of stale component state", () => {
    assert.equal(
        getInputTextEventValue(
            {
                currentTarget: {
                    value: "latest typed value",
                },
            },
            "stale state"
        ),
        "latest typed value"
    );
    assert.equal(
        getInputTextEventValue({}, "fallback state"),
        "fallback state"
    );
});

test("separates live typing callbacks from committed value callbacks", () => {
    const calls = [];
    const sharedCommit = value => calls.push(["commit", value]);
    const props = {
        onChange: value => calls.push(["change", value]),
        onValueChange: sharedCommit,
        valueChange: sharedCommit,
    };

    callInputTextCallbacks(props, "piz", { type: "change" }, {
        includeCommit: false,
    });
    callInputTextCallbacks(props, "pizza", { type: "keyup" }, {
        includeChange: false,
    });

    assert.deepEqual(calls, [
        ["change", "piz"],
        ["commit", "pizza"],
    ]);
});

test("restores a clicked Input Text Temporal value through metadata", () => {
    const calls = [];
    const restored = restoreInputTextTemporalValue({
        restoreWidgetValue: (...args) => {
            calls.push(args);
            return true;
        },
        target: "query-with-custom-id",
        value: "mushroom pizza",
    });

    assert.equal(restored, true);
    assert.deepEqual(calls, [[
        "query-with-custom-id",
        "mushroom pizza",
        "history",
    ]]);
});
