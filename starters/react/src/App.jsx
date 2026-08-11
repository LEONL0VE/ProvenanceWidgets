import { useState } from "react";
import {
  CheckboxGroup,
  ProvenanceButton,
} from "provenance-widgets";

const data = [
  { label: "Chicken", value: "Chicken" },
  { label: "Beef", value: "Beef" },
  { label: "Lamb", value: "Lamb" },
];

export default function App() {
  const [selected, setSelected] = useState(["Chicken", "Beef"]);

  return (
    <main>
      <h1>SuperProvenanceWidgets</h1>
      <p>
        Change the selection, then use the footprint to switch between
        Aggregate and Temporal provenance views.
      </p>

      <section className="example" aria-labelledby="checkbox-heading">
        <h2 id="checkbox-heading">Checkbox</h2>
        <ProvenanceButton target="starter-checkbox" />
        <CheckboxGroup
          id="starter-checkbox"
          name="starter-checkbox"
          dataLabel="Food"
          data={data}
          selected={selected}
          freeze={false}
          visualize={true}
          onSelectedChange={setSelected}
          onProvenanceChange={provenance => {
            console.log("provenanceChange", provenance);
          }}
        />
      </section>
    </main>
  );
}
