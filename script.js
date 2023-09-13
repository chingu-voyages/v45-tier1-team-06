//imports libary to display graphs
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

//Dimensions for graph
// Declare the chart dimensions and margins.
const width = 640;
const height = 400;
const marginTop = 20;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 40;

// Code to pull the data from the API

let meteoriteData; // The code below saves the result of the API call to this variable, which we can use anywhere else in the code
// Note that this variable will be empty for a few seconds while the function below fetches the data from the API.
// The meteorite data is in array of objects. Each array represents a meteorite, and each key in the object is a property of that meteorite.
// The available keys are: name, id, nametype, recclass, mass, fall, year, reclat, reclong, geolocation.

async function fetchMeteoriteData() {
  try {
    const response = await fetch(
      "https://data.nasa.gov/resource/gh4g-9sfh.json"
    );
    if (!response.ok) throw new Error("Connection to API unsuccessful");
    const data = await response.json();
    setTotalStrikes(data);
    setAvgMass(data);
    fillTable(data);
    meteoriteData = data;
    return data; // This function returns a promise
  } catch (error) {
    console.log(error);
  }
}

fetchMeteoriteData();

//code below is for the form submit
const form = document.querySelector("form");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value || null;
  const year = document.getElementById("year").value;
  const recclass = document.getElementById("recclass").value;
  const massRangeInputs = document.querySelectorAll(
    ".form_control_container__time__input"
  );
  const massRangeMin = Number(massRangeInputs[0].value);
  const massRangeMax = Number(massRangeInputs[1].value);

  const filterData = () =>
    meteoriteData.filter((meteorite) => {
      const meteoriteDate = new Date(meteorite.year);
      return (name ? meteorite.name.toLowerCase().includes(name.toLowerCase()) : true) &&
        (recclass
          ? meteorite.recclass.toUpperCase() == recclass.toUpperCase()
          : true) &&
        (Number(meteorite.mass) >= massRangeMin || (massRangeMin == 0 && !meteorite.mass)) &&
        (Number(meteorite.mass) <= massRangeMax || (massRangeMin == 0 && !meteorite.mass)) &&
        (year ? meteoriteDate.getFullYear() === Number(year) : true)
    });
  const filteredData = filterData();
  setTotalStrikes(filteredData);
  setAvgMass(filteredData);
  cleanTable();
  fillTable(filteredData);
});

const resetBtn = document.querySelector(".search.clear-button");
resetBtn.addEventListener("click", resetContent);

function resetContent() {
  setTotalStrikes(meteoriteData);
  setAvgMass(meteoriteData);
  cleanTable();
  fillTable(meteoriteData);
}

// Summary metric functions

function setTotalStrikes(meteorites) {
  const totalStrikesElement = document.getElementById("total-strikes");
  totalStrikesElement.textContent = meteorites.length.toLocaleString("en-US");
}

function setAvgMass(meteorites) {
  const avgMassElement = document.getElementById("avg-mass");
  const meteorsWithMass = meteorites.filter(e => e.mass);
  if (!meteorsWithMass.length) return avgMassElement.textContent = 0;
  const avgMass = meteorsWithMass.reduce((sum, e) => sum += +e.mass, 0)  / meteorsWithMass.length;
  avgMassElement.textContent = (Math.round(avgMass * 100) / 100).toLocaleString("en-US");
}

// Table functions

const tableFields = [
  "id",
  "name",
  "year",
  "recclass",
  "mass",
  "fall",
  "latitude",
  "longitude",
];

function cleanTable() {
  const cells = document.querySelectorAll(".odd, .even");
  cells.forEach((cell) => cell.remove());
}

function fillTable(meteors) {
  meteors.forEach((meteor, i) => {
    tableFields.forEach((field) => {
      let content =
        field[0] === "l" && meteor.geolocation
          ? Math.round(+meteor.geolocation[field] * 1000) / 1000
          : meteor[field];
      if (field === "year" && content) content = content.slice(0, 4);
      if (field === "mass" && content)
        content = (Math.round(content * 100) / 100).toLocaleString();
      addFieldToTable(content, i);
    });
  });
}

