import { InputText as InputText_ } from 'primereact/inputtext/inputtext.esm.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import useProvenance from './hooks/useProvenance.js';
import Bars from './Bars.js';
import TextProvenance from '../strategies/provenance/TextProvenance.ts';
import { UNILATERAL_GUIDANCE_EVENT_NAME } from '../constants.ts';
import { interpolateOranges } from 'd3';
import { getScentColor, getContrastColor } from './utils.js';
import useRevertedValue from './hooks/useRevertedValue.js';
import Chart from './Chart.js';

const InputText = ({ placeholder, id }) => {
    const [text, setText] = useState('');
    const [revertedValue] = useRevertedValue(id);
    const [textProvenance, setTextProvenance] = useState(null);

    useEffect(() => {
        if (revertedValue !== undefined && revertedValue !== null) {
            setText(String(revertedValue));
            if (textProvenance) {
                textProvenance.insert(String(revertedValue));
            }
        }
    }, [revertedValue, textProvenance]);

    const [, setRegisteredComponents] = useProvenance();
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const inputRef = useRef(null);

    // Listen for provenance-dropdown-toggle for this input
    useEffect(() => {
        const handleToggle = (e) => {
            if (e.detail && e.detail.target === id) {
                setDropdownVisible(e.detail.open);
            }
        };
        window.addEventListener('provenance-dropdown-toggle', handleToggle);
        return () => window.removeEventListener('provenance-dropdown-toggle', handleToggle);
    }, [id]);

    useEffect(() => {
        const newTextProvenance = new TextProvenance();
        setTextProvenance(newTextProvenance);
        setRegisteredComponents(prev => {
            const newMap = prev instanceof Map ? new Map(prev) : new Map();
            newMap.set(id, newTextProvenance);
            return newMap;
        });

        const handleGuidance = () => {
            setRegisteredComponents(prev => (prev instanceof Map ? new Map(prev) : new Map()));
        };
        newTextProvenance.addEventListener(UNILATERAL_GUIDANCE_EVENT_NAME, handleGuidance);

        return () => {
            newTextProvenance.removeEventListener(UNILATERAL_GUIDANCE_EVENT_NAME, handleGuidance);
        };
    }, [id, setRegisteredComponents]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setText(value);
        // We usually don't open dropdown on type for provenance view, 
        // unless it's a search dropdown. 
        // But the user requested "Temporal view for input text will be similar to single select...".
        // This implies the view is triggered by the ProvenanceButton, which sets isDropdownVisible via event.
        // So we might NOT want to auto-open here.
        // However, standard behavior might be to track history on change/enter.
        // Let's keep existing logic but ensure the provenance view uses Chart.
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            const trimmed = text.trim();
            if (!trimmed || !textProvenance) return;
            textProvenance.insert(trimmed);
            // setDropdownVisible(false); // Don't auto-close if we are viewing history
        }
    };

    // We no longer rely on matchingKeys for the provenance view requested by user.
    // The user wants a Gantt view of ALL stored items.
    // This is handled by <Chart target={id} /> which we should render in the dropdown.

    return (
        <div style={{ marginTop: "1rem", position: 'relative' }} ref={inputRef}>
            <InputText_
                placeholder={placeholder}
                onKeyDown={handleKeyDown}
                onChange={handleInputChange}
                value={text}
                style={{ width: '100%' }}
            />
            {isDropdownVisible && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    border: '1px solid #ccc',
                    backgroundColor: '#fff', // White background
                    zIndex: 1000,
                    borderRadius: '4px',
                    marginTop: '5px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>
                   <Chart target={id} theme="light" />
                </div>
            )}
        </div>
    );
};

export default InputText;
