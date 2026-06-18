import { useMemo, useState } from 'react';
import ProvenanceContext from '../contexts/provenance.js';

const ProvenanceProvider = ({ children }) => {
    const [registeredComponents, setRegisteredComponents] = useState(new Map())
    const [widgetColors, setWidgetColors] = useState({}) // Object mapping target -> hex color
    const [revertedValues, setRevertedValues] = useState({}) // Object mapping id -> value at specific time

    const value = useMemo(() => ({
        state: { registeredComponents, widgetColors, revertedValues },
        actions: { setRegisteredComponents, setWidgetColors, setRevertedValues },
    }), [registeredComponents, widgetColors, revertedValues])

    return (
        <ProvenanceContext.Provider value={value}>
            {children}
        </ProvenanceContext.Provider>
    )
}

export default ProvenanceProvider