function addFieldToTable(content, i) {
  const cell = document.createElement("span");
  cell.textContent = content;
  if (i % 2 !== 0) cell.classList.add("odd");
  else cell.classList.add("even");
  const table = document.querySelector("div.table");
  table.appendChild(cell);
}

// The code below is for the Mass Range slider

function controlFromInput(fromSlider, fromInput, toInput, controlSlider) {
  const [from, to] = getParsed(fromInput, toInput);
  fillSlider(fromInput, toInput, "#C6C6C6", "#25daa5", controlSlider);
  if (from > to) {
    fromSlider.value = to;
    fromInput.value = to;
  } else {
    fromSlider.value = from;
  }
}

function controlToInput(toSlider, fromInput, toInput, controlSlider) {
  const [from, to] = getParsed(fromInput, toInput);
  fillSlider(fromInput, toInput, "#C6C6C6", "#25daa5", controlSlider);
  setToggleAccessible(toInput);
  if (from <= to) {
    toSlider.value = to;
    toInput.value = to;
  } else {
    toInput.value = from;
  }
}

function controlFromSlider(fromSlider, toSlider, fromInput) {
  const [from, to] = getParsed(fromSlider, toSlider);
  fillSlider(fromSlider, toSlider, "#C6C6C6", "#25daa5", toSlider);
  if (from > to) {
    fromSlider.value = to;
    fromInput.value = to;
  } else {
    fromInput.value = from;
  }
}

function controlToSlider(fromSlider, toSlider, toInput) {
  const [from, to] = getParsed(fromSlider, toSlider);
  fillSlider(fromSlider, toSlider, "#C6C6C6", "#25daa5", toSlider);
  setToggleAccessible(toSlider);
  if (from <= to) {
    toSlider.value = to;
    toInput.value = to;
  } else {
    toInput.value = from;
    toSlider.value = from;
  }
}

function getParsed(currentFrom, currentTo) {
  const from = parseInt(currentFrom.value, 10);
  const to = parseInt(currentTo.value, 10);
  return [from, to];
}

function fillSlider(from, to, sliderColor, rangeColor, controlSlider) {
  const rangeDistance = to.max - to.min;
  const fromPosition = from.value - to.min;
  const toPosition = to.value - to.min;
  controlSlider.style.background = `linear-gradient(
        to right,
        ${sliderColor} 0%,
        ${sliderColor} ${(fromPosition / rangeDistance) * 100}%,
        ${rangeColor} ${(fromPosition / rangeDistance) * 100}%,
        ${rangeColor} ${(toPosition / rangeDistance) * 100}%, 
        ${sliderColor} ${(toPosition / rangeDistance) * 100}%, 
        ${sliderColor} 100%)`;
}

function setToggleAccessible(currentTarget) {
  const toSlider = document.querySelector("#toSlider");
  if (Number(currentTarget.value) <= 0) {
    toSlider.style.zIndex = 2;
  } else {
    toSlider.style.zIndex = 0;
  }
}

const fromSlider = document.querySelector("#fromSlider");
const toSlider = document.querySelector("#toSlider");
const fromInput = document.querySelector("#fromInput");
const toInput = document.querySelector("#toInput");
fillSlider(fromSlider, toSlider, "#C6C6C6", "#25daa5", toSlider);
setToggleAccessible(toSlider);

fromSlider.oninput = () => controlFromSlider(fromSlider, toSlider, fromInput);
toSlider.oninput = () => controlToSlider(fromSlider, toSlider, toInput);
fromInput.oninput = () =>
  controlFromInput(fromSlider, fromInput, toInput, toSlider);
toInput.oninput = () => controlToInput(toSlider, fromInput, toInput, toSlider);
