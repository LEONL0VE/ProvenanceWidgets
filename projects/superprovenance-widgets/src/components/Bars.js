import useLinearScale from "./hooks/useLinearScale.js";
import { scaleBand, interpolateRgb } from "d3";
import { normalize } from "./utils.js";
import useGuidanceSymbol from "./hooks/useGuidanceSymbol.js";
import React from "react";

function toDimension(orientation) {
    return orientation === "horizontal" ? "width" : "height";
}

function antiDimension(dimension) {
    return dimension === "width" ? "height" : "width";
}

// Custom lighter orange color scale
// This scale was hardcoded here for RangeSlider but it should be passed as a prop for flexibility.
// Removing the override logic to respect props.orientationScheme.
// const customOrangeScale = interpolateRgb("#fff7e6", "#ff9c4a");

export default function Bars(props) {
    const {
        guidance,
        encodings: { orientation, positionDomain, colorDomain },
    } = props;
    
    // Use the passed orientationScheme directly.
    const effectiveColorScheme = props.orientationScheme;

    const _symbol = useGuidanceSymbol(guidance);
    const primaryDimension = toDimension(orientation);
    const secondaryDimension = antiDimension(primaryDimension);
    const primaryExtrema = props[primaryDimension];
    const secondaryExtrema = props[secondaryDimension];

    const aggregateKeys = guidance?.aggregateData?.keys() || [];
    const keysToRender = Array.isArray(props.barKeys) ? props.barKeys : [...aggregateKeys];
    const filteredKeys = keysToRender.filter((key) => {
        const hasAggregate = guidance?.aggregateData?.has?.(key);
        const hasDetail = guidance?.detailedData?.has?.(key);
        return Boolean(hasAggregate || hasDetail);
    });

    const scale = useLinearScale(positionDomain, guidance, [0, primaryExtrema]);
    let recentValue = null;
    let secondRecentValue = null;
    let recentKey = null;
    let secondRecentKey = null;
    if (guidance && guidance.detailedData && guidance.detailedData.size > 0) {
        const arr = [...guidance.detailedData.values()].toSorted((a, b) => a.index - b.index);
        recentValue = arr.at(-1)?.value ?? null;
        secondRecentValue = arr.length > 1 ? arr.at(-2)?.value ?? null : null;
        // SelectionProvenance support: compute recent/second recent by key
        const entries = [...guidance.detailedData.entries()];
        const isSelection = entries.length > 0 && Array.isArray(entries[0][1]) && entries[0][1][0]?.select;
        if (isSelection) {
            const latestByKey = entries.map(([key, arr]) => {
                const last = arr.at(-1);
                const lastIndex = (last?.unselect?.index ?? last?.select?.index) ?? -1;
                return { key, index: lastIndex };
            }).toSorted((a, b) => a.index - b.index);
            recentKey = latestByKey.at(-1)?.key ?? null;
            secondRecentKey = latestByKey.length > 1 ? latestByKey.at(-2)?.key ?? null : null;
        }
    }

    // Use scalePoint for slider alignment to ensure endpoints match exactly (0 and width)
    // scaleBand puts standard padding and centers differently.
    // If layout is 'slider', we assume keys are numeric/ordered and we want them centered on the ticks.
    let xPos, barWidth;
    let rangeIntervalThickness = 10;
    let intervals = [];
    let stepCounts = null;
    let maxStepCount = 1;

    if (props.layout === 'slider' || props.layout === 'range-interval') {
        // Calculate step width based on range
        // We assume barKeys are sorted discrete steps: min, min+step, ... max
        const minVal = props.barKeys[0];
        const maxVal = props.barKeys.length > 1 ? props.barKeys[props.barKeys.length - 1] : props.barKeys[0];
        const count = props.barKeys.length;

        // Map value directly to position 0..secondaryExtrema
        // x = (val - min) / (max - min) * width
        const getX = (val) => {
            if (maxVal === minVal) return 0;
            return ((val - minVal) / (maxVal - minVal)) * secondaryExtrema;
        };

        // Determine a reasonable bar width (e.g., half the distance between steps)
        // If count > 1, distance = width / (count - 1)
        const stepDist = count > 1 ? secondaryExtrema / (count - 1) : secondaryExtrema;
        const bWidth = stepDist * (props.barWidthFactor ?? 0.1);

        xPos = (v) => getX(v) - bWidth / 2;
        barWidth = bWidth;
        if (props.layout === 'range-interval') {
            // Build intervals from provenance detailedData if available
            if (guidance && guidance.detailedData && guidance.detailedData.size > 0) {
                const records = [...guidance.detailedData.values()].toSorted((a, b) => a.index - b.index);
                intervals = records.map(rec => {
                    const a = Math.min(rec.value[0], rec.value[1]);
                    const b = Math.max(rec.value[0], rec.value[1]);
                    const xA = getX(a);
                    const xB = getX(b);
                    return {
                        x: xA,
                        width: Math.max(0, xB - xA),
                        index: rec.index,
                        a,
                        b
                    };
                });
                // Compute nesting depth: how many earlier intervals fully contain this one
                for (let i = 0; i < intervals.length; i++) {
                    let depth = 0;
                    for (let j = 0; j < i; j++) {
                        const outer = intervals[j];
                        if (outer.a <= intervals[i].a && outer.b >= intervals[i].b) {
                            depth++;
                        }
                    }
                    intervals[i].depth = depth;

                    // Detect expansion from previous range (for highlighting)
                    if (i > 0) {
                        const prev = intervals[i - 1];
                        const curr = intervals[i];
                        // Current contains previous and is larger
                        const isExpansion = curr.a <= prev.a && curr.b >= prev.b && (curr.a < prev.a || curr.b > prev.b);
                        if (isExpansion) {
                            intervals[i - 1].isExpansionHighlight = true;
                            intervals[i].isExpansionHighlight = true;
                        }
                    }
                }
                // Pre-calculate heights based on inverse width (Smallest width = Tallest bar)
                const maxH = Math.floor(props.height * 0.8);
                const minH = Math.ceil(props.height * 0.2);

                const widths = intervals.map(i => i.width);
                const minW = Math.min(...widths);
                const maxW = Math.max(...widths);

                intervals.forEach(seg => {
                    if (Math.abs(maxW - minW) < 0.1) {
                        // All roughly same width
                        seg.assignedHeight = maxH;
                    } else {
                        // Inverse linear interpolation: small width -> large height
                        const ratio = (seg.width - minW) / (maxW - minW); // 0 (smallest) to 1 (largest)
                        seg.assignedHeight = maxH - (ratio * (maxH - minH));
                    }
                });
            } else if (Array.isArray(props.rangeInterval) && props.rangeInterval.length === 2) {
                const a = Math.min(props.rangeInterval[0], props.rangeInterval[1]);
                const b = Math.max(props.rangeInterval[0], props.rangeInterval[1]);
                const xA = getX(a);
                const xB = getX(b);
                intervals = [{
                    x: xA,
                    width: Math.max(0, xB - xA),
                    index: 1,
                    a,
                    b,
                    depth: 0
                }];
            }
            // rangeIntervalThickness = Math.max(4, Math.min(20, bWidth));

            // Build step counts from detailedData history:
            // Each step inside an interval increments its count, so subsets increase height.
            // Initialize counts for all discrete steps in barKeys
            stepCounts = new Map(props.barKeys.map(v => [v, 0]));
            if (guidance && guidance.detailedData && guidance.detailedData.size > 0) {
                const history = [...guidance.detailedData.values()];
                for (const rec of history) {
                    const a = Math.min(rec.value[0], rec.value[1]);
                    const b = Math.max(rec.value[0], rec.value[1]);
                    for (const v of props.barKeys) {
                        if (v >= a && v <= b) {
                            stepCounts.set(v, (stepCounts.get(v) || 0) + 1);
                        }
                    }
                }
            } else if (Array.isArray(props.rangeInterval) && props.rangeInterval.length === 2) {
                const a = Math.min(props.rangeInterval[0], props.rangeInterval[1]);
                const b = Math.max(props.rangeInterval[0], props.rangeInterval[1]);
                for (const v of props.barKeys) {
                    if (v >= a && v <= b) {
                        stepCounts.set(v, (stepCounts.get(v) || 0) + 1);
                    }
                }
            }
            maxStepCount = Math.max(1, ...stepCounts.values());
        }
    } else {
        // Default scaleBand behavior
        const band = scaleBand().domain(props.barKeys).range([0, secondaryExtrema]);
        xPos = (v) => band(v);
        barWidth = scaleBand().domain(props.barKeys).range([0, secondaryExtrema]).bandwidth();
    }

    return (
        <svg
            viewBox={`0 0 ${props.width} ${props.height}`}
            width={props.width}
            height={props.height}
            style={{ overflow: "visible", ...props.style }}
            preserveAspectRatio={props.preserveAspectRatio || "none"}
        >
            {props.layout !== 'range-interval' && [...filteredKeys].map((v) => {
                // Determine fill and height for base bars
                const fill = props.orientationScheme(
                    normalize(
                        guidance.aggregateData?.get(v)?.[colorDomain],
                        guidance.domain?.get(colorDomain)
                    )
                );
                let heightValue;
                heightValue = scale(guidance.aggregateData?.get(v)?.[positionDomain]);
                return (
                    <rect
                        key={`base-${v}`}
                        fill={fill}
                        opacity={
                            props.layout === 'checkbox'
                                ? (v === recentKey ? 0.9 : v === secondRecentKey ? 0.7 : 0.55)
                                : undefined
                        }
                        stroke={props.layout === 'checkbox'
                            ? ((v === recentKey || v === secondRecentKey) ? '#000' : 'none')
                            : ((v === recentValue || v === secondRecentValue) ? '#000' : 'none')}
                        strokeWidth={props.layout === 'checkbox'
                            ? ((v === recentKey || v === secondRecentKey) ? 2 : 0)
                            : ((v === recentValue || v === secondRecentValue) ? 2 : 0)}
                        strokeDasharray={props.layout === 'checkbox'
                            ? ((v === secondRecentKey) ? '4,2' : 'none')
                            : ((v === secondRecentValue) ? '4,2' : 'none')}
                        {...(orientation === "horizontal"
                            ? {
                                x: props.fullWidth ? 0 : scale(0),
                                y: xPos(v),
                                width: props.fullWidth ? primaryExtrema : scale(guidance.aggregateData?.get(v)?.[positionDomain]),
                                height: barWidth,
                            }
                            : {
                                x: xPos(v),
                                y: props.fullWidth
                                    ? 0
                                    : props.height - heightValue,
                                width: barWidth,
                                height: props.fullWidth ? primaryExtrema : heightValue,
                            })}
                    />
                );
            })}

            {props.layout === 'range-interval' && intervals.length > 0 && (() => {
                // Pre-process intervals to handle splitting
                // If an interval partially overlaps with the current (latest) interval, split it.
                // Current interval is the last one in the sorted-by-index list.
                const sortedIntervals = intervals.toSorted((a, b) => a.index - b.index);
                const currentInterval = sortedIntervals[sortedIntervals.length - 1];
                
                let processedIntervals = [];
                
                // Let's redefine a helper here for safety, using the same logic.
                const localGetX = (val) => {
                    // We need minVal, maxVal, secondaryExtrema from props/calculations
                    // These were also local to that if block...
                    // We need to access them. 
                    // props.barKeys is available.
                    // secondaryExtrema is available.
                    const minVal = props.barKeys[0];
                    const maxVal = props.barKeys.length > 1 ? props.barKeys[props.barKeys.length - 1] : props.barKeys[0];
                    if (maxVal === minVal) return 0;
                    return ((val - minVal) / (maxVal - minVal)) * secondaryExtrema;
                };

                sortedIntervals.forEach((seg, i) => {
                    const isCurrent = i === sortedIntervals.length - 1;
                    
                    if (isCurrent) {
                        // Check if this is an expansion of the previous interaction
                        // Expansion means curr contains prev and is larger
                        let isExpansion = false;
                        if (sortedIntervals.length > 1) {
                            const prev = sortedIntervals[sortedIntervals.length - 2];
                            const curr = seg;
                            isExpansion = curr.a <= prev.a && curr.b >= prev.b && (curr.a < prev.a || curr.b > prev.b);
                        }

                        if (isExpansion) {
                            // Do not render the current bar if it's an expansion
                            return;
                        }

                        processedIntervals.push({ ...seg, isCurrent: true, originalIndex: i });
                        return;
                    }

                    // Check for overlap with current interval
                    // Overlap logic: start1 < end2 && start2 < end1
                    const overlaps = seg.a < currentInterval.b && currentInterval.a < seg.b;
                    
                    // If fully contained or disjoint, keep as is
                    if (!overlaps || (seg.a >= currentInterval.a && seg.b <= currentInterval.b)) {
                        processedIntervals.push({ ...seg, isCurrent: false, originalIndex: i });
                        return;
                    }

                    // Partial overlap - split logic
                    // We only care about splitting the 'seg' (older interval)
                    
                    // Case 1: Left part outside, Right part inside
                    // [ seg.a ... current.a ... seg.b ]
                    if (seg.a < currentInterval.a && seg.b > currentInterval.a && seg.b <= currentInterval.b) {
                        // Split into [seg.a, current.a] (outside) and [current.a, seg.b] (inside)
                        const outside = { ...seg, b: currentInterval.a, width: localGetX(currentInterval.a) - localGetX(seg.a), isCurrent: false, originalIndex: i, isSplitOutside: true };
                        const inside = { ...seg, a: currentInterval.a, width: localGetX(seg.b) - localGetX(currentInterval.a), x: localGetX(currentInterval.a), isCurrent: false, originalIndex: i, isSplitInside: true };
                        processedIntervals.push(outside, inside);
                    }
                    // Case 2: Left part inside, Right part outside
                    // [ current.a ... seg.a ... current.b ... seg.b ] -- wait, seg.a >= current.a is covered by fully contained check if seg.b <= current.b
                    // Actual Case 2: [ seg.a ... current.b ... seg.b ] where seg.a >= current.a
                    else if (seg.a >= currentInterval.a && seg.a < currentInterval.b && seg.b > currentInterval.b) {
                        const inside = { ...seg, b: currentInterval.b, width: localGetX(currentInterval.b) - localGetX(seg.a), isCurrent: false, originalIndex: i, isSplitInside: true };
                        const outside = { ...seg, a: currentInterval.b, width: localGetX(seg.b) - localGetX(currentInterval.b), x: localGetX(currentInterval.b), isCurrent: false, originalIndex: i, isSplitOutside: true };
                        processedIntervals.push(inside, outside);
                    }
                    // Case 3: Encloses current interval (seg covers current fully and more)
                    // [ seg.a ... current.a ... current.b ... seg.b ]
                    else if (seg.a < currentInterval.a && seg.b > currentInterval.b) {
                         const left = { ...seg, b: currentInterval.a, width: localGetX(currentInterval.a) - localGetX(seg.a), isCurrent: false, originalIndex: i, isSplitOutside: true };
                         const middle = { ...seg, a: currentInterval.a, b: currentInterval.b, width: localGetX(currentInterval.b) - localGetX(currentInterval.a), x: localGetX(currentInterval.a), isCurrent: false, originalIndex: i, isSplitInside: true };
                         const right = { ...seg, a: currentInterval.b, width: localGetX(seg.b) - localGetX(currentInterval.b), x: localGetX(currentInterval.b), isCurrent: false, originalIndex: i, isSplitOutside: true };
                         processedIntervals.push(left, middle, right);
                    } else {
                        // Fallback
                         processedIntervals.push({ ...seg, isCurrent: false, originalIndex: i });
                    }
                });

                return processedIntervals.map((seg) => {
                        const isContained = currentInterval && 
                                          seg.a >= currentInterval.a && 
                                          seg.b <= currentInterval.b;
                        
                        // If it's a split part inside current range, it gets highlighted (same color as current)
                        // If it's outside, it gets its own color (but maybe dimmed/smaller?)
                        const colorIndex = (isContained || seg.isSplitInside) ? currentInterval.index : seg.index;

                        // Height logic:
                        // Current interval -> assignedHeight (calculated based on width)
                        // Contained/Inside Split -> assignedHeight (highlighted)
                        // Outside Split -> slightly smaller?
                        
                        let overlayThickness = seg.assignedHeight ?? (props.height * 0.5);
                        
                        // Adjust height for split parts to differentiate
                        if (seg.isSplitOutside) {
                             overlayThickness *= 0.8; // Make outside parts slightly shorter
                        }

                        const isPrev = seg.originalIndex === sortedIntervals.length - 2;
                        const isCurrent = seg.isCurrent;
                        const isHighlighted = isContained || seg.isSplitInside || isCurrent;

                        let isInPreviousRange = false;
                        if (sortedIntervals.length > 1) {
                            const prevRange = sortedIntervals[sortedIntervals.length - 2];
                            // Check overlap with prevRange
                            // seg is a split part or a full interval.
                            // We check if seg is fully contained in prevRange.
                            if (seg.a >= prevRange.a && seg.b <= prevRange.b) {
                                isInPreviousRange = true;
                            }
                        }

                        const isOutsideCurrent = !isContained && !seg.isSplitInside && !isCurrent;
                        
                        const showPrevBorder = isInPreviousRange && isOutsideCurrent;
                        const showCurrentBorder = isHighlighted; // isContained || isSplitInside || isCurrent

                        // Adjust opacity to be full for visibility
                        const t = 1.0; 
                        
                        return {
                            key: `interval-${seg.index}-${seg.a}-${seg.b}`,
                            x: seg.x,
                            y: props.height - overlayThickness,
                            width: seg.width,
                            height: overlayThickness,
                            fill: effectiveColorScheme(
                                normalize(colorIndex, guidance?.domain?.get("index") || [0, 1])
                            ),
                            opacity: t,
                            stroke: showPrevBorder || showCurrentBorder ? '#000' : 'none',
                            strokeWidth: showPrevBorder ? 2 : (showCurrentBorder ? 1 : 0),
                            strokeDasharray: showPrevBorder ? '4,2' : 'none',
                            zIndexScore: seg.width
                        };
                    })
                    .sort((a, b) => b.zIndexScore - a.zIndexScore) // Wider bars first (background)
                    .map((props) => (
                        <rect
                            key={props.key}
                            x={props.x}
                            y={props.y}
                            width={props.width}
                            height={props.height}
                            fill={props.fill}
                            opacity={props.opacity}
                            stroke={props.stroke}
                            strokeWidth={props.strokeWidth}
                            strokeDasharray={props.strokeDasharray}
                        />
                    ));
            })()}
        </svg>
    );
}
