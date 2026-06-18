import "primereact/resources/themes/lara-light-cyan/theme.css";

import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PrimeReactProvider } from 'primereact/api/api.esm.js';
import Checkbox from "../superprovenance-widgets/src/components/Checkbox.js";
import CheckboxGroup from "../superprovenance-widgets/src/components/CheckboxGroup.js";
import InputText from "../superprovenance-widgets/src/components/Input.js";
import Radiobutton from "../superprovenance-widgets/src/components/Radiobutton.js";
import RadioGroup from "../superprovenance-widgets/src/components/RadioGroup.js";
import ProvenanceButton from "../superprovenance-widgets/src/components/ProvenanceButton.js";
import useProvenance from "../superprovenance-widgets/src/components/hooks/useProvenance.js";
import ProvenanceProvider from "../superprovenance-widgets/src/components/providers/ProvenanceProvider.js";
import Singleslider from "../superprovenance-widgets/src/components/Singleslider.js";
import SuperProvenance from "../superprovenance-widgets/src/components/SuperProvenance.js";
import Rangeslider from "../superprovenance-widgets/src/components/Rangeslider.js";
import AggregateView from "../superprovenance-widgets/src/components/AggregateView.js";
import SingleSelectDropdown from "../superprovenance-widgets/src/components/SingleSelectDropdown.js";
import MultiSelectDropdown from "../superprovenance-widgets/src/components/MultiSelectDropdown.js";
import useRevertedValue from "../superprovenance-widgets/src/components/hooks/useRevertedValue.js";

const rootElement = document.getElementById("root"); // Get the root HTML element
const root = createRoot(rootElement); // Create a root for the React application

const App = () => {
    const [ingredient, setIngredient] = useState()
    const [rangeVal, setRangeVal] = useState(0)
    const [rangeVals, setRangeVals] = useState([0, 100])
    const [registeredComponents, setRegisteredComponents] = useProvenance()
    const [selectedCity, setSelectedCity] = useState(null)
    const [revertedSingleSlider] = useRevertedValue('single-slider');
    const [revertedRangeSlider] = useRevertedValue('range-slider');
    const [revertedRadioGroup] = useRevertedValue('radiobutton-group');

    useEffect(() => {
        if (revertedSingleSlider !== undefined) setRangeVal(revertedSingleSlider);
    }, [revertedSingleSlider]);

    useEffect(() => {
        if (revertedRangeSlider !== undefined) setRangeVals(revertedRangeSlider);
    }, [revertedRangeSlider]);

    useEffect(() => {
        if (revertedRadioGroup !== undefined) setIngredient(revertedRadioGroup);
    }, [revertedRadioGroup]);

    const componentStyle = {
        width: "250px", // Set a fixed width for all components
        marginBottom: "0.5rem" // Reduce vertical spacing between rows
    };

    return (
        <div style={{ padding: "1rem" }}>
            <h1>Showcase</h1>
            <SuperProvenance components={["single-slider", "range-slider", "input-text", "checkbox-group", "radiobutton-group", "single-select-dropdown", "multi-select-dropdown"]} id="superprov" default>
                <div style={{ padding: "1rem" }}>
                    <div style={{ marginTop: "0", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                        <div className="checkbox-group" style={componentStyle}>
                            <div>
                                <p style={{ color: "gray" }}>Checkbox Group</p>
                                <ProvenanceButton target="checkbox-group" />
                            </div>
                            <CheckboxGroup id="checkbox-group">
                                <Checkbox id="checkbox" label="Chicken" />
                                <Checkbox id="checkbox" label="Beef" />
                                <Checkbox id="checkbox" label="Lamb" />
                            </CheckboxGroup>
                        </div>
                        <div className="input" style={componentStyle}>
                            <p style={{ color: "gray" }}>Input Text</p>
                            <ProvenanceButton target="input-text" />
                            <InputText id="input-text" placeholder="Search" />
                        </div>
                        <div className="radiobutton-group" style={componentStyle}>
                            <div>
                                <p style={{ color: "gray" }}>Radiobutton Group</p>
                                <ProvenanceButton target="radiobutton-group" />
                            </div>
                            <RadioGroup id="radiobutton-group">
                                <Radiobutton value="Cheese" label="pizza" stateItem={ingredient} setStateItem={setIngredient} />
                                <Radiobutton value="Mushroom" label="pizza" stateItem={ingredient} setStateItem={setIngredient} />
                                <Radiobutton value="Peppers" label="pizza" stateItem={ingredient} setStateItem={setIngredient} />
                            </RadioGroup>
                        </div>
                        <div className="single-slider" style={componentStyle}>
                            <div>
                                <p style={{ color: "gray" }}>Single Slider</p>
                                <ProvenanceButton target="single-slider" />
                            </div>
                            <Singleslider id="single-slider" value={rangeVal} onChange={e => setRangeVal(e)} max={100} step={10} />
                        </div>
                    </div>
                    <div style={{ marginTop: "0", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                        <div className="single-select-dropdown" style={componentStyle}>
                            <div>
                                <p style={{ color: "gray" }}>Single Select Dropdown</p>
                                <ProvenanceButton target="single-select-dropdown" />
                            </div>
                            <SingleSelectDropdown
                                id="single-select-dropdown"
                                options={[
                                    { label: "New York", value: "New York" },
                                    { label: "London", value: "London" },
                                    { label: "Paris", value: "Paris" },
                                    { label: "Mumbai", value: "Mumbai" }
                                ]}
                            />
                        </div>
                        <div className="multi-select-dropdown" style={componentStyle}>
                            <div>
                                <p style={{ color: "gray" }}>Multi Select Dropdown</p>
                                <ProvenanceButton target="multi-select-dropdown" />
                            </div>
                            <MultiSelectDropdown
                                id="multi-select-dropdown"
                                options={[
                                    { label: "New York", value: "New York" },
                                    { label: "London", value: "London" },
                                    { label: "Paris", value: "Paris" },
                                    { label: "Mumbai", value: "Mumbai" }
                                ]}
                            />
                        </div>
                        <div className="range-slider" style={componentStyle}>
                            <div>
                                <p style={{ color: "gray" }}>Range Slider</p>
                                <ProvenanceButton target="range-slider" />
                            </div>
                            <Rangeslider id="range-slider" value={rangeVals} onChange={e => setRangeVals(e)} max={100} step={10} />
                        </div>
                    </div>
                </div>
            </SuperProvenance>
        </div>
    )
}

root.render(
    <StrictMode>
        <PrimeReactProvider>
            <ProvenanceProvider>
                <App /> {/* Render your root component */}
            </ProvenanceProvider>
        </PrimeReactProvider>
    </StrictMode>
);
