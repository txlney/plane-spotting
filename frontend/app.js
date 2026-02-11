let map;
let markerGroup;
let currentFlightData = null;
let pendingRegistration = null;
const planeIcon = L.icon({
  iconUrl: "img/airplane-svgrepo-com.svg",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, 0],
});

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

document
  .querySelector("#panel-close-btn")
  .addEventListener("click", closePanel);

document.querySelector("#login-btn").addEventListener("click", userLogin);
document
  .querySelector("#register-step1-btn")
  .addEventListener("click", userRegisterStep1);
document
  .querySelector("#register-step2-btn")
  .addEventListener("click", userRegisterStep2);
document.querySelector("#logout-btn").addEventListener("click", userLogout);
document
  .querySelector("#create-account-page-btn")
  .addEventListener("click", () => {
    document.querySelector("#register-step1-status").innerText = "";
    showView("register-step1-view");
  });
document.querySelector("#login-page-btn").addEventListener("click", () => {
  document.querySelector("#login-status").innerText = "";
  showView("login-view");
});
document
  .querySelector("#complete-reg-back-btn")
  .addEventListener("click", () => {
    document.querySelector("#register-step1-status").innerText = "";
    pendingRegistration = null;
    showView("register-step1-view");
  });

// Check if user is logged in
window.addEventListener("DOMContentLoaded", () => {
  const loggedIn = sessionStorage.getItem("userId");

  if (loggedIn) {
    const username = sessionStorage.getItem("username");
    console.log(`Logged in as: ${username}`);
    initMap();
    document.querySelector("#main-nav").classList.remove("hidden");
    document.querySelector("#logged-in-message").classList.remove("hidden");
    document.querySelector("#logged-in-message").innerText =
      `Logged in as:  ${username}`;
    showView("map-view");
  } else {
    showView("login-view");
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
    map.setView(e.latlng, 12);
    refreshFlights();
    // setInterval(refreshFlights, 60000); TURN BACK ON - turned off to protect API limits
  });

  map.on("locationerror", (e) => {
    console.warn("Location access denied or failed. Using default location.");
    // map.setView([27.9759, -82.5033], 12); // tampa bay buccaneers facilities because i can
    map.setView([-33.9318, 151.18133], 12); // sydney airport for development at night
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

// Open flight details panel
function openPanel() {
  document.querySelector("#status-area").classList.add("open");
}

// Close flight details panel
function closePanel() {
  document.querySelector("#status-area").classList.remove("open");
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
  const panelBody = document.querySelector("#panel-body");
  panelBody.innerHTML = "Fetching airline and model data...";
  openPanel();

  try {
    const response = await fetch(`/api/plane-details/${hex}`);
    if (!response.ok) throw new Error("Aircraft not found");

    const data = await response.json();

    currentFlightData = {
      hex: hex,
      reg: data.reg_number,
      airline: data.airline_icao,
      type: data.aircraft_icao,
      manufacturer: data.manufacturer,
      age: data.age,
      dep: data.dep_iata,
      arr: data.arr_iata,
      lat: lat,
      lon: lon,
      alt: alt,
    };

    panelBody.innerHTML = `
      <p><b>Callsign:</b> ${callsign || "Unknown"}</p>
      <p><b>Airline:</b> ${data.airline_icao || "Unknown"}</p>
      <p><b>Model:</b> ${data.aircraft_icao || "N/A"}</p>
      <p><b>Registration:</b> ${data.reg_number || "N/A"}</p>
      <p><b>From:</b> ${data.dep_iata || "N/A"}</p>
      <p><b>To:</b> ${data.arr_iata || "N/A"}</p>
      <button onclick="confirmSpot('${hex}', '${data.reg_number}', '${data.airline_icao}')">
        Log Aircraft
      </button>
      `;
  } catch (error) {
    panelBody.innerHTML = "Could not load flight details.";
  }
}

// User registration (step 1)
async function userRegisterStep1() {
  const email = document.querySelector("#reg-email").value;
  const password = document.querySelector("#reg-pass").value;

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  if (!email || !password) {
    document.querySelector("#register-step1-status").innerText =
      "Please enter an email and password.";
    return;
  }
  if (!emailRegex.test(email)) {
    document.querySelector("#register-step1-status").innerText =
      "Invalid email format.";
    return;
  }

  pendingRegistration = { email, password };

  document.querySelector("#register-step2-status").innerText = "";
  showView("register-step2-view");
}

// User registration (step 2)
async function userRegisterStep2() {
  const fName = document.querySelector("#reg-fname").value;
  const lName = document.querySelector("#reg-lname").value;
  const username = document.querySelector("#reg-user").value;

  if (!fName || !username) {
    document.querySelector("#register-step2-status").innerText =
      "Please enter your forename and a username.";
    return;
  }

  const finalData = {
    ...pendingRegistration,
    fName,
    lName,
    username,
  };

  const response = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(finalData),
  });

  const result = await response.json();
  if (response.ok) {
    alert("Registration complete!\nPlease log in.");
    pendingRegistration = null;
    showView("login-view");
  } else {
    document.querySelector("#register-step2-status").innerText =
      "Registration failed.";
  }
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
    document.querySelector("#login-status").innerText = result.error;
  }
}

// User logout
function userLogout() {
  sessionStorage.clear();
  document.querySelector("#main-nav").classList.add("hidden");
  document.querySelector("#logged-in-message").classList.add("hidden");
  window.location.reload();
  showView("login-view");
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
