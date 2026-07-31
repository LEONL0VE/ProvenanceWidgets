import assert from "node:assert/strict";
import test from "node:test";
import {
    COMMON_ATTRIBUTE_SCHEMA,
    WEB_COMPONENT_EVENTS,
    WEB_COMPONENT_NAMES,
    dispatchProvenanceElementEvent,
    getAttributeProperties,
    parseBooleanAttribute,
    parseNumberAttribute,
} from "../src/web-components/elementContract.js";

test("exposes the six PW 1.0 custom-element names", () => {
    assert.deepEqual(WEB_COMPONENT_NAMES, [
        "web-provenance-slider",
        "web-provenance-multiselect",
        "web-provenance-dropdown",
        "web-provenance-checkbox",
        "web-provenance-radiobutton",
        "web-provenance-inputtext",
    ]);
});

test("keeps the PW 1.0 value and provenance event names", () => {
    assert.deepEqual(WEB_COMPONENT_EVENTS.slider, [
        "valueChange",
        "highValueChange",
        "selectedChange",
        "provenanceChange",
    ]);
    assert.deepEqual(
        WEB_COMPONENT_EVENTS.inputtext,
        ["valueChange", "provenanceChange"]
    );
    for (const kind of [
        "dropdown",
        "multiselect",
        "radiobutton",
        "checkbox",
    ]) {
        assert.deepEqual(
            WEB_COMPONENT_EVENTS[kind],
            ["selectedChange", "provenanceChange"]
        );
    }
});

test("parses boolean and numeric attributes without JSON coercion", () => {
    assert.equal(parseBooleanAttribute(""), true);
    assert.equal(parseBooleanAttribute("true"), true);
    assert.equal(parseBooleanAttribute("false"), false);
    assert.equal(parseBooleanAttribute("0"), false);
    assert.equal(parseBooleanAttribute(null), undefined);
    assert.equal(parseNumberAttribute("250"), 250);
    assert.equal(parseNumberAttribute("invalid"), undefined);
});

test("maps common kebab-case attributes to React properties", () => {
    const attributes = new Map([
        ["mode", "time"],
        ["sample-interval-ms", "500"],
        ["freeze", "false"],
        ["visualize", ""],
        ["data-label", "Price"],
        ["temporal-brush", "true"],
    ]);
    const element = {
        getAttribute(name) {
            return attributes.has(name)
                ? attributes.get(name)
                : null;
        },
    };

    assert.deepEqual(
        getAttributeProperties(
            element,
            COMMON_ATTRIBUTE_SCHEMA
        ),
        {
            mode: "time",
            sampleIntervalMs: 500,
            freeze: false,
            visualize: true,
            dataLabel: "Price",
            temporalBrush: true,
        }
    );
});

test("dispatches bubbling composed CustomEvents with direct detail", () => {
    const previousCustomEvent = globalThis.CustomEvent;
    globalThis.CustomEvent = class CustomEvent extends Event {
        constructor(name, options) {
            super(name, options);
            this.detail = options.detail;
            this.composedValue = options.composed;
        }

        get composed() {
            return this.composedValue;
        }
    };
    try {
        const element = new EventTarget();
        const detail = { data: [{ value: 42 }] };
        let received;
        element.addEventListener(
            "provenanceChange",
            event => {
                received = event;
            }
        );

        dispatchProvenanceElementEvent(
            element,
            "provenanceChange",
            detail
        );

        assert.equal(received.detail, detail);
        assert.equal(received.bubbles, true);
        assert.equal(received.composed, true);
    } finally {
        globalThis.CustomEvent = previousCustomEvent;
    }
});
