import test from "node:test";
import assert from "node:assert/strict";
import {
    getRegistrationElement,
    normalizeWidgetRegistration,
    registerWidgetInMap,
    unregisterWidgetFromMap,
} from "@provenance-widgets/core";

const createRegistration = (overrides = {}) => ({
    id: "price",
    type: "single-slider",
    provenance: { detailedData: new Map() },
    getValue: () => 10,
    setValue: () => {},
    ...overrides,
});

test("registers complete widget metadata without mutating the old Map", () => {
    const previous = new Map();
    const registration = createRegistration();
    const next = registerWidgetInMap(previous, registration);

    assert.equal(previous.size, 0);
    assert.equal(next.get("price"), registration);
    assert.equal(normalizeWidgetRegistration(registration), registration);
});

test("rejects incomplete or unknown widget registrations", () => {
    assert.throws(
        () => normalizeWidgetRegistration(createRegistration({
            type: "mystery-widget",
        })),
        /Unsupported widget registration type/
    );
    assert.throws(
        () => normalizeWidgetRegistration(createRegistration({
            setValue: undefined,
        })),
        /requires setValue/
    );
});

test("unregister cleanup cannot remove a newer registration with the same id", () => {
    const first = createRegistration();
    const second = createRegistration({ getValue: () => 20 });
    const current = registerWidgetInMap(
        registerWidgetInMap(new Map(), first),
        second
    );

    assert.equal(
        unregisterWidgetFromMap(current, "price", first),
        current
    );
    const removed = unregisterWidgetFromMap(current, "price", second);
    assert.equal(removed.has("price"), false);
});

test("resolves the registered element through elementRef", () => {
    const element = { id: "price-wrapper" };
    assert.equal(
        getRegistrationElement(createRegistration({
            element: { id: "stale" },
            elementRef: { current: element },
        })),
        element
    );
});
