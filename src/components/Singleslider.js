import { Slider as Slider_ } from "primereact/slider/slider.esm.js";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { interpolateOranges } from "d3";
import Bars from "scents";
import NumericProvenance from "../strategies/provenance/NumericProvenance.ts";
import { UNILATERAL_GUIDANCE_EVENT_NAME } from "../constants.ts";
import useProvenanceController from "./hooks/useProvenanceController.js";
import useRevertedValue from "./hooks/useRevertedValue.js";
import useWidgetRegistry from "./hooks/useWidgetRegistry.js";
import useElementSize from "./hooks/useElementSize.js";
import useProvenanceTooltip from "./hooks/useProvenanceTooltip.js";
import { generateRange } from "./utils.js";
import Chart from "./Chart.js";
import {
    formatAggregateTooltip,
    getTooltipAnchorProps,
} from "./provenanceTooltip.js";

const callValueCallbacks = (props, value, event) => {
    const callbacks = new Set([
        props.onChange,
        props.onSelectedChange,
        props.selectedChange,
    ]);
    callbacks.delete(undefined);
    callbacks.delete(null);
    callbacks.forEach(callback => callback(value, event));
};

/**
 * V2 Single Slider.
 *
 * Current React callers can keep using `min`, `max`, `step`, `value`, and
 * `onChange`. The V1-style `options` object and public provenance contract
 * are accepted at the same time to support an incremental migration.
 */
