import {
    useCallback,
    useEffect,
    useRef,
    useMemo,
    useState,
} from "react";
import * as d3 from "d3";
import useProvenance from './hooks/useProvenance.js';
import useProvenanceTooltip from './hooks/useProvenanceTooltip.js';
import useWidgetRegistry from './hooks/useWidgetRegistry.js';
import { interpolateOranges } from 'd3'; // Import color scale
import { formatTemporalTooltip, getTooltipAnchorProps } from './provenanceTooltip.js';
import {
    brushSelectionToPositionRange,
    filterTemporalEntries,
    getTemporalYPositions,
    normalizeTemporalBrush,
    restoreTemporalPoint,
} from './singleSliderTemporal.js';

const TEMPORAL_BRUSH_HEIGHT = 240;

const TemporalBrush = ({
    mode,
    onRangeChange,
    positions,
    target,
    tooltipId,
    widgetType,
}) => {
    const brushRef = useRef(null);
    const entryCount = positions.length;

    useEffect(() => {
        if (!brushRef.current || entryCount <= 1) return undefined;

        const brush = d3
            .brushY()
            // PW 1.0 attaches brushY to the y-axis and extends its hit area
            // to the left, instead of reserving a separate blank gutter.
            .extent([[-42, 0], [0, TEMPORAL_BRUSH_HEIGHT]])
            .on("end", event => {
                const range = brushSelectionToPositionRange(
                    event.selection,
                    positions
                );
                onRangeChange(range);
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent(
                        "provenance-widgets",
                        {
                            detail: {
                                id: target,
                                widget: widgetType,
                                mode,
                                interaction: "brush-end",
                                data: {
                                    selection: event.selection,
                                    range,
                                },
                            },
                        }
                    ));
                }
            });

        const brushGroup = d3.select(brushRef.current).call(brush);
        brushGroup
            .selectAll(".overlay")
            .attr("fill", "rgba(113, 231, 251, 0.06)")
            .style("cursor", "ns-resize");
        brushGroup
            .selectAll(".selection")
            .attr("fill", "#71e7fb")
            .attr("fill-opacity", 0.24)
            .attr("stroke", "#17a2b8")
            .attr("stroke-width", 1.5);
        brushGroup
            .selectAll(".handle")
            .attr("fill", "#17a2b8")
            .attr("fill-opacity", 0.8);
        return () => {
            d3.select(brushRef.current).on(".brush", null);
        };
    }, [
        entryCount,
        mode,
        onRangeChange,
        positions,
        target,
        widgetType,
    ]);

    if (entryCount <= 1) return null;
    const tickStride = Math.max(1, Math.ceil(entryCount / 8));
    const ticks = positions
        .map((position, index) => ({ position, index }))
        .filter(({ index }) => (
            mode === "time"
                ? index === 0 || index === entryCount - 1
                : (
                    index % tickStride === 0 ||
                    index === entryCount - 1
                )
        ));
    const tooltipProps = getTooltipAnchorProps(
        tooltipId,
        "Drag vertically to zoom the history range. " +
        "Click outside the selection to show all history."
    );

    return (
        <div
            {...tooltipProps}
            style={{
                ...tooltipProps.style,
                flex: "0 0 64px",
                width: "64px",
            }}
        >
            <svg
                aria-label={
                    `Drag vertically to zoom ${widgetType} history`
                }
                data-provenance-temporal-brush={target}
                width="64"
                height={TEMPORAL_BRUSH_HEIGHT}
                style={{ display: "block", overflow: "visible" }}
            >
                <title>
                    Drag vertically to zoom; clear the selection to reset
                </title>
                <text
                    x="10"
                    y={TEMPORAL_BRUSH_HEIGHT / 2}
                    fill="#6c757d"
                    fontSize="11"
                    textAnchor="middle"
                    transform={
                        `rotate(-90 10 ${TEMPORAL_BRUSH_HEIGHT / 2})`
                    }
                >
                    {mode === "time"
                        ? "time · drag to zoom"
                        : "interaction · drag to zoom"}
                </text>
                <line
                    x1="58"
                    x2="58"
                    y1="0"
                    y2={TEMPORAL_BRUSH_HEIGHT}
                    stroke="#6c757d"
                />
                {ticks.map(({ position, index }) => (
                    <g key={index}>
                        <line
                            x1="52"
                            x2="58"
                            y1={position}
                            y2={position}
                            stroke="#6c757d"
                        />
                        <text
                            x="49"
                            y={position}
                            dy="0.32em"
                            fill="#6c757d"
                            fontSize="10"
                            textAnchor="end"
                        >
                            {mode === "time"
                                ? index === 0 ? "t=0" : "now"
                                : index}
                        </text>
                    </g>
                ))}
                <g ref={brushRef} transform="translate(58,0)" />
            </svg>
        </div>
    );
};

