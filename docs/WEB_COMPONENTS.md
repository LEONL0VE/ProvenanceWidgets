# Web Components

The V2 package registers the same six custom-element names as PW 1.0:

- `web-provenance-slider`
- `web-provenance-multiselect`
- `web-provenance-dropdown`
- `web-provenance-checkbox`
- `web-provenance-radiobutton`
- `web-provenance-inputtext`

`web-provenance-slider` becomes a range slider when `high-value` or the
`highValue` property is supplied.

## Direct script setup

```html
<link
  rel="stylesheet"
  href="/node_modules/provenance-widgets/web-components/styles.css"
>
<script
  src="/node_modules/provenance-widgets/web-components/index.js"
></script>
```

The script includes the React runtime and automatically registers all six
elements. Each element also creates the Provider and footprint required by
its provenance view.

## Values and events

Primitive values may be supplied as attributes:

```html
<web-provenance-slider
  id="price"
  value="45"
  min="0"
  max="100"
  data-label="Price"
></web-provenance-slider>
```

Arrays and objects must be assigned as JavaScript properties so their types
are preserved:

```html
<web-provenance-dropdown
  id="city"
  data-label="City"
></web-provenance-dropdown>

<script>
  const city = document.querySelector("#city");
  city.options = [
    { label: "New York", value: "new-york" },
    { label: "London", value: "london" },
  ];
  city.selected = "london";
</script>
```

Listen for native `CustomEvent` objects. The changed value or serialized
provenance is available directly in `event.detail`:

```js
city.addEventListener("selectedChange", event => {
  console.log("selected", event.detail);
});

city.addEventListener("provenanceChange", event => {
  localStorage.setItem(
    "city-provenance",
    JSON.stringify(event.detail)
  );
});
```

An exported provenance history can be restored later through the element
property:

```js
city.provenance = JSON.parse(
  localStorage.getItem("city-provenance")
);
```

Slider `selectedChange` retains PW 1.0's change-context shape:
`{ value }` for a single slider and `{ value, highValue }` for a range
slider. `valueChange` and `highValueChange` carry their individual numeric
values.

## Common API

All elements accept these properties. Primitive alternatives are also
available as the shown kebab-case attributes.

| Property | Attribute | Purpose |
| --- | --- | --- |
| `provenance` | — | Initialize or replace serialized provenance |
| `mode` | `mode` | `"interaction"` or `"time"` |
| `sampleIntervalMs` | `sample-interval-ms` | Time-mode sampling interval |
| `freeze` | `freeze` | Stop recording while retaining interaction |
| `visualize` | `visualize` | Show or hide the provenance footprint/view |
| `dataLabel` | `data-label` | Business label used in tooltips |
| `temporalBrush` | `temporal-brush` | Enable or disable the temporal brush (enabled by default) |

Event names are:

- Slider: `valueChange`, `highValueChange`, `selectedChange`,
  `provenanceChange`
- Input text: `valueChange`, `provenanceChange`
- Dropdown, multiselect, radio and checkbox: `selectedChange`,
  `provenanceChange`

All events bubble and are composed, so applications may listen on either
the element or an ancestor.

For a runnable example, build the package and open
`examples/web-components/index.html`.
