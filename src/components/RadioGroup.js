import {
    Children,
    isValidElement,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Slider as Slider_ } from "primereact/slider/slider.esm.js";
import SelectionProvenance from "../strategies/provenance/SelectionProvenance.ts";
import { UNILATERAL_GUIDANCE_EVENT_NAME } from "../constants.ts";
import useProvenanceController from "./hooks/useProvenanceController.js";
import useRevertedValue from "./hooks/useRevertedValue.js";
import useWidgetRegistry from "./hooks/useWidgetRegistry.js";
import Radiobutton from "./Radiobutton.js";
import RadioGroupContext, {
    useRadioGroup,
} from "./radioGroupContext.js";
import {
    callRadioGroupCallbacks,
    getControlledRadioGroupValue,
    getInitialRadioGroupValue,
    getRadioGroupCaller,
    getRadioOptionLabel,
    getRadioOptionValue,
    radioGroupValueKey,
    resolveRadioGroupValue,
    restoreRadioGroupTemporalValue,
} from "./radioGroupValue.js";
import {
    getSelectionTimeDomain,
    normalizeSelectionBrushRange,
} from "./selectionTimeline.js";

export { useRadioGroup };

const getChildValues = children =>
    Children.toArray(children)
        .filter(isValidElement)
        .map(child => child.props.value)
        .filter(value => value !== undefined);

const getLegacyChildValue = children =>
    Children.toArray(children)
        .filter(isValidElement)
        .map(child => child.props.stateItem)
        .find(value => value !== undefined);

const optionHasField = (options, field) =>
    typeof field === "string" &&
    options.some(option =>
        option !== null &&
        typeof option === "object" &&
        Object.prototype.hasOwnProperty.call(option, field)
    );

/**
 * Radio Button Group with the PW 1.0 public provenance contract.
 *
 * It supports both the original `data + selected` API and V2's existing
 * `<RadioGroup><Radiobutton /></RadioGroup>` composition. Provenance belongs
 * to the group because a radio selection is one scalar state.
 */