const Chart = ({
    target,
    part = "full",
    theme = "dark",
    provenance,
    mode = "interaction",
    temporalBrush = false,
}) => {
    // part: "full" | "header" | "body"
    // theme: "dark" | "light"
    const chartRef = useRef(null);
    const [registeredComponents] = useProvenance();
    const { restoreWidgetValue } = useWidgetRegistry();
    const tooltipId = useProvenanceTooltip();
    const [brushRange, setBrushRange] = useState(null);
    const handleBrushRangeChange = useCallback(
        range => setBrushRange(range),
        []
    );

    useEffect(() => {
        setBrushRange(null);
    }, [target, temporalBrush]);
    
    const chartData = useMemo(() => {
        if (!target) return null;

        // Get the component data based on target (Map first, fallback to plain object)
        const componentData = registeredComponents instanceof Map
            ? registeredComponents.get(target)
            : registeredComponents?.[target];
        if (!componentData) return null;

        const domain = componentData.domain instanceof Map
            ? componentData.domain
            : componentData.domain
                ? new Map(Object.entries(componentData.domain))
                : null;
        
        // Get index domain
        const indexDomain = domain?.get
            ? domain.get("index")
            : domain?.index;

        // Normalize detailedData entries for flexible data sources
        const detailedDataEntries = componentData.detailedData instanceof Map
            ? Array.from(componentData.detailedData.entries())
            : componentData.detailedData && typeof componentData.detailedData.entries === 'function'
                ? Array.from(componentData.detailedData.entries())
                : Array.isArray(componentData.detailedData)
                    ? componentData.detailedData.map((v, i) => [i, v])
                    : [];

        let isCheckboxGroup = false;

        // Check if this is a checkbox group (SelectionProvenance)
        // Checkbox groups have detailedData with string keys and TemporalSelectionRecord arrays
        if (detailedDataEntries.length > 0) {
            const firstEntry = detailedDataEntries[0];
            const firstKey = firstEntry[0];
            const firstValue = firstEntry[1];
            // Check if keys are strings and values are arrays with select/unselect properties
            if (typeof firstKey === 'string' && 
                Array.isArray(firstValue) && 
                firstValue.length > 0 && 
                firstValue[0]?.select) {
                isCheckboxGroup = true;
            }
        }
        
        // Check if this is a Single Select Dropdown (also SelectionProvenance)
        // ... (previous comments) ...
        
        // Check if this is RangedProvenance (Range Slider)
        // detailedData is typically Map<index, {value: [min, max], time, index}>
        let isRangedProvenance = false;
        if (detailedDataEntries.length > 0) {
            const val = detailedDataEntries[0][1];
            if (val && typeof val === 'object' && 'value' in val && Array.isArray(val.value) && val.value.length === 2 && typeof val.value[0] === 'number') {
                isRangedProvenance = true;
            }
        }
        
        // Check if this is TextProvenance (Input Text)
        // TextProvenance extends SuperProvenance? No, it extends GenericProvenance usually, or SuperProvenance based on search results.
        // Wait, TextProvenance.js in example shows `class TextProvenance extends SuperProvenance`.
        // But `src/strategies/provenance/TextProvenance.ts` usually extends GenericProvenance<string>.
        // Let's check detailedData structure.
        // For TextProvenance, detailedData is typically Map<index, {value, time, index}> like NumericProvenance?
        // OR does it track history of strings?
        // If it's `TextProvenance.js` from example:
        // `this.provenance.set(value, { interactions: 0, timestamps: [] })`
        // It seems to be using `this.provenance` which is not standard `detailedData`.
        // But `Input.js` uses `new TextProvenance()` from `../dist/index.js`.
        // Let's assume it follows standard Provenance structure.
        // If it extends GenericProvenance<string>, detailedData is Map<number, TemporalValueRecord<string>>.
        // But we want a GANTT view "similar to single select and multi select, with all the stored input text items rendering on a separate row."
        // This implies we want to see EACH UNIQUE TEXT VALUE as a row, and timeline bars when it was "active".
        // Input text is usually a sequence of values.
        // Value "A" at t1. Value "B" at t2. Value "A" at t3.
        // We want:
        // Row "A": [t1, t2] ... [t3, now]
        // Row "B": [t2, t3]
        
        // We need to transform the linear history (index-based) into a per-value history (like SelectionProvenance).
        let isTextProvenance = false;
        let isNumericProvenance = false;
        
        // Check if detailedData values are objects with 'value' property that is string
        if (detailedDataEntries.length > 0) {
            const val = detailedDataEntries[0][1];
            if (val && typeof val === 'object' && 'value' in val && typeof val.value === 'string' && !Array.isArray(val)) {
                isTextProvenance = true;
            }
            if (val && typeof val === 'object' && 'value' in val && typeof val.value === 'number' && !Array.isArray(val)) {
                isNumericProvenance = true;
            }
        }

        if (isRangedProvenance) {
            // For Range Slider, we want y-axis as sequence of interactions and x-axis as range.
            // detailedDataEntries: [[1, {value: [0, 20], time: ..., index: 1}], [2, {value: [10, 30], ...}]]
            // We can reuse the same rendering logic if we format it as:
            // label = "Interaction 1" (or timestamp?) -> records: [{select: {index: min}, unselect: {index: max}}]
            // Wait, for range slider, the x-axis is VALUE (0 to 100), not time/index.
            // The user said: "y axis being sequence of interactions and x-axis being the range."
            // Sequence of interactions implies time/order goes DOWN the y-axis.
            // X-axis is the range value (min to max).
            
            // So we need to map each historical record to a "row".
            // Row 1: Interaction 1 ([0, 20])
            // Row 2: Interaction 2 ([10, 30])
            
            // This is slightly different from the Gantt view where x-axis is time.
            // Here x-axis is VALUE domain.
            
            // We can mock this by creating a structure where:
            // key = "Interaction K"
            // records = [{ select: { index: value[0] }, unselect: { index: value[1] } }]
            // And we need to tell the renderer to use the VALUE domain (e.g. 0-100) instead of index domain.
            
            const publicRecords =
                provenance?.widgetType === "range-slider" &&
                Array.isArray(provenance.data)
                    ? provenance.data.map((record, index) => [
                        index + 1,
                        {
                            value: record.value,
                            time: new Date(record.timestamp),
                            index: index + 1,
                            kind: record.kind,
                            source: record.source,
                        },
                    ])
                    : [];
            // Public records include the live time-mode sample endpoint, while
            // RangedProvenance intentionally contains only derived records.
            const sorted = (
                publicRecords.length > 0
                    ? publicRecords
                    : detailedDataEntries
            ).sort((a, b) => a[0] - b[0]);
            const sequenceOffset = componentData.tooltipIndexOffset ?? 0;
            const hasRecordKinds = sorted.some(
                ([, record]) => record.kind !== undefined
            );
            const sequenceTotal = hasRecordKinds
                ? sorted.filter(
                    ([, record]) => record.kind === "interaction"
                ).length
                : Math.max(0, sorted.length - sequenceOffset);
            let interactionIndex = 0;
            const transformedData = sorted.map(([, record]) => {
                if (
                    record.kind === undefined ||
                    record.kind === "interaction"
                ) {
                    interactionIndex += 1;
                }
                const label = String(record.index);
                const min = record.value[0];
                const max = record.value[1];
                return [label, [{
                    select: { index: min, time: record.time },
                    unselect: { index: max },
                    value: record.value,
                    time: record.time,
                    kind: record.kind,
                    source: record.source,
                    sequenceIndex: hasRecordKinds
                        ? interactionIndex
                        : Math.max(
                            0,
                            record.index - sequenceOffset
                        ),
                    sequenceTotal,
                }]];
            });
            
            // We need to pass the min/max of the slider as the domain.
            // RangedProvenance has minValue and maxValue properties, but they might not be in the serialized `componentData` if it's just state.
            // However, `registeredComponents` usually holds the class instance which has `minValue`/`maxValue`.
            
            let min = 0;
            let max = 100;
            if (componentData.minValue !== undefined) min = componentData.minValue;
            if (componentData.maxValue !== undefined) max = componentData.maxValue;
            
            return {
                componentData,
                // Oldest on top so the trajectory grows downward as interactions happen
                detailedDataEntries: transformedData,
                indexDomain: [min, max],
                isCheckboxGroup: true,
                isRangeSlider: true, // Flag to customize rendering if needed (e.g. axis labels)
                tooltipKind: 'range',
                tooltipLabel: componentData.tooltipLabel ?? target,
                mode,
            };
        }

        if (isTextProvenance) {
            // Transform linear history to grouped history
            const sorted = detailedDataEntries.sort((a, b) => a[0] - b[0]);
            const grouped = new Map();
            
            const sequenceOffset = componentData.tooltipIndexOffset ?? 1;
            const sequenceTotal = Math.max(0, sorted.length - sequenceOffset);

            if (sorted.length > 0) {
                let currentVal = sorted[0][1].value;
                let startIndex = sorted[0][1].index;
                
                // Add first start
                if (!grouped.has(currentVal)) grouped.set(currentVal, []);
                grouped.get(currentVal).push({
                    select: { index: startIndex, time: sorted[0][1].time },
                    value: currentVal,
                    sequenceIndex: Math.max(0, startIndex - sequenceOffset),
                    sequenceTotal,
                });
                
                for (let i = 1; i < sorted.length; i++) {
                    const nextRec = sorted[i][1];
                    const nextVal = nextRec.value;
                    const nextIndex = nextRec.index;

                    // Every search is a separate PW interaction, even when the
                    // same value is searched twice in succession.
                    const currentRecords = grouped.get(currentVal);
                    if (currentRecords && currentRecords.length > 0) {
                        currentRecords[currentRecords.length - 1].unselect = {
                            index: nextIndex,
                            time: nextRec.time,
                        };
                    }

                    if (!grouped.has(nextVal)) grouped.set(nextVal, []);
                    grouped.get(nextVal).push({
                        select: { index: nextIndex, time: nextRec.time },
                        value: nextVal,
                        sequenceIndex: Math.max(0, nextIndex - sequenceOffset),
                        sequenceTotal,
                    });

                    currentVal = nextVal;
                    startIndex = nextIndex;
                }
            }

            // Ensure we have a valid indexDomain that covers the latest interaction
            // If the latest interaction is open-ended (no unselect), we need the domain max to be > start index
            
            // Get the max index from the data
            let dataMaxIndex = 0;
            if (sorted.length > 0) {
                // The last record's index is the start of the latest state
                dataMaxIndex = sorted[sorted.length - 1][1].index;
            }
            
            const currentDomainMax = indexDomain ? indexDomain[1] : 0;
            const effectiveMax = Math.max(currentDomainMax, dataMaxIndex);

            return {
                componentData,
                detailedDataEntries: Array.from(grouped.entries()),
                indexDomain: [0, effectiveMax], // Force extend domain
                isCheckboxGroup: true,
                tooltipKind: 'input',
                tooltipLabel: componentData.tooltipLabel ?? target,
            };
        }

        if (isNumericProvenance) {
            // Single slider: y-axis is sequence of interactions, x-axis is slider value domain.
            // Render one point per interaction (no range).
            const publicRecords =
                provenance?.widgetType === "single-slider" &&
                Array.isArray(provenance.data)
                    ? provenance.data.map((record, index) => [
                        index + 1,
                        {
                            value: record.value,
                            time: new Date(record.timestamp),
                            index: index + 1,
                            kind: record.kind,
                            source: record.source,
                        },
                    ])
                    : [];
            const sorted = (
                publicRecords.length > 0
                    ? publicRecords
                    : detailedDataEntries
            ).sort((a, b) => a[0] - b[0]);

            const sequenceOffset = componentData.tooltipIndexOffset ?? 1;
            const sequenceTotal = sorted.filter(([, record]) =>
                record.kind === undefined ||
                record.kind === "interaction"
            ).length - sequenceOffset;
            let interactionIndex = 0;
            const transformedData = sorted.map(([, record]) => {
                if (
                    record.kind === undefined ||
                    record.kind === "interaction"
                ) {
                    interactionIndex += 1;
                }
                const key = String(record.index);
                const v = record.value;
                return [key, [{
                    select: { index: v, time: record.time },
                    value: v,
                    time: record.time,
                    kind: record.kind,
                    source: record.source,
                    sequenceIndex: Math.max(
                        0,
                        interactionIndex - sequenceOffset
                    ),
                    sequenceTotal: Math.max(0, sequenceTotal),
                }]];
            });

            const min = componentData.minValue ?? 0;
            const max = componentData.maxValue ?? 100;

            return {
                componentData,
                // Oldest on top so the trajectory grows downward as interactions happen
                detailedDataEntries: transformedData,
                indexDomain: [min, max],
                isCheckboxGroup: true,
                isSingleSlider: true,
                tooltipKind: 'slider',
                tooltipLabel: componentData.tooltipLabel ?? target,
                mode,
            };
        }

        const tooltipKind = typeof target === 'string' && (
            target.includes('checkbox') || target.includes('multi')
        ) ? 'multi-selection' : 'single-selection';

        return {
            componentData,
            detailedDataEntries,
            indexDomain,
            isCheckboxGroup,
            tooltipKind,
            tooltipLabel: componentData.tooltipLabel ?? target,
        };
    }, [target, registeredComponents, provenance, mode]);

    // ... useEffect for D3 ...

    if (!chartData) return null;

    if (chartData.isCheckboxGroup) {
        const { detailedDataEntries, indexDomain } = chartData;
        
        const allSortedEntries = chartData.isRangeSlider || chartData.isSingleSlider
            ? [...detailedDataEntries]
            : [...detailedDataEntries].sort((a, b) => a[0].localeCompare(b[0]));
        const brushEnabled =
            (chartData.isSingleSlider || chartData.isRangeSlider) &&
            normalizeTemporalBrush(temporalBrush) &&
            allSortedEntries.length > 1;
        const sortedEntries = brushEnabled
            ? filterTemporalEntries(allSortedEntries, brushRange)
            : allSortedEntries;
        const temporalPlotHeight = Math.max(
            32,
            brushEnabled
                ? TEMPORAL_BRUSH_HEIGHT
                : sortedEntries.length * 32
        );
        const temporalYPositions = getTemporalYPositions(
            sortedEntries,
            chartData.mode ?? mode,
            temporalPlotHeight
        );
        const brushYPositions = getTemporalYPositions(
            allSortedEntries,
            chartData.mode ?? mode,
            TEMPORAL_BRUSH_HEIGHT
        );
        
        // Calculate max index from data if domain is missing or to ensure bounds
        let calculatedMax = 0;
        for (const [, records] of sortedEntries) {
            for (const record of records) {
                if (record.select?.index > calculatedMax) calculatedMax = record.select.index;
                if (record.unselect?.index > calculatedMax) calculatedMax = record.unselect.index;
            }
        }
        
        const domainMax = indexDomain ? indexDomain[1] : 0;
        const domainMin = indexDomain ? indexDomain[0] : 0;
        // For range slider, we use domain max. For others, ensure "now" is beyond the last event so open intervals have visible width.
        const baseMaxIndex = (chartData.isRangeSlider || chartData.isSingleSlider)
            ? domainMax
            : Math.max(domainMax, calculatedMax, 1);
        const maxIndex = (chartData.isRangeSlider || chartData.isSingleSlider) ? baseMaxIndex : baseMaxIndex + 1;
        const minIndex = (chartData.isRangeSlider || chartData.isSingleSlider) ? domainMin : 0;
        const rangeSpan = maxIndex - minIndex;
        const indexOffset = (chartData.isRangeSlider || chartData.isSingleSlider) ? 0 : 1;
        const displayMaxIndex = Math.max(maxIndex - indexOffset, 1);
        const displaySpan = displayMaxIndex - minIndex;

        const isLight = theme === "light";
        const bgColor = isLight ? "#fff" : "#333";
        const textColor = isLight ? "#000" : "#eee"; // Or white
        const axisColor = isLight ? "#ccc" : "#555";
        const labelColor = isLight ? "#333" : "#ccc"; // For n=0, now labels
        const rowBg = isLight ? "#f5f5f5" : "#444"; // Background for timeline track

        const renderHeader = () => {
            const hasLeftAxisLabel = chartData.isRangeSlider || chartData.isSingleSlider;
            const brushWidth = brushEnabled ? 64 : 0;
            const leftLabelWidth = hasLeftAxisLabel
                ? brushEnabled ? brushWidth : 28
                : 0; // reserved width for brush and vertical y-label column
            const leftLabelGap = hasLeftAxisLabel ? 8 : 0;    // gap between y-label and plot
            const plotInset = hasLeftAxisLabel ? 6 : 0;       // inset used in body for endpoints
            const totalLeftGutter = leftLabelWidth + leftLabelGap + plotInset;
            const totalRightInset = plotInset;
            const innerWidthCalc = `calc(100% - ${totalLeftGutter + totalRightInset}px)`;
            const innerMarginLeft = `${totalLeftGutter}px`;
            
            return (
                <div
                    data-provenance-chart-target={target}
                    style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: '8px' }}
                >
                    {/* The Line */}
                    <div data-timeline-axis={target} style={{ width: innerWidthCalc, marginLeft: innerMarginLeft, height: '4px', background: axisColor, borderRadius: '2px', position: 'relative' }}></div>
                    {/* The Labels below */}
                    <div style={{ width: innerWidthCalc, marginLeft: innerMarginLeft, display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', color: labelColor, fontWeight: 'bold' }}>
                           {(chartData.isRangeSlider || chartData.isSingleSlider) ? minIndex : "n=0"}
                        </span>
                        <span style={{ fontSize: '12px', color: labelColor, fontWeight: 'bold' }}>
                           {(chartData.isRangeSlider || chartData.isSingleSlider) ? maxIndex : "now"}
                        </span>
                    </div>
                </div>
            );
        };

        const renderBody = () => (
             <div
                 data-provenance-chart-target={target}
                 style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}
             >
                 {brushEnabled && (
                     <TemporalBrush
                         mode={chartData.mode ?? mode}
                         onRangeChange={handleBrushRangeChange}
                         positions={brushYPositions}
                         target={target}
                         tooltipId={tooltipId}
                         widgetType={
                             chartData.isRangeSlider
                                 ? "range-slider"
                                 : "single-slider"
                         }
                     />
                 )}
                 {/* Y-Axis Label for Range/Single Slider (Left side, vertical) */}
                 {(
                     (chartData.isRangeSlider ||
                         chartData.isSingleSlider) &&
                     !brushEnabled
                 ) && (
                     <div style={{ 
                         writingMode: 'vertical-rl', 
                         transform: 'rotate(180deg)', // Standard rotation for left-side axis labels
                         fontSize: '12px', 
                         color: '#999', 
                         fontWeight: 'bold', 
                         textAlign: 'center', 
                         marginRight: '8px',
                         width: '28px',
                         minWidth: '28px',
                         whiteSpace: 'nowrap',
                         alignSelf: 'center' // Center vertically relative to chart
                     }}>
                         {(chartData.mode ?? mode) === "time"
                             ? "time"
                             : "Sequence of Interactions"}
                     </div>
                 )}
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', flexGrow: 1, position: 'relative' }}>
                 
                 {/* 
                    For Range Slider, user wants VERTICAL connecting lines.
                    This implies we are connecting points ACROSS rows (interactions), not within a row.
                 */}
                 
                 {chartData.isRangeSlider || chartData.isSingleSlider ? (
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        height: `${temporalPlotHeight}px`,
                        minHeight: `${temporalPlotHeight}px`,
                    }}>
                        {/* SVG Overlay for Vertical Lines */}
                        <svg
                            height={temporalPlotHeight}
                            style={{ position: 'absolute', top: 0, left: '6px', width: 'calc(100% - 12px)', height: `${temporalPlotHeight}px`, pointerEvents: 'none', zIndex: 1 }}
                        >
                            {sortedEntries.map(([label, records], index) => {
                                if (index === sortedEntries.length - 1) return null; // Last row has no next row to connect to
                                
                                // Current Row
                                const currentRecord = records[0]; 
                                if (!currentRecord || !currentRecord.select) return null;
                                const curMin = currentRecord.select.index;
                                const curMax = currentRecord.unselect ? currentRecord.unselect.index : maxIndex;
                                
                                // Next Row
                                const nextEntry = sortedEntries[index + 1];
                                const nextRecord = nextEntry[1][0];
                                if (!nextRecord || !nextRecord.select) return null;
                                const nextMin = nextRecord.select.index;
                                const nextMax = nextRecord.unselect ? nextRecord.unselect.index : maxIndex;
                                
                                const y1 = temporalYPositions[index];
                                const y2 = temporalYPositions[index + 1];
                                
                                const x1_min = ((curMin - minIndex) / rangeSpan) * 100;
                                const x2_min = ((nextMin - minIndex) / rangeSpan) * 100;
                                
                                const x1_max = ((curMax - minIndex) / rangeSpan) * 100;
                                const x2_max = ((nextMax - minIndex) / rangeSpan) * 100;

                                // Opacity for lines
                                 const totalRows = sortedEntries.length;
                                 const relativeIndex = index / (totalRows - 1 || 1);
                                 // Oldest is index 0 (top), newest is last (bottom).
                                 // Make newest darker using interpolateOranges.
                                 const color = interpolateOranges(0.3 + (relativeIndex * 0.7));
                                 
                                 return (
                                     <g key={index}>
                                         {/* Min Connection */}
                                         <line 
                                             x1={`${x1_min}%`} y1={y1} 
                                             x2={`${x2_min}%`} y2={y2} 
                                             stroke={color} strokeWidth="2" 
                                         />
                                         {/* Max Connection (Range slider only) */}
                                         {chartData.isRangeSlider && (
                                             <line 
                                                 x1={`${x1_max}%`} y1={y1} 
                                                 x2={`${x2_max}%`} y2={y2} 
                                                 stroke={color} strokeWidth="2" 
                                             />
                                         )}
                                     </g>
                                 );
                             })}
                         </svg>

                         {/* Rows with Points (No horizontal lines) */}
                         <div style={{
                             position: 'relative',
                             height: `${temporalPlotHeight}px`,
                         }}>
                              {sortedEntries.map(([label, records], index) => {
                                  // Calculate color for the row
                                  const totalRows = sortedEntries.length;
                                  const relativeIndex = index / (totalRows - 1 || 1);
                                  const color = interpolateOranges(0.3 + (relativeIndex * 0.7));
 
                                  return (
                                  <div key={label} style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      height: '24px',
                                      position: 'absolute',
                                      top: `${temporalYPositions[index] - 8}px`,
                                      left: 0,
                                      right: 0,
                                  }}>
                                      {/* Timeline takes full space with safe inset for endpoint visibility */}
                                      <div style={{ position: 'absolute', top: 0, left: '6px', width: 'calc(100% - 12px)', height: '100%', background: 'transparent', borderRadius: '3px', zIndex: 0 }}>
                                          {records.map((record, i) => {
                                               if (!record.select) return null;
                                               const start = record.select.index;
                                               const end = record.unselect ? record.unselect.index : maxIndex;
                                               
                                               const left = ((start - minIndex) / rangeSpan) * 100;
                                               const right = ((end - minIndex) / rangeSpan) * 100;
                                               const width = Math.max(0, ((end - start) / rangeSpan) * 100);
                                               const lowValue = Array.isArray(record.value)
                                                   ? record.value[0]
                                                   : record.value ?? start;
                                               const highValue = Array.isArray(record.value)
                                                   ? record.value[1]
                                                   : end;
                                               const lowTooltipProps = getTooltipAnchorProps(
                                                   tooltipId,
                                                   () => formatTemporalTooltip({
                                                       label: chartData.tooltipLabel,
                                                       value: lowValue,
                                                       record: chartData.isRangeSlider
                                                           ? { ...record, value: lowValue }
                                                           : record,
                                                       kind: chartData.tooltipKind,
                                                   })
                                               );
                                               const highTooltipProps = chartData.isRangeSlider
                                                   ? getTooltipAnchorProps(
                                                       tooltipId,
                                                       () => formatTemporalTooltip({
                                                           label: chartData.tooltipLabel,
                                                           value: highValue,
                                                           record: { ...record, value: highValue },
                                                           kind: 'range',
                                                       })
                                                   )
                                                   : {};
                                               
                                              // Render Points ONLY
                                               return (
                                                  <div key={i} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                                                        {/* Min Point */}
                                                        <div
                                                            {...lowTooltipProps}
                                                            role="button"
                                                            tabIndex={0}
                                                            data-provenance-temporal-point="true"
                                                            data-provenance-kind={
                                                                record.kind ??
                                                                "interaction"
                                                            }
                                                            data-provenance-value={lowValue}
                                                            aria-label={
                                                                chartData.isRangeSlider
                                                                    ? (
                                                                        `Restore ${chartData.tooltipLabel} ` +
                                                                        `to ${lowValue}–${highValue}`
                                                                    )
                                                                    : (
                                                                        `Restore ${chartData.tooltipLabel} ` +
                                                                        `to ${lowValue}`
                                                                    )
                                                            }
                                                            onClick={() =>
                                                                restoreTemporalPoint({
                                                                    restoreWidgetValue,
                                                                    target,
                                                                    record,
                                                                    range:
                                                                        chartData.isRangeSlider,
                                                                })
                                                            }
                                                            onKeyDown={event => {
                                                                if (
                                                                    event.key === "Enter" ||
                                                                    event.key === " "
                                                                ) {
                                                                    event.preventDefault();
                                                                    restoreTemporalPoint({
                                                                        restoreWidgetValue,
                                                                        target,
                                                                        record,
                                                                        range:
                                                                            chartData.isRangeSlider,
                                                                    });
                                                                }
                                                            }}
                                                            style={{
                                                                ...lowTooltipProps.style,
                                                                position: 'absolute',
                                                                left: `calc(${left}% - 8px)`,
                                                                top: '-4px',
                                                                width: '16px',
                                                                height: '16px',
                                                                borderRadius: '50%',
                                                                backgroundColor: 'transparent',
                                                                zIndex: 2,
                                                                cursor: 'pointer',
                                                                opacity:
                                                                    record.kind === "sample"
                                                                        ? 0.7
                                                                        : 1,
                                                            }}
                                                        >
                                                            <span
                                                                aria-hidden="true"
                                                                style={{
                                                                    position: 'absolute',
                                                                    left: '4px',
                                                                    top: '4px',
                                                                    width: '8px',
                                                                    height: '8px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: color,
                                                                    border: `1px solid ${d3.color(color).darker()}`,
                                                                    pointerEvents: 'none',
                                                                }}
                                                            />
                                                        </div>
                                                       {/* Max Point (Range slider only) */}
                                                       {chartData.isRangeSlider && (
                                                           <div
                                                               {...highTooltipProps}
                                                               role="button"
                                                               tabIndex={0}
                                                               data-provenance-temporal-point="true"
                                                               data-provenance-kind={
                                                                   record.kind ??
                                                                   "interaction"
                                                               }
                                                               data-provenance-value={highValue}
                                                               aria-label={
                                                                   `Restore ${chartData.tooltipLabel} ` +
                                                                   `to ${lowValue}–${highValue}`
                                                               }
                                                               onClick={() =>
                                                                   restoreTemporalPoint({
                                                                       restoreWidgetValue,
                                                                       target,
                                                                       record,
                                                                       range: true,
                                                                   })
                                                               }
                                                               onKeyDown={event => {
                                                                   if (
                                                                       event.key === "Enter" ||
                                                                       event.key === " "
                                                                   ) {
                                                                       event.preventDefault();
                                                                       restoreTemporalPoint({
                                                                           restoreWidgetValue,
                                                                           target,
                                                                           record,
                                                                           range: true,
                                                                       });
                                                                   }
                                                               }}
                                                               style={{
                                                                   ...highTooltipProps.style,
                                                                   position: 'absolute',
                                                                   left: `calc(${right}% - 8px)`,
                                                                   top: '-4px',
                                                                   width: '16px',
                                                                   height: '16px',
                                                                   borderRadius: '50%',
                                                                   backgroundColor: 'transparent',
                                                                   zIndex: 2,
                                                                   cursor: 'pointer',
                                                                   opacity:
                                                                       record.kind === "sample"
                                                                           ? 0.7
                                                                           : 1,
                                                               }}
                                                           >
                                                               <span
                                                                   aria-hidden="true"
                                                                   style={{
                                                                       position: 'absolute',
                                                                       left: '4px',
                                                                       top: '4px',
                                                                       width: '8px',
                                                                       height: '8px',
                                                                       borderRadius: '50%',
                                                                       backgroundColor: color,
                                                                       border: `1px solid ${d3.color(color).darker()}`,
                                                                       pointerEvents: 'none',
                                                                   }}
                                                               />
                                                           </div>
                                                       )}
                                                   </div>
                                               );
                                          })}
                                      </div>
                                  </div>
                              )})}
                         </div>
                     </div>
                  ) : (
                     // Default rendering for other components (Checkbox, Dropdown, Input)
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', flexGrow: 1 }}>
                         {sortedEntries.map(([label, records]) => (
                              <div key={label} style={{ display: 'flex', alignItems: 'center', height: '24px', position: 'relative' }}>
                                  {/* Timeline takes full space */}
                                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: rowBg, borderRadius: '3px', zIndex: 0 }}>
                                      {records.map((record, i) => {
                                           if (!record.select) return null;
                                           const startRaw = record.select.index;
                                           const endRaw = record.unselect ? record.unselect.index : maxIndex;
                                           const start = (startRaw ?? 0) - indexOffset;
                                           const end = (endRaw ?? maxIndex) - indexOffset;
                                           
                                           const left = ((start - minIndex) / (displaySpan || 1)) * 100;
                                           const width = Math.max(0, ((end - start) / (displaySpan || 1)) * 100);
                                           
                                           // Calculate color based on start time relative to maxIndex (now)
                                           // rangeSpan is the total time domain.
                                           // relativeTime = 0 (start) to 1 (end/now).
                                           const relativeTime = (start - minIndex) / (displaySpan || 1);
                                           // Map 0..1 to 0.3..1.0 color scale
                                           const color = interpolateOranges(0.3 + (relativeTime * 0.7));
                                           const tooltipProps = getTooltipAnchorProps(
                                               tooltipId,
                                               () => formatTemporalTooltip({
                                                   label: chartData.tooltipLabel,
                                                   value: label,
                                                   record,
                                                   kind: chartData.tooltipKind,
                                               })
                                           );
                                           
                                           return (
                                               <div
                                                  key={i}
                                                  {...tooltipProps}
                                                  style={{
                                                   ...tooltipProps.style,
                                                   position: 'absolute',
                                                   left: `${left}%`,
                                                   width: `${width}%`,
                                                   minWidth: '8px',
                                                   height: '100%',
                                                   backgroundColor: color, 
                                                   border: `1px solid ${d3.color(color).darker()}`
                                               }} />
                                           );
                                      })}
                                  </div>
                                  
                                  {/* Label overlay on top */}
                                  <div style={{ position: 'relative', zIndex: 1, padding: '0 8px', width: '100%', fontSize: '12px', fontWeight: 'bold', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }} title={label}>
                                      {label}
                                  </div>
                              </div>
                         ))}
                      </div>
                   )}
              </div>
          </div>
        );

        if (part === "header") {
            return renderHeader();
        } else if (part === "body") {
            return (
                <div
                    data-provenance-chart-target={target}
                    style={{ padding: '15px', minWidth: '100%', backgroundColor: bgColor, color: textColor, borderRadius: '4px' }}
                >
                    {renderBody()}
                </div>
            );
        }

        // Full view (default) - used for Single Select Dropdown tooltip/dropdown
        return (
            <div
                data-provenance-chart-target={target}
                style={{ padding: '15px', minWidth: '100%', backgroundColor: bgColor, color: textColor, borderRadius: '4px' }}
            >
                {renderBody()}
                {renderHeader()}
            </div>
        );
    }

    // Default D3 chart (always full)
    return (
        <div
            ref={chartRef}
            className="sequence-chart"
            data-provenance-chart-target={target}
        />
    );
};

export default Chart;