const Singleslider = (props) => {
    const options = props.options ?? {};
    const min = props.min ?? options.floor ?? 0;
    const max = props.max ?? options.ceil ?? 100;
    const step = props.step ?? options.step ?? 1;
    const initialValue = props.value ?? props.defaultValue ?? min;
    const tooltipLabel =
        props.dataLabel ?? props["data-label"] ?? props.id;
    const visualize = props.visualize ?? true;
    const temporalBrush =
        props.temporalBrush ??
        props.enableTemporalBrush ??
        false;
    const tooltip = useProvenanceTooltip();
    const [revertedValue] = useRevertedValue(props.id);
    const {
        registerWidget,
        notifyWidget,
    } = useWidgetRegistry();
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const [measureContainer, { width: containerWidth }] = useElementSize();
    const elementRef = useRef(null);
    const propsRef = useRef(props);
    propsRef.current = props;
    const barKeys = useMemo(
        () => generateRange(min, max + step, step),
        [min, max, step]
    );

    const strategyFactory = useMemo(
        () => () => {
            const strategy = new NumericProvenance(min, max);
            strategy.tooltipLabel = tooltipLabel;
            strategy.tooltipIndexOffset = 1;
            return strategy;
        },
        [min, max, tooltipLabel]
    );

    const {
        currentValue,
        strategy,
        hasProvenance,
        provenance: serializedProvenance,
        mode: provenanceMode,
        recordInteraction,
        restoreValue,
    } = useProvenanceController({
        id: props.id,
        widgetType: "single-slider",
        value: initialValue,
        provenance: props.provenance,
        mode: props.mode,
        sampleIntervalMs: props.sampleIntervalMs,
        freeze: props.freeze,
        visualize,
        onProvenanceChange:
            props.onProvenanceChange ?? props.provenanceChange,
        strategyFactory,
    });
    const currentValueRef = useRef(currentValue);
    currentValueRef.current = currentValue;
    const serializedProvenanceRef = useRef(serializedProvenance);
    serializedProvenanceRef.current = serializedProvenance;

    const applyRegisteredValue = useCallback(
        (nextValue, source = "history") => {
            const changed = restoreValue(nextValue, {
                caller: source,
            });
            callValueCallbacks(propsRef.current, nextValue, { source });
            return changed;
        },
        [restoreValue]
    );

    const setContainerRef = useCallback(node => {
        elementRef.current = node;
        measureContainer(node);
    }, [measureContainer]);

    useEffect(() => {
        if (!strategy) return undefined;

        strategy.hasUserInteracted = hasProvenance;
        strategy.tooltipLabel = tooltipLabel;
        strategy.tooltipIndexOffset = 1;
        notifyWidget(props.id);
        return undefined;
    }, [
        strategy,
        hasProvenance,
        tooltipLabel,
        props.id,
        notifyWidget,
    ]);

    useEffect(() => {
        if (!strategy) return undefined;

        const registration = {
            id: props.id,
            type: "single-slider",
            provenance: strategy,
            getProvenance: () => serializedProvenanceRef.current,
            elementRef,
            getValue: () => currentValueRef.current,
            setValue: applyRegisteredValue,
            visualize,
            mode: provenanceMode,
            focus: () => {
                const element = elementRef.current;
                element?.scrollIntoView?.({
                    behavior: "smooth",
                    block: "center",
                });
                (
                    element?.querySelector?.('[role="slider"]') ??
                    element
                )?.focus?.();
            },
        };
        const unregister = registerWidget(registration);
        const refreshRegistry = () => notifyWidget(props.id);
        strategy.addEventListener(
            UNILATERAL_GUIDANCE_EVENT_NAME,
            refreshRegistry
        );

        return () => {
            strategy.removeEventListener(
                UNILATERAL_GUIDANCE_EVENT_NAME,
                refreshRegistry
            );
            unregister();
        };
    }, [
        strategy,
        props.id,
        applyRegisteredValue,
        registerWidget,
        notifyWidget,
        visualize,
        provenanceMode,
    ]);

    useEffect(() => {
        const handleToggle = event => {
            if (event.detail?.target !== props.id) return;
            setDropdownVisible(Boolean(event.detail.open));
        };
        window.addEventListener(
            "provenance-dropdown-toggle",
            handleToggle
        );
        return () => window.removeEventListener(
            "provenance-dropdown-toggle",
            handleToggle
        );
    }, [props.id]);

    useEffect(() => {
        if (revertedValue === undefined) return;
        applyRegisteredValue(revertedValue, "history");
    }, [revertedValue, applyRegisteredValue]);

    const handleChange = event => {
        const nextValue = Number(event.value);
        if (!Number.isFinite(nextValue)) return;

        // Record first so a controlled value echoed back by the parent is not
        // misclassified by the hook as a second, external update.
        recordInteraction(nextValue);
        callValueCallbacks(props, nextValue, event);
    };

    return (
        <div
            ref={setContainerRef}
            data-label={tooltipLabel}
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                marginTop: "1rem",
                width: "100%",
                position: "relative",
            }}
        >
            {visualize && containerWidth > 0 && hasProvenance && (
                <div
                    style={{
                        position: "relative",
                        width: containerWidth,
                        height: 50,
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                        }}
                    >
                        <Bars
                            guidance={strategy}
                            orientationScheme={interpolateOranges}
                            barKeys={barKeys}
                            encodings={{
                                orientation: "vertical",
                                positionDomain: "count",
                                colorDomain: "index",
                            }}
                            width={containerWidth}
                            height={50}
                            layout="slider"
                            barWidthFactor={0.25}
                        />
                    </div>
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                        }}
                    >
                        {barKeys.map((key, index) => {
                            const record = strategy.aggregateData?.get(key);
                            if (!record) return null;

                            const tooltipProps = getTooltipAnchorProps(
                                tooltip,
                                formatAggregateTooltip({
                                    label: tooltipLabel,
                                    value: key,
                                    record,
                                    kind: "slider",
                                    sequenceIndex: Math.max(
                                        0,
                                        (record.index ?? 1) - 1
                                    ),
                                    sequenceTotal: Math.max(
                                        0,
                                        (strategy.detailedData?.size ?? 1) - 1
                                    ),
                                })
                            );

                            return (
                                <div
                                    key={key}
                                    {...tooltipProps}
                                    role="button"
                                    tabIndex={0}
                                    data-provenance-aggregate-value={key}
                                    aria-label={`Restore ${tooltipLabel} to ${key}`}
                                    onClick={() =>
                                        applyRegisteredValue(
                                            Number(key),
                                            "history"
                                        )
                                    }
                                    onKeyDown={event => {
                                        if (
                                            event.key === "Enter" ||
                                            event.key === " "
                                        ) {
                                            event.preventDefault();
                                            applyRegisteredValue(
                                                Number(key),
                                                "history"
                                            );
                                        }
                                    }}
                                    style={{
                                        ...tooltipProps.style,
                                        position: "absolute",
                                        left:
                                            `${(index / barKeys.length) * 100}%`,
                                        width:
                                            `${100 / barKeys.length}%`,
                                        top: 0,
                                        bottom: 0,
                                        background: "transparent",
                                        cursor: "pointer",
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    width: "100%",
                }}
            >
                <Slider_
                    {...props.sliderProps}
                    aria-label={props["aria-label"] ?? tooltipLabel}
                    style={{ width: "100%", ...props.sliderProps?.style }}
                    step={step}
                    max={max}
                    min={min}
                    value={currentValue}
                    onChange={handleChange}
                />
            </div>

            {visualize && isDropdownVisible && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        width: "100%",
                        border: "1px solid #ccc",
                        backgroundColor: "#fff",
                        zIndex: 1000,
                        borderRadius: "4px",
                        marginTop: "5px",
                        boxShadow:
                            "0 4px 6px -1px rgba(0, 0, 0, 0.1), " +
                            "0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    }}
                >
                    <Chart
                        target={props.id}
                        theme="light"
                        provenance={serializedProvenance}
                        mode={provenanceMode}
                        temporalBrush={temporalBrush}
                    />
                </div>
            )}
        </div>
    );
};

export default Singleslider;
