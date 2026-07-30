import { Key } from "../../Guidance";
import Provenance, { TemporalRecord } from "./Provenance";
import { UNILATERAL_GUIDANCE_EVENT_NAME } from "../../constants";
import type { ProvenanceWidgetType } from "../../types/provenance";

export enum WidgetType {
    SLIDER = "SLIDER",
    DROPDOWN = "DROPDOWN",
    CHECKBOX = "CHECKBOX",
    MULTISELECT = "MULTISELECT",
    RADIOBUTTON = "RADIOBUTTON",
    INPUTTEXT = "INPUTTEXT",
    UNKNOWN = "UNKNOWN",
}

export interface AggregateWidgetsRecord extends TemporalRecord {
    interactions: number;
}

export interface TemporalValue {

}

interface WidgetOptions {
    color: string
}

export interface SuperWidgetRegistration {
    id: string;
    type: ProvenanceWidgetType | WidgetType;
    provenance: Provenance<any, any, any, any>;
    getValue?: () => unknown;
    setValue?: (value: unknown, source: string) => boolean | void;
    element?: HTMLElement | null;
    elementRef?: { current: HTMLElement | null };
    focus?: () => void;
    options?: WidgetOptions,
}

interface RegisteredWidget extends SuperWidgetRegistration {
    widget: Provenance<any, any, any, any>;
    listener: EventListener;
}

export default class SuperProvenance extends Provenance<
    AggregateWidgetsRecord,
    TemporalRecord[]
> {
    registeredWidgets: Map<string, RegisteredWidget>;

    constructor() {
        super();
        this.registeredWidgets = new Map();
    }

    /**
     * @description Registers a new provenance widget in the class.
     * 
     * @usage sp.register({
     *          id: "price",
     *          type: "single-slider",
     *          provenance: numericProvenance,
     *          getValue: () => value,
     *          setValue: nextValue => setValue(nextValue)
     *        })
     */
    register(
        registrationOrKey: SuperWidgetRegistration | string,
        legacyWidget?: Provenance<any, any, any, any>,
        options?: WidgetOptions,
        legacyType: ProvenanceWidgetType | WidgetType = WidgetType.UNKNOWN
    ) {
        const registration: SuperWidgetRegistration =
            typeof registrationOrKey === "string"
                ? {
                    id: registrationOrKey,
                    type: legacyType,
                    provenance: legacyWidget!,
                    options,
                }
                : registrationOrKey;

        if (!registration.provenance) {
            throw new TypeError(
                `Cannot register "${registration.id}" without provenance`
            );
        }

        const existing = this.registeredWidgets.get(registration.id);
        if (existing?.provenance === registration.provenance) {
            this.registeredWidgets.set(registration.id, {
                ...existing,
                ...registration,
                widget: registration.provenance,
            });
            return this;
        }
        this.unregister(registration.id);

        const listener: EventListener = (event) => {
            const detail = (event as CustomEvent).detail;
            if (
                detail?.kind !== undefined &&
                detail.kind !== "interaction"
            ) {
                return;
            }
            this.insert(registration.id)
        };
        registration.provenance.addEventListener(
            UNILATERAL_GUIDANCE_EVENT_NAME,
            listener
        );
        this.registeredWidgets.set(registration.id, {
            ...registration,
            widget: registration.provenance,
            listener,
        });
        return this;
    }

    unregister(key: string) {
        const registration = this.registeredWidgets.get(key);
        if (!registration) return false;
        registration.provenance.removeEventListener(
            UNILATERAL_GUIDANCE_EVENT_NAME,
            registration.listener
        );
        this.registeredWidgets.delete(key);
        this.detailedData.delete(key);
        return true;
    }

    insert(value: string, options: { caller?: Key; time?: Date } = {}) {
        const time = this.updateTime(options.time);
        const index = this.domain.get("index")![1] + 1;

        this.domain.set("index", [0, index]);

        this.detailedData.set(value, this.detailedData.get(value) ?? []);
        this.detailedData.get(value)!.push({
            time,
            index,
            kind: "interaction"
        });

        this.dispatchEvent(
            new CustomEvent(UNILATERAL_GUIDANCE_EVENT_NAME, {
                detail: { ...this },
            })
        );

        return this;
    }
}
