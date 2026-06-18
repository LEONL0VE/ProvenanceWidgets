import { createContext } from 'react';

const ProvenanceContext = createContext({
    state: {
        registeredComponents: new Map(),
        widgetColors: {},
        revertedValues: {}
    },
    actions: {
        setRegisteredComponents: () => { },
        setWidgetColors: () => { },
        setRevertedValues: () => { }
    }
});

export default ProvenanceContext;