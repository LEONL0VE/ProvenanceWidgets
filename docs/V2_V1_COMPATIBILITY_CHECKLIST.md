# Provenance Widgets V2 / V1 Compatibility Checklist

This checklist is the implementation gate for turning the current `main`
codebase into "V1 behavior plus SuperProvenance". A component is complete only
when both its public contract and its visible interaction behavior pass.

## 0. Branch and source policy

- [x] Develop from local V2 `main` on `feat/v2-v1-compat`.
- [x] Keep `v1` read-only and use `git show v1:<path>` as the behavior reference.
- [x] Leave `Super_Version2` frozen; its source duplicates the V2 `main` source.
- [ ] Merge reviewed feature commits into `main`.
- [ ] Reconcile the fork remote before any push or pull involving `origin/main`.

## 1. Shared public contract

- [x] Define the seven supported widget types.
- [x] Define `provenance` input and a JSON-safe V2 export format.
- [x] Accept V1 `data` and `selections` provenance.
- [x] Preserve the V1 initial-value baseline without enabling the footprint.
- [x] Define `onProvenanceChange`.
- [x] Implement `mode="interaction"` and `mode="time"`.
- [x] Implement `sampleIntervalMs` with the V1 default of 1000 ms.
- [x] Implement `freeze`.
- [x] Implement `visualize`.
- [x] Support `dataLabel` and `data-label`.
- [x] Record explicit `user`, `external`, and `history` change sources.
- [x] Stop and restart timers safely across React lifecycle replay.
- [ ] Publish generated TypeScript declarations for the public contract.

## 2. Shared controller and Provider registration

- [x] Use one framework-independent provenance controller.
- [x] Provide a React lifecycle hook for that controller.
- [x] Rebuild aggregate strategy data after provenance replacement.
- [x] Return defensive export snapshots.
- [x] Reject incompatible widget provenance during restore.
- [x] Add a parallel Provider metadata registry with:
  `id`, `type`, `provenance`, `element`, `getValue`, and `setValue`.
- [x] Add explicit `register`, `unregister`, `notify`, `restore`, and `focus`
  Provider actions.
- [ ] Migrate the remaining six widgets and remove the transitional raw
  `Map<id, strategy>`.
- [ ] Remove DOM queries and widget-type guesses based on IDs.

## 3. Widget-by-widget compatibility

### Single Slider

- [x] Keep current React `min`, `max`, `step`, `value`, and `onChange`.
- [x] Accept V1-style `options.floor`, `options.ceil`, and `options.step`.
- [x] Add common provenance props and external provenance replacement.
- [x] Add external controlled-value logging.
- [x] Implement `freeze`.
- [x] Hide the Slider's inline Aggregate/Chart content when `visualize=false`.
- [x] Connect `visualize` to the separately rendered footprint button.
- [x] Restore values selected through the current SuperProvenance path.
- [x] Unregister listeners and Provider state on unmount.
- [ ] Add a component contract test in a DOM test environment.
- [x] Restore a value by directly clicking its Aggregate bar.
- [x] Restore a value by directly clicking its Temporal point.
- [x] Keep Temporal brush/zoom available as `temporalBrush={true}`, hidden
  by default for Super Widgets, and attach the opt-in brushY to the PW 1.0
  vertical axis with usage guidance.
- [x] Show the live time sample endpoint and position time-mode points by time.
- [x] Verify the disabled, Aggregate, and Temporal footprint states.

### Range Slider

- [ ] Unify `value`, `highValue`, `options`, and change callbacks.
- [ ] Add the shared provenance contract.
- [ ] Complete Aggregate and Temporal restore behavior.
- [ ] Add Temporal brush/zoom and time-mode verification.

### Input Text

- [ ] Replace the private text state with the unified value contract.
- [ ] Add the shared provenance contract.
- [ ] Complete Aggregate and Temporal restore behavior.

### Dropdown

- [ ] Replace the private selected state with `selected`.
- [ ] Add `onSelectedChange` and the shared provenance contract.
- [ ] Complete Aggregate and Temporal restore behavior.

### Multiselect

- [ ] Replace the private selected state with `selected[]`.
- [ ] Add `onSelectedChange` and the shared provenance contract.
- [ ] Complete Aggregate and Temporal restore behavior.

### Radio Group

- [ ] Replace per-item state wiring with group-level `selected`.
- [ ] Add `onSelectedChange` and the shared provenance contract.
- [ ] Complete Aggregate and Temporal restore behavior.

### Checkbox Group

- [ ] Replace per-item state wiring with group-level `selected[]`.
- [ ] Add `onSelectedChange` and the shared provenance contract.
- [ ] Complete Aggregate and Temporal restore behavior.

## 4. SuperProvenance

- [x] Preserve baselines for replay without counting them as interactions.
- [x] Exclude `baseline` and `sample` records from the Super sequence.
- [x] Keep the global footprint available before the first interaction.
- [x] Render registered widgets as colored, empty outline slots in Default View.
- [x] Keep the Super Aggregate track visible before interaction.
- [x] Reserve the original fixed-width slot for every non-interacted widget.
- [x] Divide only the remaining Aggregate width among interacted widgets.
- [x] Assign stable colors to every registered widget's footprint immediately.
- [x] Show every registered widget row in Temporal View, including empty rows.
- [x] Remove the hard-coded `WidgetType.INPUTTEXT` registration.
- [x] Allow `SuperProvenance.register()` to accept explicit widget metadata.
- [ ] Register every widget with explicit type and value adapters.
- [ ] Add unregistration when a widget unmounts.
- [ ] Navigate without querying the DOM or parsing IDs.
- [ ] Verify cross-widget Aggregate and Temporal views.
- [ ] Verify click navigation and multi-widget replay.
- [ ] Export the documented Scents/Bars API.

## 5. Web Components

- [ ] Restore the six V1 custom element names.
- [ ] Expose object and array inputs as element properties.
- [ ] Dispatch `selectedChange`, `valueChange`, and `provenanceChange`.
- [ ] Add a custom-elements build entry and package exports.
- [ ] Add property and event contract tests.

## 6. Acceptance tests

- [x] Shared serialization and controller contract tests.
- [x] Baseline filtering tests for Super Aggregate and Temporal data.
- [ ] Seven widget value/change tests.
- [ ] Seven widget provenance import/export/restore tests.
- [ ] Interaction/time/freeze/visualize tests at component level.
- [ ] Aggregate/Temporal click restore tests.
- [ ] Temporal brush/zoom tests.
- [ ] Provider registration and SuperProvenance replay tests.
- [ ] Scented Widgets integration scenario.
- [ ] Phosphor Objects integration scenario.
- [ ] Dynamic Query Widgets integration scenario.

## 7. Showcase, documentation, and release

- [ ] Fix the repository TypeScript-check configuration independently of UI work.
- [ ] Migrate Showcase only after the widget contracts are stable.
- [ ] Remove the temporary SuperProvenance on/off control.
- [ ] Write the V1-to-V2 migration guide.
- [ ] Verify install, test, and build on Windows, Linux, and macOS.
- [ ] Publish `2.0.0` only after all release gates pass.
