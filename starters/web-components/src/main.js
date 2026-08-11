import "provenance-widgets/web-components/styles.css";
import "provenance-widgets/web-components/index.js";
import "./styles.css";

const checkbox = document.querySelector("#starter-checkbox");

checkbox.data = [
  { label: "Chicken", value: "Chicken" },
  { label: "Beef", value: "Beef" },
  { label: "Lamb", value: "Lamb" },
];
checkbox.selected = ["Chicken", "Beef"];
checkbox.freeze = false;

checkbox.addEventListener("selectedChange", event => {
  console.log("selectedChange", event.detail);
});

checkbox.addEventListener("provenanceChange", event => {
  console.log("provenanceChange", event.detail);
});
