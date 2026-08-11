import "provenance-widgets/web-components";

const checkbox = document.querySelector("web-provenance-checkbox");

if (checkbox) {
  checkbox.data = [
    { label: "Chicken", value: "Chicken" },
    { label: "Beef", value: "Beef" },
  ];
  checkbox.selected = ["Chicken"];
  checkbox.addEventListener("selectedChange", event => {
    event.detail.forEach(value => console.log(value));
  });
  checkbox.addEventListener("provenanceChange", event => {
    console.log(event.detail.schemaVersion);
  });
}

const slider = document.querySelector("web-provenance-slider");

if (slider) {
  slider.value = 20;
  slider.highValue = 80;
  slider.addEventListener("selectedChange", event => {
    console.log(event.detail.value, event.detail.highValue);
  });
}
