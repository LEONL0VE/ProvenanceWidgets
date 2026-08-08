import test from "node:test";
import assert from "node:assert/strict";
import { ProvenanceController } from "@provenance-widgets/core";

const createStrategy = () => {
    const inserts = [];
    return {
        inserts,
        insert: (value, options) => inserts.push({ value, options }),
    };
};

test("starts without a footprint and enables Aggregate View after the first interaction", () => {
    const strategy = createStrategy();
    const changes = [];
    const controller = new ProvenanceController({
        id: "price",
        widgetType: "single-slider",
        value: 10,
        strategy,
        now: () => new Date("2026-07-30T01:00:00.000Z"),
        onProvenanceChange: (provenance, meta) =>
            changes.push({ provenance, meta }),
    });

    assert.equal(controller.getSnapshot().hasProvenance, false);
    assert.equal(controller.getSnapshot().view, "default");

    assert.equal(controller.recordInteraction(20), true);
    assert.equal(controller.getSnapshot().hasProvenance, true);
    assert.equal(controller.getSnapshot().view, "aggregate");
    assert.equal(strategy.inserts.length, 2);
    assert.deepEqual(
        strategy.inserts.map(insert => insert.options.kind),
        ["baseline", "interaction"]
    );
    assert.equal(changes.length, 1);
    assert.equal(changes[0].meta.source, "user");
    assert.equal(changes[0].meta.record.value, 20);
    assert.deepEqual(
        changes[0].provenance.data.map(record => record.kind),
        ["baseline", "interaction"]
    );

    assert.equal(controller.recordInteraction(20), false);
    assert.equal(strategy.inserts.length, 2);
    assert.equal(changes.length, 1);
});

test("freeze keeps the control usable while preventing new provenance", () => {
    const changes = [];
    const controller = new ProvenanceController({
        id: "query",
        widgetType: "input-text",
        value: "pizza",
        freeze: true,
        onProvenanceChange: provenance => changes.push(provenance),
    });

    assert.equal(controller.recordInteraction("pasta"), false);
    assert.equal(controller.getSnapshot().currentValue, "pasta");
    assert.equal(controller.exportProvenance().data.length, 1);
    assert.equal(changes.length, 0);

    controller.setOptions({ freeze: false });
    assert.equal(controller.recordInteraction("salad"), true);
    assert.equal(controller.exportProvenance().data.length, 2);
    assert.equal(changes.length, 1);
});

test("visualize hides overlays without disabling provenance collection", () => {
    const controller = new ProvenanceController({
        id: "city",
        widgetType: "dropdown",
        value: "Paris",
        visualize: false,
    });

    controller.recordInteraction("London");
    assert.equal(controller.getSnapshot().hasProvenance, true);
    assert.equal(controller.getSnapshot().view, "default");
    assert.equal(controller.toggleView(), "default");

    controller.setOptions({ visualize: true });
    assert.equal(controller.getSnapshot().view, "aggregate");
    assert.equal(controller.toggleView(), "temporal");
    assert.equal(controller.toggleView(), "aggregate");
});

test("records external updates and history navigation with an explicit source", () => {
    const sources = [];
    const controller = new ProvenanceController({
        id: "price",
        widgetType: "single-slider",
        value: 10,
        onProvenanceChange: (_provenance, meta) =>
            sources.push(meta.source),
    });

    controller.recordExternalChange(30, { caller: "chart-brush" });
    controller.restoreValue(10);

    assert.deepEqual(sources, ["external", "history"]);
    assert.equal(
        controller.exportProvenance().data[1].caller,
        "chart-brush"
    );
});

