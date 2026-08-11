import { useState } from "react";
import {
  AggregateView,
  Chart,
  Checkbox,
  CheckboxGroup,
  InputText,
  MultiSelectDropdown,
  ProvenanceButton,
  ProvenanceProvider,
  Radiobutton,
  RadioGroup,
  Rangeslider,
  SingleSelectDropdown,
  Singleslider,
  SuperProvenanceWidget,
  TimelineVis,
  useProvenance,
  useProvenanceController,
  useRevertedValue,
  useWidgetRegistry,
  type ProvenanceOption,
  type SerializedProvenance,
} from "provenance-widgets";

type City = ProvenanceOption<string> & {
  label: string;
  value: string;
};

const cities: City[] = [
  { label: "New York", value: "New York" },
  { label: "London", value: "London" },
];

export function TypeConsumer() {
  const [checked, setChecked] = useState<string[]>(["New York"]);
  const [city, setCity] = useState<City | null>(cities[0]);
  const [manyCities, setManyCities] = useState<City[]>(cities);
  const [radio, setRadio] = useState<string | null>("New York");
  const [text, setText] = useState("query");
  const [single, setSingle] = useState(25);
  const [range, setRange] = useState<[number, number]>([20, 80]);
  const [registered] = useProvenance();
  const [revertedText] = useRevertedValue<string>("search");
  const registry = useWidgetRegistry();
  const customController = useProvenanceController({
    id: "custom-input",
    widgetType: "input-text",
    value: text,
  });

  const save = (provenance: SerializedProvenance<string[]>) => {
    localStorage.setItem("checkbox-history", JSON.stringify(provenance));
  };

  return (
    <ProvenanceProvider>
      <ProvenanceButton target="cities" />
      <CheckboxGroup<string>
        id="cities"
        data={cities}
        selected={checked}
        onSelectedChange={setChecked}
        onProvenanceChange={save}
      />
      <Checkbox
        label="Standalone"
        value="standalone"
        selectedChange={(value, checked) => console.log(value, checked)}
      />
      <SingleSelectDropdown<City, string>
        id="city"
        options={cities}
        selected={city}
        onSelectedChange={setCity}
      />
      <MultiSelectDropdown<City, string>
        id="many-cities"
        options={cities}
        selected={manyCities}
        onSelectedChange={setManyCities}
      />
      <RadioGroup<string>
        id="radio-city"
        data={cities}
        selected={radio}
        onSelectedChange={setRadio}
      />
      <Radiobutton
        label="Standalone radio"
        value="standalone"
        stateItem={radio ?? undefined}
        setStateItem={value => setRadio(value)}
      />
      <InputText
        id="search"
        value={text}
        onValueChange={setText}
      />
      <Singleslider
        id="single"
        value={single}
        min={0}
        max={100}
        onSelectedChange={setSingle}
      />
      <Rangeslider
        id="range"
        value={range}
        options={{ floor: 0, ceil: 100, showTicks: true }}
        onSelectedChange={setRange}
      />
      <SuperProvenanceWidget
        id="all-controls"
        components={["cities", "city", "range"]}
        default
      />
      <AggregateView target="all-controls" />
      <Chart target="cities" part="body" theme="light" />
      <TimelineVis
        records={[]}
        maxIndex={0}
        widgetId="cities"
        value="New York"
      />
      <output>
        {registered.size}:{String(revertedText)}:
        {String(registry.focusWidget("cities"))}:
        {customController.currentValue}
      </output>
    </ProvenanceProvider>
  );
}
