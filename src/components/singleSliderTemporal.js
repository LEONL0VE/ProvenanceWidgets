const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, value));

export const normalizeTemporalBrush = value => value === true;

export const brushSelectionToIndexRange = (
    selection,
    height,
    entryCount
) => {
    if (
        !Array.isArray(selection) ||
        selection.length !== 2 ||
        !Number.isFinite(height) ||
        height <= 0 ||
        !Number.isInteger(entryCount) ||
        entryCount <= 0
    ) {
        return null;
    }

    const top = clamp(Math.min(...selection), 0, height);
    const bottom = clamp(Math.max(...selection), 0, height);
    const start = clamp(
        Math.floor((top / height) * entryCount),
        0,
        entryCount - 1
    );
    const end = clamp(
        Math.max(
            start,
            Math.ceil((bottom / height) * entryCount) - 1
        ),
        0,
        entryCount - 1
    );
    return [start, end];
};

export const filterTemporalEntries = (entries, range) => {
    if (!Array.isArray(entries)) return [];
    if (!range) return entries;
    const [start, end] = range;
    return entries.slice(start, end + 1);
};

export const brushSelectionToPositionRange = (
    selection,
    positions
) => {
    if (
        !Array.isArray(selection) ||
        selection.length !== 2 ||
        !Array.isArray(positions) ||
        positions.length === 0
    ) {
        return null;
    }

    const top = Math.min(...selection);
    const bottom = Math.max(...selection);
    let start = positions.findIndex(position => position >= top);
    let end = -1;
    for (let index = positions.length - 1; index >= 0; index -= 1) {
        if (positions[index] <= bottom) {
            end = index;
            break;
        }
    }

    if (start === -1) start = positions.length - 1;
    if (end === -1) end = 0;
    if (start > end) {
        const center = (top + bottom) / 2;
        const nearest = positions.reduce(
            (best, position, index) =>
                Math.abs(position - center) <
                Math.abs(positions[best] - center)
                    ? index
                    : best,
            0
        );
        return [nearest, nearest];
    }
    return [start, end];
};

const getEntryRecord = entry => entry?.[1]?.[0];

export const getTemporalYPositions = (
    entries,
    mode,
    height
) => {
    if (!Array.isArray(entries) || entries.length === 0) return [];
    if (entries.length === 1) return [height / 2];

    const padding = 8;
    const drawableHeight = Math.max(0, height - (padding * 2));
    if (mode !== "time") {
        return entries.map((_, index) =>
            padding + ((index / (entries.length - 1)) * drawableHeight)
        );
    }

    const timestamps = entries.map(entry => {
        const value =
            getEntryRecord(entry)?.time ??
            getEntryRecord(entry)?.select?.time;
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.getTime();
    });
    const valid = timestamps.filter(value => value !== null);
    if (valid.length !== timestamps.length) {
        return getTemporalYPositions(entries, "interaction", height);
    }

    const minTime = Math.min(...valid);
    const maxTime = Math.max(...valid);
    if (minTime === maxTime) {
        return getTemporalYPositions(entries, "interaction", height);
    }
    return timestamps.map(timestamp =>
        padding + (
            ((timestamp - minTime) / (maxTime - minTime)) *
            drawableHeight
        )
    );
};

export const restoreTemporalPoint = ({
    restoreWidgetValue,
    target,
    record,
    range = false,
}) => {
    if (typeof restoreWidgetValue !== "function" || !record) return false;
    const value = range
        ? record.value
        : (
            Array.isArray(record.value)
                ? record.value[0]
                : record.value ?? record.select?.index
        );
    if (value === undefined) return false;
    return restoreWidgetValue(target, value, "history");
};