test("time mode maintains one live sample endpoint and emits only for interactions", () => {
    let now = new Date("2026-07-30T01:00:00.000Z");
    let tick;
    const cleared = [];
    const changes = [];
    const scheduler = {
        setInterval: (callback, interval) => {
            assert.equal(interval, 1000);
            tick = callback;
            return 17;
        },
        clearInterval: intervalId => cleared.push(intervalId),
    };
    const controller = new ProvenanceController({
        id: "price",
        widgetType: "single-slider",
        value: 10,
        mode: "time",
        now: () => now,
        scheduler,
        onProvenanceChange: provenance => changes.push(provenance),
    });

    controller.recordInteraction(20);
    let records = controller.exportProvenance().data;
    assert.deepEqual(records.map(record => record.kind), [
        "baseline",
        "interaction",
        "sample",
    ]);
    assert.equal(changes.length, 1);

    now = new Date("2026-07-30T01:00:01.000Z");
    tick();
    records = controller.exportProvenance().data;
    assert.equal(records.length, 3);
    assert.equal(records[2].timestamp, "2026-07-30T01:00:01.000Z");
    assert.equal(changes.length, 1);

    now = new Date("2026-07-30T01:00:02.000Z");
    controller.recordInteraction(30);
    records = controller.exportProvenance().data;
    assert.deepEqual(records.map(record => record.kind), [
        "baseline",
        "interaction",
        "sample",
        "interaction",
        "sample",
    ]);
    assert.equal(changes.length, 2);
    assert.deepEqual(cleared, [17]);

    controller.setOptions({ freeze: true });
    assert.deepEqual(cleared, [17, 17]);
    controller.dispose();
    controller.dispose();
    assert.deepEqual(cleared, [17, 17]);
});

test("restores V1 provenance and rebuilds derived strategy data", () => {
    const strategies = [];
    const strategyFactory = () => {
        const strategy = createStrategy();
        strategies.push(strategy);
        return strategy;
    };
    const controller = new ProvenanceController({
        id: "price",
        widgetType: "single-slider",
        value: 0,
        strategyFactory,
    });

    controller.replaceProvenance({
        data: [
            {
                value: [20],
                timestamp: "2026-07-30T01:00:00.000Z",
            },
            {
                value: [40],
                timestamp: "2026-07-30T01:01:00.000Z",
            },
        ],
        revalidate: true,
    });

    assert.equal(strategies.length, 2);
    assert.deepEqual(
        strategies[1].inserts.map(record => record.value),
        [20, 40]
    );
    assert.equal(controller.getSnapshot().currentValue, 40);
    assert.equal(controller.getSnapshot().view, "aggregate");
});

test("exports defensive snapshots that callers cannot mutate", () => {
    const controller = new ProvenanceController({
        id: "range",
        widgetType: "range-slider",
        value: [10, 20],
    });

    controller.recordInteraction([20, 40]);
    const exported = controller.exportProvenance();
    exported.data[0].value[0] = 999;
    exported.data.push({});

    assert.deepEqual(
        controller.exportProvenance().data.map(record => record.value),
        [[10, 20], [20, 40]]
    );
});

test("records and restores Range Slider values as one low/high interaction", () => {
    const strategy = createStrategy();
    const sources = [];
    const controller = new ProvenanceController({
        id: "price-range",
        widgetType: "range-slider",
        value: [10, 40],
        strategy,
        onProvenanceChange: (_provenance, meta) =>
            sources.push(meta.source),
    });

    assert.equal(controller.recordInteraction([20, 60]), true);
    assert.equal(controller.recordInteraction([20, 60]), false);
    assert.equal(controller.restoreValue([10, 40]), true);

    assert.deepEqual(
        strategy.inserts.map(insert => insert.value),
        [[10, 40], [20, 60], [10, 40]]
    );
    assert.deepEqual(sources, ["user", "history"]);
    assert.deepEqual(
        controller.getSnapshot().currentValue,
        [10, 40]
    );
});

test("records repeated Input Text searches as separate interactions", () => {
    const strategy = createStrategy();
    const controller = new ProvenanceController({
        id: "query",
        widgetType: "input-text",
        value: undefined,
        strategy,
        valuesEqual: () => false,
    });

    assert.equal(controller.recordInteraction("pizza"), true);
    assert.equal(controller.recordInteraction("pizza"), true);

    assert.deepEqual(
        controller.exportProvenance().data.map(record => record.value),
        ["pizza", "pizza"]
    );
    assert.deepEqual(
        controller.exportProvenance().data.map(record => record.kind),
        ["interaction", "interaction"]
    );
    assert.deepEqual(
        strategy.inserts.map(insert => insert.value),
        ["pizza", "pizza"]
    );
});

