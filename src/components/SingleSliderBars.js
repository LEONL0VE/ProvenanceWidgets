import { normalize } from "./utils.js";
import { getSingleSliderBarGeometry } from "./singleSliderBarGeometry.js";

const SingleSliderBars = ({
    guidance,
    barKeys,
    min,
    max,
    width,
    height,
    orientationScheme,
    barWidthFactor = 0.25,
}) => {
    const domainMin = Number(min);
    const domainMax = Number(max);
    const countDomain = guidance.domain?.get("count") ?? [0, 1];
    const colorDomain = guidance.domain?.get("index") ?? [0, 1];
    const countStart = Number(countDomain[0]) || 0;
    const countEnd = Number(countDomain[1]) || 0;
    const visibleKeys = barKeys.filter(key =>
        guidance.aggregateData?.has(key)
    );
    const recentKey = visibleKeys.reduce((recent, key) => {
        if (recent === null) return key;
        const keyIndex = guidance.aggregateData?.get(key)?.index ?? -Infinity;
        const recentIndex =
            guidance.aggregateData?.get(recent)?.index ?? -Infinity;
        return keyIndex > recentIndex ? key : recent;
    }, null);

    const scaleCount = count => {
        if (countEnd <= countStart) return 0;
        return Math.max(
            0,
            ((Number(count) - countStart) / (countEnd - countStart)) * height
        );
    };

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            style={{ overflow: "visible" }}
            aria-hidden="true"
        >
            {visibleKeys.map(key => {
                const record = guidance.aggregateData.get(key);
                const barHeight = scaleCount(record?.count);
                const geometry = getSingleSliderBarGeometry({
                    value: key,
                    min: domainMin,
                    max: domainMax,
                    width,
                    keyCount: barKeys.length,
                    barWidthFactor,
                });
                const isRecent = key === recentKey;

                return (
                    <rect
                        key={key}
                        x={geometry.x}
                        y={height - barHeight}
                        width={geometry.width}
                        height={barHeight}
                        fill={orientationScheme(
                            normalize(record?.index, colorDomain)
                        )}
                        stroke={isRecent ? "#000" : "none"}
                        strokeWidth={isRecent ? 2 : 0}
                    />
                );
            })}
        </svg>
    );
};

export default SingleSliderBars;
