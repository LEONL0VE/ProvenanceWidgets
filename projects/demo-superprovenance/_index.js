/**
 * @import * as GuidanceType from "../dist/index"
 * @type {GuidanceType}
 */
const { SuperProvenance, NumericProvenance, TextProvenance, SelectionProvenance, RangedProvenance, UNILATERAL_GUIDANCE_EVENT_NAME } = Guidance;

// Utilities
const transform = (value) => JSON.parse(JSON.stringify(value, replacer));

function replacer(_, value) {
    if (value instanceof Map) {
        return value.entries().reduce((acc, curr) => ({
            ...acc,
            [curr[0]]: curr[1]
        }), {})
    } else if (value instanceof Set) {
        return [...value.values()]
    }
    return value;
}

const superProv2 = new SuperProvenance();

const selectionProvenance1 = new SelectionProvenance();
const rangedProvenance1 = new RangedProvenance(0, 100);

document
    .getElementById("select-input-3")
    .addEventListener("change", function () {
        const selected = Array.from(this.options).filter(v => v.selected).map(v => v.value)
        let newState = selectionProvenance1.insert(selected)
    });

document
    .getElementById("ranged-slider-3")
    .addEventListener("change", () => {
        const handles = document.querySelectorAll("sp-slider-handle");
        const values = [handles.item(0).value, handles.item(1).value].toSorted((a, b) => a - b);
        let newState = rangedProvenance1.insert(values);
    });

superProv2.register("slider-input", rangedProvenance1);
superProv2.register("select-city", selectionProvenance1);

superProv2.addEventListener(UNILATERAL_GUIDANCE_EVENT_NAME, v => {
    // add it to the thingy
    provData = transform(v.detail)
    console.log(v.detail)
    renderGraph(transformData(v.detail.detailedData))
});

// Render D3.js graph
const demoBtn = document.getElementById("superprov-demo-btn");
const container = document.getElementById("container")

let provData = null

demoBtn.addEventListener("click", () => {
    // toggle details
    if (container.style.display === "none") {
        container.style.display = "block"
    }
    else {
        container.style.display = "none"
    }
})

const transformData = (detail) => {
    const keys = detail.keys()
    const extractedData = []

    for (let key of keys) {
        for (let i = 0; i < detail.get(key).length; i++) {
            const el = detail.get(key)[i];
            extractedData.push({ ...el, key })
        }
    }

    return extractedData.sort((a, b) => a.index - b.index)
}

const renderGraph = (data) => {
    const line = d3.line()
        .x(d => x(d.index))
        .y(d => y(d.key));

    container.innerHTML = ""

    // Declare the chart dimensions and margins.
    const width = 350;
    const height = 200;
    const marginTop = 20;
    const marginRight = 20;
    const marginBottom = 30;
    const marginLeft = 60;

    // Declare the x (horizontal position) scale.
    const x = d3.scaleLinear()
        .domain(provData ? [provData.domain.index[0], provData.domain.index[provData.domain.index.length - 1]] : [])
        .range([marginLeft, width - marginRight]);

    // Declare the y (vertical position) scale.
    const y = d3.scaleBand()
        .domain(Object.keys(provData.registeredWidgets))
        .range([height - marginBottom, marginTop]);

    // Create the SVG container.
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height);

    // Add the x-axis.
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x));

    // Add the y-axis.
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y));

    // svg.append("path")
    //     .datum(data) // Bind the entire dataset
    //     .attr("fill", "none")
    //     .attr("stroke", "steelblue")
    //     .attr("stroke-width", 1.5)
    //     .attr("d", line);

    const categories = data.map((d, i) => i.toString());

    // Calculate bar values
    const values = data.map((interaction) => {
        return 50
    });

    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d.start || d.index))
        .attr("y", d => y(d.key))
        .attr("width", d => {
            if (d.end && d.start) {
                return x(d.end) - x(d.start);
            }
            return 20; // Default width for single values
        })
        .attr("height", y.bandwidth())
        .attr("fill", "steelblue")
        .attr("rx", 2)
        .attr("ry", 2);

    // Append the SVG element.
    container.append(svg.node());
}