test("records scalar dropdown keys, clearing, and history restore", () => {
    const strategy = createStrategy();
    const sources = [];
    const controller = new ProvenanceController({
        id: "customer-city-filter",
        widgetType: "dropdown",
        value: "NY",
        strategy,
        onProvenanceChange: (_provenance, meta) =>
            sources.push(meta.source),
    });

    assert.equal(controller.getSnapshot().hasProvenance, false);
    assert.equal(controller.recordInteraction("LDN", {
        caller: "LDN",
    }), true);
    assert.equal(controller.recordInteraction("LDN", {
        caller: "LDN",
    }), false);
    assert.equal(controller.recordInteraction(null, {
        caller: "LDN",
    }), true);
    assert.equal(controller.restoreValue("NY", {
        caller: "NY",
    }), true);

    assert.deepEqual(
        controller.exportProvenance().data.map(record => record.value),
        ["NY", "LDN", null, "NY"]
    );
    assert.deepEqual(sources, ["user", "user", "history"]);
});

test("records Radio Group as one scalar PW selection", () => {
    const strategy = createStrategy();
    const controller = new ProvenanceController({
        id: "pizza-topping-filter",
        widgetType: "radio-group",
        value: "Cheese",
        strategy,
    });

    assert.equal(controller.getSnapshot().hasProvenance, false);
    assert.equal(controller.recordInteraction("Mushroom", {
        caller: "Mushroom",
    }), true);
    assert.equal(controller.restoreValue("Cheese", {
        caller: "Cheese",
    }), true);

    assert.deepEqual(
        controller.exportProvenance().data.map(record => record.value),
        ["Cheese", "Mushroom", "Cheese"]
    );
    assert.deepEqual(
        controller.exportProvenance().data.map(record => record.kind),
        ["baseline", "interaction", "interaction"]
    );
});

test("records complete Multi Select sets as simultaneous interactions", () => {
    const strategy = createStrategy();
    const controller = new ProvenanceController({
        id: "customer-city-multi-filter",
        widgetType: "multiselect",
        value: ["NY"],
        strategy,
    });

    assert.equal(controller.getSnapshot().hasProvenance, false);
    assert.equal(controller.recordInteraction(["NY", "LDN"], {
        caller: "LDN",
    }), true);
    assert.equal(controller.recordInteraction(["NY", "LDN"], {
        caller: "LDN",
    }), false);
    assert.equal(controller.restoreValue(["LDN"], {
        caller: "NY",
    }), true);

    assert.deepEqual(
        controller.exportProvenance().data.map(record => record.value),
        [["NY"], ["NY", "LDN"], ["LDN"]]
    );
    assert.deepEqual(
        strategy.inserts.map(insert => insert.value),
        [["NY"], ["NY", "LDN"], ["LDN"]]
    );
});

test("records and restores complete Checkbox Group sets", () => {
    const strategy = createStrategy();
    const controller = new ProvenanceController({
        id: "protein-filter",
        widgetType: "checkbox-group",
        value: [],
        strategy,
    });

    assert.equal(controller.recordInteraction(["Chicken"], {
        caller: "Chicken",
    }), true);
    assert.equal(controller.recordInteraction(
        ["Chicken", "Beef"],
        { caller: "Beef" }
    ), true);
    assert.equal(controller.restoreValue(["Beef"], {
        caller: "Chicken",
    }), true);

    assert.deepEqual(
        controller.exportProvenance().data.map(record => record.value),
        [
            [],
            ["Chicken"],
            ["Chicken", "Beef"],
            ["Beef"],
        ]
    );
});

test("can pause and restart time sampling for React lifecycle replay", () => {
    let intervalCount = 0;
    let clearCount = 0;
    const controller = new ProvenanceController({
        id: "price",
        widgetType: "single-slider",
        value: 10,
        mode: "time",
        autoStart: false,
        scheduler: {
            setInterval: () => {
                intervalCount += 1;
                return intervalCount;
            },
            clearInterval: () => {
                clearCount += 1;
            },
        },
    });

    controller.recordInteraction(20);
    assert.equal(intervalCount, 0);
    controller.start();
    assert.equal(intervalCount, 1);
    controller.stop();
    assert.equal(clearCount, 1);
    controller.start();
    assert.equal(intervalCount, 2);
    controller.dispose();
    assert.equal(clearCount, 2);
});
