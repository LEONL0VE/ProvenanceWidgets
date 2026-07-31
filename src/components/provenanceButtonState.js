const isInteractionRecord = record =>
    Boolean(record) && (
        record.kind === undefined || record.kind === "interaction"
    );

export const hasUserProvenance = provenance => {
    if (!provenance?.detailedData) return false;
    if (provenance.hasUserInteracted === true) return true;

    for (const value of provenance.detailedData.values()) {
        if (Array.isArray(value)) {
            if (value.some(record => (
                isInteractionRecord(record?.select) ||
                isInteractionRecord(record?.unselect)
            ))) {
                return true;
            }
            continue;
        }
        if (isInteractionRecord(value)) return true;
    }
    return false;
};

export const getProvenanceButtonState = ({
    provenance,
    visualize = true,
    open = false,
}) => {
    if (!visualize) return "hidden";
    if (!hasUserProvenance(provenance)) return "disabled";
    return open ? "temporal" : "aggregate";
};

export const isInsideProvenanceInteraction = ({
    eventTarget,
    buttonElement,
    target,
}) => {
    if (buttonElement?.contains?.(eventTarget)) return true;
    const chart = eventTarget?.closest?.(
        "[data-provenance-chart-target]"
    );
    return (
        chart?.getAttribute?.("data-provenance-chart-target") === target
    );
};
