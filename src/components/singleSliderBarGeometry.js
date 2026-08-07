export const getSingleSliderBarGeometry = ({
    value,
    min,
    max,
    width,
    keyCount,
    barWidthFactor = 0.25,
}) => {
    const safeWidth = Math.max(0, Number(width) || 0);
    const slotWidth = keyCount > 1
        ? safeWidth / (keyCount - 1)
        : safeWidth;
    const barWidth = Math.max(1, slotWidth * barWidthFactor);
    const numericValue = Number(value);
    const numericMin = Number(min);
    const numericMax = Number(max);
    const center = (
        Number.isFinite(numericValue) &&
        Number.isFinite(numericMin) &&
        Number.isFinite(numericMax) &&
        numericMax !== numericMin
    )
        ? ((numericValue - numericMin) / (numericMax - numericMin)) * safeWidth
        : safeWidth / 2;

    return {
        x: center - (barWidth / 2),
        width: barWidth,
        center,
    };
};
