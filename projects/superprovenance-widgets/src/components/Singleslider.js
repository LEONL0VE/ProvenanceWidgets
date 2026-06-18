import { Slider as Slider_ } from 'primereact/slider/slider.esm.js';
import { useEffect, useRef, useState } from 'react';
import NumericProvenance from '../strategies/provenance/NumericProvenance.ts';
import { UNILATERAL_GUIDANCE_EVENT_NAME } from '../constants.ts';
import useProvenance from './hooks/useProvenance.js';
import { transform, generateRange } from './utils.js';
import Bars from './Bars.js';
import { interpolateOranges } from 'd3';
import useRevertedValue from './hooks/useRevertedValue.js';

// { id, stateItem, setStateItem, max, min = 0, step = 1 }
import useElementSize from './hooks/useElementSize.js';
import Chart from './Chart.js';

const Singleslider = (props) => {
    const initialValue = props.value ?? (props.min ?? 0);
    const [revertedValue] = useRevertedValue(props.id);
    const [registeredComponents, setRegisteredComponents] = useProvenance()
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const [curr, setCurr] = useState()

    useEffect(() => {
        const handleToggle = (e) => {
            if (e.detail && e.detail.target === props.id) {
                setDropdownVisible(e.detail.open);
            }
        };
        window.addEventListener('provenance-dropdown-toggle', handleToggle);
        return () => window.removeEventListener('provenance-dropdown-toggle', handleToggle);
    }, [props.id]);

    useEffect(() => {
        if (revertedValue !== undefined && curr) {
            props.onChange(revertedValue);
            curr.insert(revertedValue);
            lastInsertedRef.current = revertedValue;
        }
    }, [revertedValue, curr]);
    const lastInsertedRef = useRef(null)

    // Measure width of the container
    const [containerRef, { width: containerWidth }] = useElementSize();

    useEffect(() => {
        const sliderProvenance = new NumericProvenance(props.min ? props.min : 0, props.max);
        setCurr(sliderProvenance)
        
        // Initialize provenance with current value if it exists
        if (props.value !== undefined && props.value !== null) {
            sliderProvenance.insert(props.value);
            lastInsertedRef.current = props.value;
        } else if (initialValue !== undefined) {
            sliderProvenance.insert(initialValue);
            lastInsertedRef.current = initialValue;
        }

        setRegisteredComponents(prev => {
            const newMap = prev instanceof Map ? new Map(prev) : new Map()
            newMap.set(props.id, sliderProvenance)
            return newMap
        })

        sliderProvenance.addEventListener(UNILATERAL_GUIDANCE_EVENT_NAME, v => {
            // Bump reference so consumers re-render and can read updated provenance
            setRegisteredComponents(prev => {
                if (prev instanceof Map) {
                    return new Map(prev)
                }
                // Fallback: create new Map if prev is not a Map
                return new Map()
            })
        })
    }, [])

    const onProvChange = (val) => {
        if (!curr) return;
        const intVal = parseInt(val)
        if (Number.isNaN(intVal)) return

        // Skip if same as last inserted to avoid duplicate provenance entries
        if (lastInsertedRef.current === intVal) return

        curr.insert(intVal)
        lastInsertedRef.current = intVal
    }

    return (
        <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "1rem", width: "100%", position: 'relative' }}>
            {/* Scents Bars Visualization */}
            {containerWidth > 0 && curr &&
                <Bars
                    guidance={curr}
                    orientationScheme={interpolateOranges}
                    barKeys={generateRange(props.min || 0, (props.max || 100) + (props.step || 1), props.step || 1)}
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
            }
            <div style={{ display: "flex", alignItems: "center", gap: "5px", width: "100%" }}>
                <Slider_ style={{ width: "100%" }} step={props.step} max={props.max} min={props.min ? props.min : 0} value={props.value} onChange={e => { props.onChange(e.value); onProvChange(e.value); }} />
            </div>

            {isDropdownVisible && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    border: '1px solid #ccc',
                    backgroundColor: '#fff',
                    zIndex: 1000,
                    borderRadius: '4px',
                    marginTop: '5px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>
                    <Chart target={props.id} theme="light" />
                </div>
            )}
        </div>
    )
}

export default Singleslider 
