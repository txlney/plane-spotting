let map;
let markerGroup;
let currentFlightData = null;
const planeIcon = L.icon({
  iconUrl: "img/airplane-svgrepo-com.svg",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, 0],
});

document.querySelector("#login-btn").addEventListener("click", userLogin);
document.querySelector("#register-btn").addEventListener("click", userRegister);
document.querySelector("#logout-btn").addEventListener("click", userLogout);

function showView(viewId) {
  document.querySelectorAll("section").forEach((s) => {
    s.classList.add("hidden");
  });

  const target = document.querySelector(`#${viewId}`);
  if (target) {
    target.classList.remove("hidden");

    if (viewId === "map-view" && map) {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }
}
window.showView = showView;

window.addEventListener("DOMContentLoaded", () => {
  const loggedIn = sessionStorage.getItem("userId");

  if (loggedIn) {
    console.log(sessionStorage.getItem("username"));
    initMap();
    document.querySelector("#main-nav").classList.remove("hidden");
    document.querySelector("#logged-in-message").classList.remove("hidden");
    showView("map-view");
  } else {
    showView("auth-view");
  }
});

// Initiate live aircraft map
function initMap() {
  if (map) return;

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
}

// Update map every 60 seconds (disabled temporarily)
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

// Get detailed flight info
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

// User registration
async function userRegister() {
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
  document.querySelector("#auth-status").innerText =
    result.message || result.error;
}

// User login
async function userLogin() {
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

    initMap();

    document.querySelector("#logged-in-message").classList.remove("hidden");
    document.querySelector("#main-nav").classList.remove("hidden");
    document.querySelector("#logged-in-message").innerText =
      `Logged in as: ${result.user.fname}`;

    showView("map-view");
  } else {
    document.querySelector("#logged-in-message").innerText = result.error;
  }
}

// User logout
function userLogout() {
  sessionStorage.clear();
  document.querySelector("#main-nav").classList.add("hidden");
  document.querySelector("#logged-in-message").classList.add("hidden");
  window.location.reload();
  showView("auth-view");
}

// Log a spotted aircraft
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

window.confirmSpot = confirmSpot;
window.getRichDetails = getRichDetails;
