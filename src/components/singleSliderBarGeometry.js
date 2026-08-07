// PW1.0 draws every single-slider aggregate bar at a fixed 8px width.
// Keeping this in screen pixels makes bars identical across page layouts,
// slider ranges, and step sizes.
export const SINGLE_SLIDER_BAR_WIDTH = 8;

export const getSingleSliderBarGeometry = ({
    value,
    min,
    max,
    width,
    barWidth = SINGLE_SLIDER_BAR_WIDTH,
}) => {
    const safeWidth = Math.max(0, Number(width) || 0);
    const safeBarWidth = Math.max(1, Number(barWidth) || 0);
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
        x: center - (safeBarWidth / 2),
        width: safeBarWidth,
        center,
    };
};
