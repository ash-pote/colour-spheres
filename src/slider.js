const slider = document.getElementById("distance");
const output = document.getElementById("output");

// Set initial value
output.textContent = slider.value;

slider.addEventListener("input", () => {
  output.textContent = slider.value;
});
