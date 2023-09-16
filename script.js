//imports library to display graphs
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

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
    loadHistogramByYear(data);
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
  clearHistograms();
  loadHistogramByYear(filteredData);
  cleanTable();
  fillTable(filteredData);
});

const resetBtn = document.querySelector(".search.clear-button");
resetBtn.addEventListener("click", resetContent);

function resetContent() {
  setTotalStrikes(meteoriteData);
  setAvgMass(meteoriteData);
  clearHistograms();
  loadHistogramByYear(meteoriteData);
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

// Histograms

function loadHistogramByYear(data) {
  // Get the bins from the data
  const bins = d3.bin()
    .value(d => d.year ? +d.year.slice(0,4) : null)
    (data);

  const binsMax = d3.max(bins, (d) => d.length);

  // console.log(bins[0].x0);
  // console.log(bins.length);
  // console.log(bins[bins.length - 1].x1);
  // console.log(binsMax);

  // Define SVG measures
  const margin = {top: 20, right: 20, bottom: 30, left: 40};
  const width = 960 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  // Append SVG element
  const svg = d3.select(".histogram-container.by-year")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  // X axis scale
  const xScale = d3.scaleLinear()
    .domain([bins[0].x0, bins[bins.length - 1].x1])     // can use this instead of 1000 to have the max of data: d3.max(data, function(d) { return +d.price })
    .range([margin.left, width - margin.right]);

  // Y axis scale
  const yScale = d3.scaleLinear()
    .domain([0, binsMax])
    .range([height - margin.bottom, margin.top]);

  // Append the bar rectangles to the svg element
  svg.selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", (d) => xScale(d.x0) + 1)
    .attr("width", (d) => xScale(d.x1) - xScale(d.x0) - 1)
    .attr("y", (d) => yScale(d.length))
    .attr("height", (d) => yScale(0) - yScale(d.length))
      // .attr("x", 1)
      // //.attr("class", d => console.log(d.x1))
      // .attr("transform", function(d) { return "translate(" + xScale(d.x0) + "," + yScale(d.length) + ")"; })
      // .attr("width", function(d) { return xScale(d.x1) - xScale(d.x0) -1 ; })
      // .attr("height", function(d) { return height - yScale(d.length); })
    .style("fill", "steelblue");

  // Append the data labels to the bars
  svg.selectAll("text")
    .data(bins)
    .enter()
    .append("text")
    .text(d => d.length)
    .attr("x", d => {
      const adjustment = d.length >= 100 ? 10 :
        d.length >= 10 ? 5 : 1;
      return xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)- 1) / 2 - adjustment
    })
    .attr("y", d => {
      const adjustment = d.length == binsMax ?
      20 : -10;
    return yScale(d.length) + adjustment
    })
    .style("fill", d => d.length == binsMax ? "white" : "black");

  // Add the X axis
  svg.append("g")
  .attr("transform", `translate(0,${height - margin.bottom})`)
  .call(d3.axisBottom(xScale).ticks(width / 80).tickSizeOuter(0))
  .call((g) => g.append("text")
      .attr("x", width)
      .attr("y", margin.bottom)
      .attr("fill", "currentColor")
      .attr("text-anchor", "end")
      .text("Year"));

  // Add the Y axis
  svg.append("g")
  .attr("transform", `translate(${margin.left},0)`)
  .call(d3.axisLeft(yScale).ticks(height / 40))
  //.call((g) => g.select(".domain").remove())
  .call((g) => g.append("text")
      .attr("x", - margin.left)
      .attr("y", 10)
      .attr("fill", "currentColor")
      .attr("text-anchor", "start")
      .text("Frequency (no. of meteors)"));
}

function clearHistograms() {
  const containers = document.querySelectorAll(".histogram-container");
  containers.forEach(container => {
    if (!container.firstElementChild) return;
    //console.log(container.firstElementChild);
    container.removeChild(container.firstElementChild);
  })
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