const RadioGroup = (props) => {
    const {
        id,
        data,
        options,
        children,
        name,
        dataLabel,
        "data-label": legacyDataLabel,
        temporalBrush: temporalBrushProp,
        enableTemporalBrush,
        radioButtonProps = {},
        style,
        className,
        styleClass,
        ...groupProps
    } = props;
    const optionData = data ?? options ?? [];
    const usesData = Array.isArray(optionData) && optionData.length > 0;
    const childValues = useMemo(
        () => getChildValues(children),
        [children]
    );
    const availableOptions = usesData ? optionData : childValues;
    const legacyChildValue = getLegacyChildValue(children);
    const tooltipLabel = dataLabel ?? legacyDataLabel ?? id;
    const visualize = props.visualize ?? true;
    const temporalBrush =
        temporalBrushProp ?? enableTemporalBrush ?? false;
    const legacyValueField =
        usesData &&
        !props.optionValue &&
        !props.valueField &&
        optionHasField(optionData, props.value)
            ? props.value
            : undefined;
    const legacyLabelField =
        usesData &&
        !props.optionLabel &&
        optionHasField(optionData, props.label)
            ? props.label
            : undefined;
    const config = useMemo(
        () => ({
            dataKey: props.dataKey,
            optionLabel:
                props.optionLabel ?? legacyLabelField,
            optionValue:
                props.optionValue ??
                props.valueField ??
                legacyValueField,
        }),
        [
            props.dataKey,
            props.optionLabel,
            props.optionValue,
            props.valueField,
            legacyLabelField,
            legacyValueField,
        ]
    );
    const contractProps = legacyValueField
        ? { ...props, value: undefined }
        : props;
    const initialValueRef = useRef(
        getInitialRadioGroupValue(
            contractProps,
            availableOptions,
            config,
            legacyChildValue
        )
    );
    const [revertedValue] = useRevertedValue(id);
    const {
        registerWidget,
        notifyWidget,
        restoreWidgetValue,
    } = useWidgetRegistry();
    const [showTimeline, setShowTimeline] = useState(false);
    const [brushRange, setBrushRange] = useState([0, 100]);
    const elementRef = useRef(null);
    const propsRef = useRef(props);
    const availableOptionsRef = useRef(availableOptions);
    const configRef = useRef(config);
    const itemRegistrationsRef = useRef(new Map());
    propsRef.current = props;
    availableOptionsRef.current = availableOptions;
    configRef.current = config;

    const strategyFactory = useMemo(
        () => () => {
            const strategy = new SelectionProvenance();
            strategy.tooltipLabel = tooltipLabel;
            strategy.tooltipIndexOffset = 1;
            return strategy;
        },
        [tooltipLabel]
    );

    const {
        currentValue,
        strategy,
        hasProvenance,
        provenance: serializedProvenance,
        mode: provenanceMode,
        recordInteraction,
        recordExternalChange,
        restoreValue,
    } = useProvenanceController({
        id,
        widgetType: "radio-group",
        value: initialValueRef.current,
        provenance: props.provenance,
        mode: props.mode,
        sampleIntervalMs: props.sampleIntervalMs,
        freeze: props.freeze,
        visualize,
        onProvenanceChange:
            props.onProvenanceChange ?? props.provenanceChange,
        strategyFactory,
    });
    const [selection, setSelection] = useState(currentValue ?? null);
    const currentValueRef = useRef(currentValue);
    const selectionRef = useRef(selection);
    const serializedProvenanceRef = useRef(serializedProvenance);
    currentValueRef.current = currentValue;
    selectionRef.current = selection;
    serializedProvenanceRef.current = serializedProvenance;
    const currentValueKey = radioGroupValueKey(currentValue);
    const historyVersion = serializedProvenance.data
        .map(record => record.timestamp)
        .join("|");
    const timeDomain = useMemo(
        () => getSelectionTimeDomain(serializedProvenance.data),
        [historyVersion]
    );

    const updateLegacyChildren = useCallback((nextValue) => {
        const setters = new Set(
            Array.from(itemRegistrationsRef.current.values())
                .map(registration => registration.setStateItem)
                .filter(Boolean)
        );
        setters.forEach(setter => setter(nextValue));
    }, []);

    useEffect(() => {
        setSelection(currentValue ?? null);
        updateLegacyChildren(currentValue ?? null);
    }, [currentValueKey, updateLegacyChildren]);

    const controlledSelection = getControlledRadioGroupValue(
        contractProps,
        availableOptions,
        config
    );
    const controlledPresent = controlledSelection !== undefined;
    const controlledValueKey = controlledPresent
        ? radioGroupValueKey(controlledSelection)
        : "__uncontrolled__";
    const previousControlledKeyRef =
        useRef(controlledValueKey);
    const previousProvenanceRef = useRef(props.provenance);
    const emittedValueKeyRef = useRef(null);

    useEffect(() => {
        const provenanceChanged =
            props.provenance !== previousProvenanceRef.current;
        const controlledChanged =
            controlledValueKey !==
            previousControlledKeyRef.current;

        if (controlledPresent && controlledChanged) {
            setSelection(controlledSelection);
            updateLegacyChildren(controlledSelection);
            if (
                emittedValueKeyRef.current === controlledValueKey ||
                provenanceChanged
            ) {
                emittedValueKeyRef.current = null;
            } else {
                recordExternalChange(controlledSelection, {
                    caller: getRadioGroupCaller(
                        currentValueRef.current,
                        controlledSelection
                    ),
                });
            }
        }
        previousControlledKeyRef.current = controlledValueKey;
        previousProvenanceRef.current = props.provenance;
    }, [
        controlledPresent,
        controlledSelection,
        controlledValueKey,
        props.provenance,
        recordExternalChange,
        updateLegacyChildren,
    ]);

    const applyRegisteredValue = useCallback(
        (nextValue, source = "history") => {
            const restored = resolveRadioGroupValue(
                availableOptionsRef.current,
                nextValue,
                configRef.current
            );
            if (
                nextValue !== null &&
                nextValue !== undefined &&
                restored === null
            ) {
                return false;
            }
            const changed = restoreValue(restored, {
                caller: getRadioGroupCaller(
                    currentValueRef.current,
                    restored
                ),
            });
            emittedValueKeyRef.current =
                radioGroupValueKey(restored);
            setSelection(restored);
            updateLegacyChildren(restored);
            callRadioGroupCallbacks(
                propsRef.current,
                restored,
                { source }
            );
            return changed;
        },
        [restoreValue, updateLegacyChildren]
    );

    const selectValue = useCallback(
        (nextValue, event) => {
            const resolved = resolveRadioGroupValue(
                availableOptionsRef.current,
                nextValue,
                configRef.current
            );
            if (resolved === null) return false;
            emittedValueKeyRef.current =
                radioGroupValueKey(resolved);
            recordInteraction(resolved, {
                caller: getRadioGroupCaller(
                    currentValueRef.current,
                    resolved
                ),
            });
            setSelection(resolved);
            updateLegacyChildren(resolved);
            callRadioGroupCallbacks(
                propsRef.current,
                resolved,
                event
            );
            return true;
        },
        [recordInteraction, updateLegacyChildren]
    );

    const registerRadio = useCallback((registration) => {
        const key = registration.value;
        itemRegistrationsRef.current.set(key, registration);
        return () => {
            if (
                itemRegistrationsRef.current.get(key) === registration
            ) {
                itemRegistrationsRef.current.delete(key);
            }
        };
    }, []);

    useEffect(() => {
        if (!strategy) return undefined;
        strategy.hasUserInteracted = hasProvenance;
        strategy.tooltipLabel = tooltipLabel;
        strategy.tooltipIndexOffset = 1;
        notifyWidget(id);
        return undefined;
    }, [
        strategy,
        hasProvenance,
        tooltipLabel,
        id,
        notifyWidget,
    ]);

    useEffect(() => {
        if (!strategy) return undefined;
        const registration = {
            id,
            type: "radio-group",
            provenance: strategy,
            getProvenance: () => serializedProvenanceRef.current,
            elementRef,
            getValue: () => selectionRef.current,
            setValue: applyRegisteredValue,
            visualize,
            mode: provenanceMode,
            rendersOwnTemporalHeader: true,
            focus: () => {
                elementRef.current?.scrollIntoView?.({
                    behavior: "smooth",
                    block: "center",
                });
                elementRef.current
                    ?.querySelector?.('input[type="radio"]')
                    ?.focus?.();
            },
        };
        const unregister = registerWidget(registration);
        const refreshRegistry = () => notifyWidget(id);
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
        id,
        applyRegisteredValue,
        registerWidget,
        notifyWidget,
        visualize,
        provenanceMode,
    ]);

    useEffect(() => {
        const handleToggle = event => {
            if (event.detail?.target !== id) return;
            setShowTimeline(Boolean(event.detail.open));
        };
        window.addEventListener(
            "provenance-timeline-toggle",
            handleToggle
        );
        return () => window.removeEventListener(
            "provenance-timeline-toggle",
            handleToggle
        );
    }, [id]);

    useEffect(() => {
        if (revertedValue === undefined) return;
        applyRegisteredValue(revertedValue, "history");
    }, [revertedValue, applyRegisteredValue]);

    const restoreTemporalValue = useCallback(
        value => restoreRadioGroupTemporalValue({
            restoreWidgetValue,
            target: id,
            value,
        }),
        [restoreWidgetValue, id]
    );

    const handleBrushChange = event => {
        setBrushRange(normalizeSelectionBrushRange(event.value));
    };

    const handleBrushEnd = event => {
        const range = normalizeSelectionBrushRange(
            event.value ?? brushRange
        );
        setBrushRange(range);
        window.dispatchEvent(new CustomEvent(
            "provenance-widgets",
            {
                detail: {
                    id,
                    widget: "radio-group",
                    mode: provenanceMode,
                    interaction: "brush-end",
                    data: { selection: range },
                },
            }
        ));
    };

    const renderedChildren = usesData
        ? optionData.map((option, index) => {
            const value = getRadioOptionValue(option, config);
            const label = getRadioOptionLabel(option, config);
            const optionProps =
                option && typeof option === "object"
                    ? option
                    : {};
            const legacyName =
                typeof props.name === "string"
                    ? optionProps[props.name]
                    : undefined;
            const legacyInputId =
                typeof props.inputId === "string"
                    ? optionProps[props.inputId]
                    : undefined;
            return (
                <Radiobutton
                    key={String(value ?? index)}
                    {...radioButtonProps}
                    {...optionProps}
                    value={value}
                    displayLabel={label}
                    name={
                        legacyName ??
                        optionProps.name ??
                        name ??
                        id
                    }
                    inputId={
                        legacyInputId ??
                        optionProps.inputId ??
                        `${id}-${String(value ?? index)}`
                    }
                    tabIndex={
                        optionProps.tabIndex ??
                        optionProps.tabindex ??
                        props.tabIndex ??
                        props.tabindex
                    }
                    ariaLabel={
                        optionProps.ariaLabel ??
                        props.ariaLabel
                    }
                    ariaLabelledBy={
                        optionProps.ariaLabelledBy ??
                        props.ariaLabelledBy
                    }
                    disabled={
                        optionProps.disabled ??
                        props.disabled
                    }
                    labelStyleClass={
                        optionProps.labelStyleClass ??
                        props.labelStyleClass
                    }
                />
            );
        })
        : children;

    const contextValue = useMemo(
        () => ({
            id,
            selected: selection,
            selectValue,
            registerRadio,
            guidance: strategy,
            hasProvenance,
            visualize,
            mode: provenanceMode,
            showTimeline,
            timeDomain,
            brushRange,
            tooltipLabel,
            restoreTemporalValue,
        }),
        [
            id,
            selection,
            selectValue,
            registerRadio,
            strategy,
            hasProvenance,
            visualize,
            provenanceMode,
            showTimeline,
            timeDomain,
            brushRange,
            tooltipLabel,
            restoreTemporalValue,
        ]
    );

    return (
        <RadioGroupContext.Provider value={contextValue}>
            <div
                ref={elementRef}
                id={id}
                role="radiogroup"
                aria-label={
                    groupProps["aria-label"] ?? tooltipLabel
                }
                data-provenance-widget="radio-group"
                data-provenance-open={
                    showTimeline ? "true" : undefined
                }
                className={className ?? styleClass}
                style={style}
            >
                {visualize && hasProvenance && showTimeline && (
                    <div
                        data-timeline-axis={id}
                        data-provenance-chart-target={id}
                        style={{
                            marginLeft: "32px",
                            marginBottom: "4px",
                        }}
                    >
                        {temporalBrush && (
                            <Slider_
                                range
                                min={0}
                                max={100}
                                value={brushRange}
                                onChange={handleBrushChange}
                                onSlideEnd={handleBrushEnd}
                                aria-label={`${tooltipLabel} temporal range`}
                                style={{ marginBottom: "7px" }}
                            />
                        )}
                        <div
                            style={{
                                borderTop: "2px solid #4b5563",
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#4b5563",
                                paddingTop: "2px",
                            }}
                        >
                            <span>
                                {provenanceMode === "time"
                                    ? "t=0"
                                    : "n=0"}
                            </span>
                            <span>now</span>
                        </div>
                    </div>
                )}
                {renderedChildren}
            </div>
        </RadioGroupContext.Provider>
    );
};

export default RadioGroup;
