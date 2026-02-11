let map;
let markerGroup;
let currentFlightData = null;
let pendingRegistration = null;
let selectedMarker = null;

const PLANE_SVG_PATH = `M511.06,286.261c-0.387-10.849-7.42-20.615-18.226-25.356l-193.947-74.094
  C298.658,78.15,285.367,3.228,256.001,3.228c-29.366,0-42.657,74.922-42.885,183.583L19.167,260.904
  C8.345,265.646,1.33,275.412,0.941,286.261L0.008,311.97c-0.142,3.886,1.657,7.623,4.917,10.188
  c3.261,2.564,7.597,3.684,11.845,3.049c0,0,151.678-22.359,198.037-29.559c1.85,82.016,4.019,127.626,4.019,127.626l-51.312,24.166
  c-6.046,2.38-10.012,8.206-10.012,14.701v9.465c0,4.346,1.781,8.505,4.954,11.493c3.155,2.987,7.403,4.539,11.74,4.292l64.83-3.667
  c2.08,14.436,8.884,25.048,16.975,25.048c8.091,0,14.877-10.612,16.975-25.048l64.832,3.667c4.336,0.246,8.584-1.305,11.738-4.292
  c3.174-2.988,4.954-7.148,4.954-11.493v-9.465c0-6.495-3.966-12.321-10.012-14.701l-51.329-24.166c0,0,2.186-45.61,4.037-127.626
  c46.358,7.2,198.036,29.559,198.036,29.559c4.248,0.635,8.602-0.485,11.845-3.049c3.261-2.565,5.041-6.302,4.918-10.188
  L511.06,286.261z`;

function createPlaneIcon(color) {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="32" height="32">
      <path fill="${color}" d="${PLANE_SVG_PATH}"/>
    </svg>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

const planeIcon = createPlaneIcon("#f9d01a");
const planeIconSelected = createPlaneIcon("#E53935");

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

// Check if user is logged in on page load/reload
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
    document.querySelector("#login-status").innerText = "";
    document.querySelector("#login-id").value = "";
    document.querySelector("#login-pass").value = "";
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
    map.setView([27.9759, -82.5033], 12); // tampa bay buccaneers facilities because i can
    // map.setView([-33.9318, 151.18133], 12); // sydney airport for development at night
    refreshFlights();
    // setInterval(refreshFlights, 60000); TURN BACK ON - turned off to protect API limits
  });

  map.locate({
    setView: false,
  });

  const lightLayer = L.tileLayer(
    "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.{ext}",
    {
      minZoom: 0,
      maxZoom: 20,
      attribution:
        '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      ext: "png",
    },
  );
  const darkLayer = L.tileLayer(
    "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.{ext}",
    {
      minZoom: 0,
      maxZoom: 20,
      attribution:
        '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      ext: "png",
    },
  );

  darkLayer.addTo(map);
  markerGroup = L.layerGroup().addTo(map);
}

// Open flight details panel
function openPanel() {
  document.querySelector("#status-area").classList.add("open");
}

// Close flight details panel
function closePanel() {
  document.querySelector("#status-area").classList.remove("open");
  if (selectedMarker) {
    selectedMarker.setIcon(planeIcon);
    selectedMarker = null;
  }
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
            if (selectedMarker) selectedMarker.setIcon(planeIcon);
            marker.setIcon(planeIconSelected);
            selectedMarker = marker;
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
      <button id="log-aircraft-btn" class="primary-btn">
        Log Aircraft
      </button>
      `;

    document
      .querySelector("#log-aircraft-btn")
      .addEventListener("click", () => {
        confirmSpot();
      });
  } catch (error) {
    panelBody.innerHTML = "Could not load flight details.";
  }
}

// Direct user to Create Account page
function goToAccountCreation() {
  document.querySelector("#register-step1-status").innerText = "";
  document.querySelector("#reg-email").value = "";
  document.querySelector("#reg-pass").value = "";
  showView("register-step1-view");
}

// Direct user to Login page
function goToLogin() {
  document.querySelector("#login-status").innerText = "";
  document.querySelector("#login-id").value = "";
  document.querySelector("#login-pass").value = "";
  showView("login-view");
}

// User registration (step 1)
async function userRegisterStep1() {
  document.querySelector("#reg-fname").value = "";
  document.querySelector("#reg-lname").value = "";
  document.querySelector("#reg-user").value = "";

  const email = document.querySelector("#reg-email").value;
  const password = document.querySelector("#reg-pass").value;
  const regStatus = document.querySelector("#register-step1-status");

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  if (!email || !password) {
    regStatus.innerText = "Please enter an email and password.";
    return;
  }
  if (!emailRegex.test(email)) {
    regStatus.innerText = "Invalid email format.";
    return;
  }
  if (password.length < 5) {
    regStatus.innerText = "Password must be at least 5 characters long.";
    document.querySelector("#reg-pass").value = "";
    return;
  }
  if (password.includes(" ")) {
    regStatus.innerText = "Password cannot contain spaces.";
    document.querySelector("#reg-pass").value = "";
    return;
  }
  if (!/^[A-Za-z0-9._\-]+$/.test(password)) {
    regStatus.innerText =
      "Password can only contain letters, numbers, and . _ - characters.";
    document.querySelector("#reg-pass").value = "";
    return;
  }

  // check to see if email is taken
  const check = await fetch(
    `/api/check-email-availability?email=${encodeURIComponent(email)}`,
  );
  const availability = await check.json();
  console.log(availability.emailTaken);

  if (availability.emailTaken) {
    regStatus.innerText = "An account with that email already exists.";
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
  const regStatus = document.querySelector("#register-step2-status");

  if (!fName || !username) {
    regStatus.innerText = "Please enter your forename and a username.";
    return;
  }

  // check to see if username is taken
  const check = await fetch(
    `/api/check-username-availability?username=${encodeURIComponent(username)}`,
  );
  const availability = await check.json();

  if (availability.usernameTaken) {
    regStatus.innerText = "Username already taken.";
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
    document.querySelector("#login-status").innerText = "";
    showView("login-view");
  } else {
    document.querySelector("#register-step2-status").innerText =
      "Registration failed. Please try again.";
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
}

// Log a spotted aircraft
async function confirmSpot() {
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

/* ================================================
                  EVENT LISTENERS
================================================ */

document.querySelector("#panel-close-btn").addEventListener("click", closePanel);
document.querySelector("#login-btn").addEventListener("click", userLogin);
document.querySelector("#register-step1-btn").addEventListener("click", userRegisterStep1);
document.querySelector("#register-step2-btn").addEventListener("click", userRegisterStep2);
document.querySelector("#logout-btn").addEventListener("click", userLogout);
document.querySelector("#create-account-page-btn").addEventListener("click", goToAccountCreation);
document.querySelector("#login-page-btn").addEventListener("click", goToLogin);
document.querySelector("#complete-reg-back-btn").addEventListener("click", () => {
    document.querySelector("#register-step1-status").innerText = "";
    pendingRegistration = null;
    showView("register-step1-view");
  });
