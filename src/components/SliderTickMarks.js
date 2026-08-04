import { useMemo } from "react";
import {
    buildSliderLabels,
    buildSliderTicks,
    getSliderPosition,
} from "./sliderTicks.js";

const labelTransform = position => {
    if (position <= 0) return "translateX(0)";
    if (position >= 100) return "translateX(-100%)";
    return "translateX(-50%)";
};

const SliderTickMarks = ({
    min,
    max,
    step,
    tickStep,
    ticksArray,
    values,
    formatValue,
    trackBottom = 24,
}) => {
    const ticks = useMemo(
        () => buildSliderTicks({
            min,
            max,
            step: tickStep ?? step,
            ticksArray,
        }),
        [min, max, step, tickStep, ticksArray]
    );
    const labels = useMemo(
        () => buildSliderLabels({ min, max, values }),
        [min, max, values]
    );
    const formatter = typeof formatValue === "function"
        ? formatValue
        : value => String(value);

    return (
        <div
            aria-hidden="true"
            data-provenance-slider-ticks="true"
            style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                color: "#55627a",
                fontSize: "12px",
                lineHeight: 1,
            }}
        >
            {ticks.map(value => {
                const position = getSliderPosition(value, min, max);
                return (
                    <span
                        key={`tick-${value}`}
                        style={{
                            position: "absolute",
                            left: `${position}%`,
                            bottom: `${trackBottom - 5}px`,
                            width: "1px",
                            height: "10px",
                            backgroundColor: "#f2ddd0",
                            transform: "translateX(-0.5px)",
                        }}
                    />
                );
            })}
            {labels.map(value => {
                const position = getSliderPosition(value, min, max);
                return (
                    <span
                        key={`label-${value}`}
                        style={{
                            position: "absolute",
                            left: `${position}%`,
                            bottom: 0,
                            transform: labelTransform(position),
                            whiteSpace: "nowrap",
                            fontWeight: 600,
                        }}
                    >
                        {formatter(value)}
                    </span>
                );
            })}
        </div>
    );
};

export default SliderTickMarks;
