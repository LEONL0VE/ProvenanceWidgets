const WIDGET_TYPES = new Set([
    "single-slider",
    "range-slider",
    "input-text",
    "dropdown",
    "multiselect",
    "radio-group",
    "checkbox-group",
]);

export const normalizeWidgetRegistration = registration => {
    if (!registration || typeof registration !== "object") {
        throw new TypeError("A widget registration object is required");
    }
    if (
        typeof registration.id !== "string" ||
        registration.id.length === 0
    ) {
        throw new TypeError("A widget registration requires a non-empty id");
    }
    if (!WIDGET_TYPES.has(registration.type)) {
        throw new TypeError(
            `Unsupported widget registration type: ${String(registration.type)}`
        );
    }
    if (!registration.provenance) {
        throw new TypeError(
            `Widget registration "${registration.id}" requires provenance`
        );
    }
    if (typeof registration.getValue !== "function") {
        throw new TypeError(
            `Widget registration "${registration.id}" requires getValue`
        );
    }
    if (typeof registration.setValue !== "function") {
        throw new TypeError(
            `Widget registration "${registration.id}" requires setValue`
        );
    }

    return registration;
};

export const registerWidgetInMap = (registrations, registration) => {
    const normalized = normalizeWidgetRegistration(registration);
    const next = registrations instanceof Map
        ? new Map(registrations)
        : new Map();
    next.set(normalized.id, normalized);
    return next;
};

export const unregisterWidgetFromMap = (
    registrations,
    id,
    expectedRegistration
) => {
    if (!(registrations instanceof Map) || !registrations.has(id)) {
        return registrations instanceof Map
            ? registrations
            : new Map();
    }
    if (
        expectedRegistration !== undefined &&
        registrations.get(id) !== expectedRegistration
    ) {
        return registrations;
    }

    const next = new Map(registrations);
    next.delete(id);
    return next;
};

export const getRegistrationElement = registration => {
    if (!registration) return null;
    return (
        registration.elementRef?.current ??
        registration.element ??
        null
    );
};
