import { useEffect, useState } from 'react';
import SuperProvenance_, {
    WidgetType,
} from '../strategies/provenance/SuperProvenance.ts';
import { UNILATERAL_GUIDANCE_EVENT_NAME } from '../constants.ts';
import useProvenance from './hooks/useProvenance.js';
import useWidgetRegistry from './hooks/useWidgetRegistry.js';
import Internal_ProvenanceButton from './Internal_ProvenanceButton.js';
import AggregateView from './AggregateView.js';

const SuperProvenance = (props) => {
    const [registeredComponents, setRegisteredComponents] = useProvenance()
    const { registrations } = useWidgetRegistry();
    const [superProvenance] = useState(() => new SuperProvenance_())

    useEffect(() => {
        setRegisteredComponents(prev => {
            const newMap = prev instanceof Map ? new Map(prev) : new Map()
            newMap.set(props.id, superProvenance)
            return newMap
        })

        const handleSuperChange = () => {
            // Bump reference so consumers re-render and can read updated provenance
            setRegisteredComponents(prev => {
                if (prev instanceof Map) {
                    return new Map(prev)
                }
                // Fallback: create new Map if prev is not a Map
                return new Map()
            })
        };
        superProvenance.addEventListener(
            UNILATERAL_GUIDANCE_EVENT_NAME,
            handleSuperChange
        )

        return () => {
            superProvenance.removeEventListener(
                UNILATERAL_GUIDANCE_EVENT_NAME,
                handleSuperChange
            );
            Array.from(superProvenance.registeredWidgets.keys()).forEach(
                widgetId => superProvenance.unregister(widgetId)
            );
            setRegisteredComponents(prev => {
                if (
                    !(prev instanceof Map) ||
                    prev.get(props.id) !== superProvenance
                ) {
                    return prev;
                }
                const next = new Map(prev);
                next.delete(props.id);
                return next;
            });
        };
    }, [
        props.id,
        superProvenance,
        setRegisteredComponents,
    ])

    useEffect(() => {
        const componentIds = new Set(props.components ?? []);
        let changed = false;

        for (const widgetId of superProvenance.registeredWidgets.keys()) {
            const metadata = registrations.get(widgetId);
            const strategy =
                metadata?.provenance ??
                registeredComponents.get(widgetId);
            if (!componentIds.has(widgetId) || !strategy) {
                changed = superProvenance.unregister(widgetId) || changed;
            }
        }

        componentIds.forEach(widgetId => {
            const metadata = registrations.get(widgetId);
            const strategy =
                metadata?.provenance ??
                registeredComponents.get(widgetId);
            if (!strategy) return;

            const existing =
                superProvenance.registeredWidgets.get(widgetId);
            const needsRegistration =
                existing?.provenance !== strategy ||
                existing?.type !== (metadata?.type ?? WidgetType.UNKNOWN) ||
                existing?.setValue !== metadata?.setValue;
            if (!needsRegistration) return;

            if (metadata) {
                superProvenance.register(metadata);
            } else {
                // Compatibility for the six widgets not yet migrated. No
                // behavior is inferred from their id.
                superProvenance.register(
                    widgetId,
                    strategy,
                    undefined,
                    WidgetType.UNKNOWN
                );
            }
            changed = true;
        });

        if (changed) {
            setRegisteredComponents(prev =>
                prev instanceof Map ? new Map(prev) : new Map()
            );
        }
    }, [
        props.components,
        registeredComponents,
        registrations,
        superProvenance,
        setRegisteredComponents,
    ])

    return (
        <div>
            {props.default && <div style={{ display: "flex", gap: 10, position: "relative" }}>
                <Internal_ProvenanceButton prov={superProvenance} />
                <AggregateView target={props.id} />
            </div>}
            {props.children}
        </div>
    )
}

export default SuperProvenance
