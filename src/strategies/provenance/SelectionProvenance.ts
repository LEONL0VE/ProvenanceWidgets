import { UNILATERAL_GUIDANCE_EVENT_NAME } from "../../constants";
import { Key } from "../../Guidance";
import Provenance, { TemporalRecord } from "./Provenance";

export interface AggregateSelectionRecord extends TemporalRecord {
  selections: number;
  interactions: number;
  selectionIndex: number;
  selectionTime: Date;
  interactionIndex: number;
  interactionTime: Date;
}

export interface TemporalSelectionRecord {
  select: TemporalRecord;
  unselect?: TemporalRecord;
}

export default class SelectionProvenance extends Provenance<
  AggregateSelectionRecord,
  TemporalSelectionRecord[]
> {
  temporalData: Array<{
    value: Iterable<Key>;
    time: Date;
  }> = [];

  constructor(
    temporalData: Array<{
      value: Iterable<Key>;
      time: Date;
    }> = []
  ) {
    super();
    this.domain.set("selections", [0, 0]);
    this.domain.set("interactions", [0, 0]);
    this.domain.set("selectionIndex", [0, 0]);
    this.domain.set("selectionTime", [0, 0]);
    this.domain.set("interactionIndex", [0, 0]);
    this.domain.set("interactionTime", [0, 0]);
    temporalData.forEach(({ value, time }) => this.insert(value, { time }));
  }

  insert(
    _value: Key | Iterable<Key> | null,
    options: {
      caller?: Key;
      time?: Date;
      kind?: TemporalRecord["kind"];
      source?: TemporalRecord["source"];
    } = {}
  ) {
    const time = this.updateTime(options.time);
    const normalizedValue: Iterable<Key> =
      _value === null || _value === undefined
        ? []
        : (
            typeof _value === "string" ||
            typeof _value === "number" ||
            typeof _value === "symbol"
          )
          ? [_value as Key]
          : _value as Iterable<Key>;
    const value = new Set(normalizedValue);
    const previousIndex = this.domain.get("index")![1];

    this.temporalData.push({ value, time });

    const oldValues = new Set(
      this.temporalData[this.temporalData.length - 2]?.value ?? []
    );
    const selected = new Set(
      [...value].filter(item => !oldValues.has(item))
    );
    const unselected = new Set(
      [...oldValues].filter(item => !value.has(item))
    );
    // PW 1.0 treats an A -> B switch as one simultaneous interaction.
    // Its select and unselect edges therefore share one temporal index.
    const changed = selected.size > 0 || unselected.size > 0;
    const index = changed ? previousIndex + 1 : previousIndex;
    const temporalRecord = {
      time,
      index,
      ...(options.kind ? { kind: options.kind } : {}),
      ...(options.source ? { source: options.source } : {}),
    };

    // Apply unselections first, at the shared interaction index.
    if (unselected.size > 0) {
      unselected.forEach((s) => {
        const last = this.detailedData.get(s)?.at(-1);
        if (!last || last.unselect)
          throw new Error("Unselecting an unselected value");
        last.unselect = { ...temporalRecord };

        const previous = this.aggregateData.get(s);
        let { selections, interactions } = previous ?? {
          selections: 0,
          interactions: 0,
          selectionIndex: 0,
          selectionTime: time,
          interactionIndex: 0,
          interactionTime: time,
          index: 0,
          time,
        };
        if (!options.caller || options.caller === s) {
          interactions += 1;
        }

        this.aggregateData.set(s, {
          selections,
          interactions,
          index,
          time,
          selectionIndex:
            previous?.selectionIndex ?? previous?.index ?? index,
          selectionTime:
            previous?.selectionTime ?? previous?.time ?? time,
          interactionIndex: index,
          interactionTime: time,
          ...(options.kind ? { kind: options.kind } : {}),
          ...(options.source ? { source: options.source } : {}),
        });

        const maxInteractions = this.domain.get("interactions")![1];
        this.domain.set("interactions", [
          0,
          Math.max(maxInteractions, interactions),
        ]);
      });
    }

    // Apply selections second, at the same interaction index.
    if (selected.size > 0) {
      selected.forEach((s) => {
        this.detailedData.set(s, this.detailedData.get(s) ?? []);
        this.detailedData.get(s)!.push({
          select: { ...temporalRecord },
        });

        let { selections, interactions } = this.aggregateData.get(s) ?? {
          selections: 0,
          interactions: 0,
          selectionIndex: 0,
          selectionTime: time,
          interactionIndex: 0,
          interactionTime: time,
          index: 0,
          time,
        };
        selections += 1;
        if (!options.caller || options.caller === s) {
          interactions += 1;
        }

        this.aggregateData.set(s, {
          selections,
          interactions,
          index,
          time,
          selectionIndex: index,
          selectionTime: time,
          interactionIndex: index,
          interactionTime: time,
          ...(options.kind ? { kind: options.kind } : {}),
          ...(options.source ? { source: options.source } : {}),
        });

        const maxSelections = this.domain.get("selections")![1];
        const maxInteractions = this.domain.get("interactions")![1];

        this.domain.set("selections", [0, Math.max(maxSelections, selections)]);
        this.domain.set("interactions", [
          0,
          Math.max(maxInteractions, interactions),
        ]);
      });
    }

    this.domain.set("index", [0, index]);
    this.domain.set("selectionIndex", [0, index]);
    this.domain.set("interactionIndex", [0, index]);
    const timeDomain = this.domain.get("time")!;
    const visibleTimeDomain = [
      timeDomain[0],
      timeDomain[1] > timeDomain[0]
        ? timeDomain[1]
        : timeDomain[0] + 1,
      timeDomain[2],
    ];
    this.domain.set("selectionTime", visibleTimeDomain);
    this.domain.set("interactionTime", visibleTimeDomain);

    this.dispatchEvent(
      new CustomEvent(UNILATERAL_GUIDANCE_EVENT_NAME, {
        detail: {
          ...this,
          caller: options.caller,
          kind: options.kind,
          source: options.source,
        },
      })
    );
    return this;
  }
}
