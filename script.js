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
    loadContent(data);
    meteoriteData = data;
    return data; // This function returns a promise
  } catch (error) {
    console.log(error);
  }
}

fetchMeteoriteData();

//header search button
const searchTop = document.querySelector(".topSearch");
const main = document.querySelector("main");
searchTop.addEventListener("click", top);
function top() {
  main.scrollTop = 0;
  main.documentElement.scrollTop = 0; //for operaGX
}

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
      return (
        (name
          ? meteorite.name.toLowerCase().includes(name.toLowerCase())
          : true) &&
        (recclass
          ? meteorite.recclass.toUpperCase() == recclass.toUpperCase()
          : true) &&
        (Number(meteorite.mass) >= massRangeMin ||
          (massRangeMin == 0 && !meteorite.mass)) &&
        (Number(meteorite.mass) <= massRangeMax ||
          (massRangeMin == 0 && !meteorite.mass)) &&
        (year ? meteoriteDate.getFullYear() === Number(year) : true)
      );
    });
  const filteredData = filterData();
  loadContent(filteredData);
});

const resetBtn = document.querySelector(".search.clear-button");
resetBtn.addEventListener("click", resetContent);

function loadContent(data) {
  setTotalStrikes(data);
  setAvgMass(data);
  clearHistograms();
  loadHistogramByYear(data);
  loadHistogramByComposition(data);
  cleanTable();
  fillTable(data);
}

function resetContent() {
  loadContent(meteoriteData);
}

// Summary metric functions

function setTotalStrikes(meteorites) {
  const totalStrikesElement = document.getElementById("total-strikes");
  totalStrikesElement.textContent = meteorites.length.toLocaleString("en-US");
}

function setAvgMass(meteorites) {
  const avgMassElement = document.getElementById("avg-mass");
  const meteorsWithMass = meteorites.filter((e) => e.mass);
  if (!meteorsWithMass.length) return (avgMassElement.textContent = 0);
  const avgMass =
    meteorsWithMass.reduce((sum, e) => (sum += +e.mass), 0) /
    meteorsWithMass.length;
  avgMassElement.textContent = (Math.round(avgMass * 100) / 100).toLocaleString(
    "en-US"
  );
}

// Histograms

function loadHistogramByYear(data) {
  // Get the bins from the data
  const bins = d3.bin().value((d) => (d.year ? +d.year.slice(0, 4) : null))(
    data
  );

  const binsMax = d3.max(bins, (d) => d.length);

  // Define SVG measures
  const margin = { top: 40, right: 20, bottom: 40, left: 40 };
  const width = 960 - margin.left - margin.right;
  const height = 540 - margin.top - margin.bottom;

  // Append SVG element
  const svg = d3
    .select(".histogram-container.by-year")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "width: 100%; height: auto;");

  // X axis scale
  const xScale = d3
    .scaleLinear()
    .domain([bins[0].x0, bins[bins.length - 1].x1])
    .range([margin.left, width - margin.right]);

  // Y axis scale
  const yScale = d3
    .scaleLinear()
    .domain([0, binsMax])
    .range([height - margin.bottom, margin.top]);

  // Append the bar rectangles to the svg element
  svg
    .selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", (d) => (bins.length === 1 ? margin.left : xScale(d.x0) + 1))
    .attr("width", (d) =>
      bins.length === 1
        ? width - margin.left - margin.right
        : xScale(d.x1) - xScale(d.x0) - 1
    )
    .attr("y", (d) => yScale(d.length))
    .attr("height", (d) => yScale(0) - yScale(d.length))
    .style("fill", "#393e46");

  // Append the data labels to the bars
  svg
    .selectAll("text")
    .data(bins)
    .enter()
    .append("text")
    .text((d) => d.length)
    .attr("x", (d) => {
      const adjustment = d.length >= 100 ? 10 : d.length >= 10 ? 5 : 1;
      return xScale(d.x0) + (xScale(d.x1) - xScale(d.x0) - 1) / 2 - adjustment;
    })
    .attr("y", (d) => yScale(d.length) - 10);

  // Add the X axis
  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3
        .axisBottom(xScale)
        .ticks(width / 80, "f")
        .tickSizeOuter(0)
    )
    .call((g) =>
      g
        .append("text")
        .attr("x", width)
        .attr("y", margin.bottom)
        .attr("fill", "currentColor")
        .attr("text-anchor", "end")
        .text("Year")
    );

  // Add the Y axis
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).ticks(height / 40))
    .call((g) =>
      g
        .append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text("Frequency (no. of strikes)")
    );
}

