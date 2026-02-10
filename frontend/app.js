let map;
let markerGroup;
let currentFlightData = null;
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
    // setInterval(refreshFlights, 60000); TURN BACK ON - turned off to protect API limits
  });

  map.on("locationerror", (e) => {
    console.warn("Location access denied or failed. Using default location.");
    map.setView([27.9759, -82.5033], 11); // tampa bay buccaneers facilities because i can
    refreshFlights();
    // setInterval(refreshFlights, 60000); TURN BACK ON - turned off to protect API limits
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
      const alt = f[7];
      const callsign = f[1] ? f[1].trim() : "Unknown";

      if (lat !== null && lon !== null) {
        const heading = f[10] || 0;
        const marker = L.marker([lat, lon], {
          icon: planeIcon,
          rotationAngle: heading,
        })
          .on("click", () => {
            getRichDetails(hex, lat, lon, alt, callsign);
          })
          .addTo(markerGroup);
      }
    });

    console.log("Refreshed flights successfully.");
  } catch (error) {
    console.error("Loop error:", error);
  }
}

async function getRichDetails(hex, lat, lon, alt, callsign) {
  const statusArea = document.querySelector("#status-area");
  statusArea.innerHTML = "Fetching airline and model data...";

  try {
    const response = await fetch(`/api/plane-details/${hex}`);
    if (!response.ok) throw new Error("Aircraft not found");

    const data = await response.json();

    currentFlightData = {
      hex: hex,
      reg: data.reg_number,
      airline: data.airline_name,
      type: data.aircraft_icao,
      manufacturer: data.manufacturer,
      age: data.age,
      dep: data.dep_iata,
      arr: data.arr_iata,
      lat: lat,
      lon: lon,
      alt: alt,
    };

    statusArea.innerHTML = `
      <h3>Spotting Details:</h3>
      <p><b>Callsign:</b> ${callsign || "Unknown"}</p>
      <p><b>Airline:</b> ${data.airline_icao || "Unknown"}</p>
      <p><b>Model:</b> ${data.aircraft_icao || "N/A"}</p>
      <p><b>Registration:</b> ${data.reg_number || "N/A"}</p>
      <p><b>From:</b> ${data.dep_iata || "N/A"} <b>To:</b> ${data.arr_iata || "N/A"}</p>
      <button onclick="confirmSpot('${hex}', '${data.reg_number}', '${data.airline_icao}')">
        Log Aircraft
      </button>
      `;
  } catch (error) {
    statusArea.innerHTML = "Could not load flight details.";
  }
}

// TEST REGISTRATION
document
  .querySelector("#register-test-btn")
  .addEventListener("click", async () => {
    const userData = {
      fName: document.querySelector("#reg-fname").value,
      lName: document.querySelector("#reg-lname").value,
      username: document.querySelector("#reg-user").value,
      email: document.querySelector("#reg-email").value,
      password: document.querySelector("#reg-pass").value,
    };

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const result = await response.json();
    document.querySelector("#reg-status").innerText =
      result.message || result.error;
  });

// TEST SPOT LOGGING
async function confirmSpot(hex, reg, airline) {
  const loggedInUserId = sessionStorage.getItem("userId");

  if (!loggedInUserId) {
    alert("Please login to log a spot.");
    return;
  }
  if (!currentFlightData) return;

  const spotData = {
    user_id: loggedInUserId,
    ...currentFlightData,
    notes: "Spotted via live map",
  };

  const response = await fetch("/api/log-spot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(spotData),
  });
  const result = await response.json();
  alert(result.message);
}

// TEST LOGIN
document.querySelector("#login-btn").addEventListener("click", async () => {
  const identifier = document.querySelector("#login-id").value;
  const password = document.querySelector("#login-pass").value;

  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  const result = await response.json();

  if (response.ok) {
    sessionStorage.setItem("userId", result.user.id);
    sessionStorage.setItem("username", result.user.username);

    document.querySelector("#logged-in-message").innerText =
      `Logged in as: ${result.user.fname}`;
  } else {
    document.querySelector("#logged-in-message").innerText = result.error;
  }
});

window.confirmSpot = confirmSpot;
window.getRichDetails = getRichDetails;
