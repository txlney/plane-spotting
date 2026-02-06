let map;
let markerGroup;
const planeIcon = L.icon({
  iconUrl: "img/airplane-svgrepo-com.svg",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, 0],
});

window.addEventListener("DOMContentLoaded", () => {
  // disabled map controls to mitigate issue of limited API calls
  map = L.map("map", {
    dragging: false,
    tap: false,
    keyboard: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    zoomControl: false,
    touchZoom: false,
  });

  map.on("locationfound", (e) => {
    console.log("User location found.");
    map.setView(e.latlng, 11);
    refreshFlights();
    setInterval(refreshFlights, 60000);
  });

  map.on("locationerror", (e) => {
    console.warn("Location access denied or failed. Using default location.");
    map.setView([27.9759, -82.5033], 11); // tampa bay buccaneers facilities because i can
    refreshFlights();
    setInterval(refreshFlights, 60000);
  });

  map.locate({
    setView: false,
  });

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  markerGroup = L.layerGroup().addTo(map);
});

async function refreshFlights() {
  try {
    const bounds = map.getBounds();
    const lamin = bounds.getSouth();
    const lomin = bounds.getWest();
    const lamax = bounds.getNorth();
    const lomax = bounds.getEast();

    const response = await fetch(
      `/api/flights?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`,
    );
    const flights = await response.json();

    markerGroup.clearLayers();

    flights.forEach((f) => {
      console.log(`Attempting to place marker for ${f[1]} at ${f[6]}, ${f[5]}`);
      const hex = f[0];
      const lat = f[6];
      const lon = f[5];
      const callsign = f[1] ? f[1].trim() : "Unknown";

      if (lat !== null && lon !== null) {
        const heading = f[10] || 0;
        const marker = L.marker([lat, lon], {
          icon: planeIcon,
          rotationAngle: heading,
        })
          .on("click", () => {
            getRichDetails(hex);
          })
          .addTo(markerGroup);
      }
    });

    console.log("Refreshed flights successfully.");
  } catch (error) {
    console.error("Loop error:", error);
  }
}

async function getRichDetails(hex) {
  const statusArea = document.querySelector("#status-area");

  if (!hex) {
    statusArea.innerHTML = "Please enter an ICAO code...";
    return;
  }

  statusArea.innerHTML = "Fetching airline and model data...";

  try {
    const response = await fetch(`/api/plane-details/${hex}`);

    if (!response.ok) {
      throw new Error("Aircraft not found");
    }

    const data = await response.json();

    statusArea.innerHTML = `
      <h3>Spotting Details:</h3>
      <p><b>Airline:</b> ${data.airline_icao || "Unknown"}</p>
      <p><b>Model:</b> ${data.aircraft_icao || "N/A"}</p>
      <p><b>Registration:</b> ${data.reg_number || "N/A"}</p>
      <p><b>From:</b> ${data.dep_iata || "N/A"}<b>To:</b> ${data.arr_iata || "N/A"}</p>
      `;
  } catch (error) {
    statusArea.innerHTML = "Could not load flight details.";
  }
}

window.getRichDetails = getRichDetails;