function loadHistogramByComposition(data) {
  // Get the bins from the data
  const dataset = buildRecclassDataset(data);

  const binsMax = d3.max(dataset, (d) => d[1]);

  // Define SVG measures
  const margin = { top: 40, right: 20, bottom: 110, left: 40 };
  const width = 960 - margin.left - margin.right;
  const height = 680 - margin.top - margin.bottom;

  // Append SVG element
  const svg = d3
    .select(".histogram-container.by-composition")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "width: 100%; height: auto;");

  // X axis scale
  const xScale = d3
    .scaleBand()
    .domain([...dataset.map((d) => d[0])])
    .range([margin.left, width - margin.right]);

  // Y axis scale
  const yScale = d3
    .scaleLinear()
    .domain([0, binsMax])
    .range([height - margin.bottom, margin.top]);

  // Append the bar rectangles to the svg element
  const rectWidth = (width - margin.left - margin.right) / dataset.length - 1;
  svg
    .selectAll("rect")
    .data(dataset)
    .enter()
    .append("rect")
    .attr("x", (d, i) => (rectWidth + 1) * i + margin.left)
    .attr("width", (d) => rectWidth)
    .attr("y", (d) => yScale(d[1]))
    .attr("height", (d) => yScale(0) - yScale(d[1]))
    .style("fill", "#393e46");

  // Append the data labels to the bars
  svg
    .selectAll("text")
    .data(dataset)
    .enter()
    .append("text")
    .text((d) => d[1])
    .attr("class", "recclass-label")
    .attr("x", (d, i) => {
      const adjustment = d[1] >= 100 ? 7 : d[1] >= 10 ? 4.5 : 2;
      return (rectWidth + 1) * i + margin.left + rectWidth / 2 - adjustment;
    })
    .attr("y", (d) => yScale(d[1]) - 5);

  // Add the X axis
  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .attr("class", "recclass-axis")
    .call(
      d3
        .axisBottom(xScale)
        .ticks(width / 80)
        .tickSizeOuter(0)
    )
    .attr("fill", "red")
    .call((g) =>
      g
        .append("text")
        .attr("x", width)
        .attr("y", margin.bottom - 5)
        .attr("fill", "currentColor")
        .attr("text-anchor", "end")
        .text("Composition")
    );

  // Add the Y axis
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).ticks(height / 40))
    .call((g) =>
      g
        .append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text("Frequency (no. of strikes)")
    );
}

function buildRecclassDataset(data) {
  const obj = {};
  data.forEach((meteor) => {
    if (!obj[meteor.recclass]) return (obj[meteor.recclass] = 1);
    obj[meteor.recclass] += 1;
  });
  const dataset = [
    ...Object.keys(obj)
      .sort()
      .map((key) => [key, obj[key]]),
  ];
  return dataset;
}

function clearHistograms() {
  const containers = document.querySelectorAll(".histogram-container");
  containers.forEach((container) => {
    const svg = container.querySelector("svg");
    if (!svg) return;
    container.removeChild(svg);
  });
}
//histograms animations
const byComposition = document.querySelector(".by-composition");
const byYear = document.querySelector(".by-year");
const toRight = (entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("slideRight");
    }
  });
};
const toLeft = (entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("slideLeft");
    }
  });
};
const yearObserver = new IntersectionObserver(toRight, {});
const compositionObserver = new IntersectionObserver(toLeft, {});
yearObserver.observe(byYear);
compositionObserver.observe(byComposition);

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
  fillSlider(fromInput, toInput, "#C6C6C6", "#222831", controlSlider);
  if (from > to) {
    fromSlider.value = to;
    fromInput.value = to;
  } else {
    fromSlider.value = from;
  }
}

function controlToInput(toSlider, fromInput, toInput, controlSlider) {
  const [from, to] = getParsed(fromInput, toInput);
  fillSlider(fromInput, toInput, "#C6C6C6", "#222831", controlSlider);
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
  fillSlider(fromSlider, toSlider, "#C6C6C6", "#222831", toSlider);
  if (from > to) {
    fromSlider.value = to;
    fromInput.value = to;
  } else {
    fromInput.value = from;
  }
}

function controlToSlider(fromSlider, toSlider, toInput) {
  const [from, to] = getParsed(fromSlider, toSlider);
  fillSlider(fromSlider, toSlider, "#C6C6C6", "#222831", toSlider);
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
fillSlider(fromSlider, toSlider, "#C6C6C6", "#222831", toSlider);
setToggleAccessible(toSlider);

fromSlider.oninput = () => controlFromSlider(fromSlider, toSlider, fromInput);
toSlider.oninput = () => controlToSlider(fromSlider, toSlider, toInput);
fromInput.oninput = () =>
  controlFromInput(fromSlider, fromInput, toInput, toSlider);
toInput.oninput = () => controlToInput(toSlider, fromInput, toInput, toSlider);
