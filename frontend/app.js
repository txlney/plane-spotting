let map;
let markerGroup;
let currentFlightData = null;
let pendingRegistration = null;
let selectedMarker = null;
let logbookSort = "desc";
let markerSize = 32;
let markerColour = "#f9d01a";
let selectedMarkerColour = "#e86c33";

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
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${markerSize}" height="${markerSize}">
      <path fill="${color}" d="${PLANE_SVG_PATH}" stroke="#000000" stroke-width="25" style="paint-order: stroke fill;"/>
    </svg>`,
    className: "",
    iconSize: [markerSize, markerSize],
    iconAnchor: [Math.floor(markerSize / 2), Math.floor(markerSize / 2)],
  });
}

const planeIcon = createPlaneIcon(markerColour);
const planeIconSelected = createPlaneIcon(selectedMarkerColour);

const navViewMap = {
  "map-view": "nav-map",
  "logbook-view": "nav-logbook",
  "statistics-view": "nav-stats",
  "settings-view": "nav-settings",
  "profile-view": "nav-profile",
};

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

    if (viewId === "logbook-view") {
      loadLogbook();
    }

    if (viewId === "profile-view") {
      loadProfile();
    }
  }

  document
    .querySelectorAll(".nav-btn")
    .forEach((btn) => btn.classList.remove("active"));
  const activeBtn = document.querySelector(`#${navViewMap[viewId]}`);
  if (activeBtn) activeBtn.classList.add("active");
}

// Check if user is logged in on page load/reload
window.addEventListener("DOMContentLoaded", () => {
  const loggedIn = sessionStorage.getItem("userId");

  if (loggedIn) {
    const username = sessionStorage.getItem("username");
    const fName = sessionStorage.getItem("userFName");
    initMap();
    document.querySelector("#main-nav").classList.remove("hidden");
    document.querySelector("#mobile-profile-btn").classList.remove("hidden");
    document.querySelector("footer").classList.remove("hidden");
    document.querySelector("#logged-in-message").innerText =
      `Logged in as:  ${fName}`;
    showView("map-view");
  } else {
    showView("login-view");
    document.querySelector("#login-status").innerText = "";
    document.querySelector("#login-id").value = "";
    document.querySelector("#login-pass").value = "";
  }
});

/* ================================================
                  AUTHENTICATION
================================================ */

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
  if (!/^[A-Za-z0-9._\-]+$/.test(password)) {
    regStatus.innerText =
      "Password can only contain letters, numbers, and . _ - characters.";
    document.querySelector("#reg-pass").value = "";
    return;
  }

  // check to see if email is taken
  try {
    const check = await fetch(
      `/api/check-email-availability?email=${encodeURIComponent(email)}`,
    );
    const availability = await check.json();

    if (availability.emailTaken) {
      regStatus.innerText = "An account with that email already exists.";
      return;
    }
  } catch (error) {
    regStatus.innerText = "Something went wrong. Please try again.";
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
  try {
    const check = await fetch(
      `/api/check-username-availability?username=${encodeURIComponent(username)}`,
    );
    const availability = await check.json();

    if (availability.usernameTaken) {
      regStatus.innerText = "Username already taken.";
      return;
    }
  } catch (error) {
    regStatus.innerText = "Something went wrong. Please try again.";
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
    console.log(result.message);
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
    sessionStorage.setItem("userFName", result.user.fname);

    initMap();

    document.querySelector("footer").classList.remove("hidden");
    document.querySelector("#main-nav").classList.remove("hidden");
    document.querySelector("#mobile-profile-btn").classList.remove("hidden");
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
  document.querySelector("#mobile-profile-btn").classList.add("hidden");
  document.querySelector("footer").classList.add("hidden");
  window.location.reload();
}

/* ================================================
                      MAP
================================================ */

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
      ext: "png",
    },
  );
  const darkLayer = L.tileLayer(
    "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.{ext}",
    {
      minZoom: 0,
      maxZoom: 20,
      ext: "png",
    },
  );

  darkLayer.addTo(map);
  markerGroup = L.layerGroup().addTo(map);
  map.on("click", closePanel);
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
  const panelHeader = document.querySelector("#panel-header-txt");
  panelBody.innerHTML = "Fetching airline and model data...";
  openPanel();

  try {
    const response = await fetch(`/api/plane-details/${hex}`);
    if (!response.ok) throw new Error("Aircraft not found");

    const data = await response.json();

    currentFlightData = {
      hex: hex,
      reg: data.reg_number,
      callsign: callsign,
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

    const airlineName = data.airline_name || data.airline_icao || "Unknown";
    const depCode = data.dep_iata || "N/A";
    const arrCode = data.arr_iata || "N/A";
    const depCountry = data.dep_country_code || "";
    const arrCountry = data.arr_country_code || "";
    const altFt = alt > 0 ? `${Math.round(alt * 3.281)}ft` : "N/A";
    const speedKts = data.speed ? `${Math.round(data.speed * 0.54)}kts` : "N/A";

    panelHeader.innerText = `Flight ${callsign || "Details"}`;
    panelBody.innerHTML = `
      <div class="route-display">
        <div class="route-airport">
          <span class="route-code">${depCode}</span>
          <span class="route-city">${depCountry}</span>
        </div>
        <span class="route-arrow">&rarr;</span>
        <div class="route-airport">
          <span class="route-code">${arrCode}</span>
          <span class="route-city">${arrCountry}</span>
        </div>
      </div>
      <div class="details-table">
        <div class="details-row">
          <span class="details-label">Airline:</span>
          <span class="details-value">${airlineName}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Model:</span>
          <span class="details-value">${data.aircraft_icao || "N/A"}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Reg Number:</span>
          <span class="details-value">${data.reg_number || "N/A"}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Barometric Altitude:</span>
          <span class="details-value">${altFt}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Ground Speed:</span>
          <span class="details-value">${speedKts}</span>
        </div>
      </div>
      <button id="log-aircraft-btn" class="blue-btn">
        Log Aircraft
      </button>
      `;

    document
      .querySelector("#log-aircraft-btn")
      .addEventListener("click", () => {
        confirmSpot();
      });
  } catch (error) {
    currentFlightData = {
      hex: hex,
      reg: null,
      callsign: callsign,
      airline: null,
      type: null,
      manufacturer: null,
      age: null,
      dep: null,
      arr: null,
      lat: lat,
      lon: lon,
      alt: alt,
    };
    panelHeader.innerText = `Flight ${callsign || "Details"}`;
    const fallbackAltFt = alt > 0 ? `${Math.round(alt * 3.281)}ft` : "N/A";
    panelBody.innerHTML = `
      <div class="route-display">
        <span id="details-error-message">
          Full commercial flight details are unavailable for this aircraft.
        </span>
      </div>
      <div class="details-table">
        <div class="details-row">
          <span class="details-label">ICAO24:</span>
          <span class="details-value">${hex.toUpperCase() || "Unknown"}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Barometric Altitude:</span>
          <span class="details-value">${fallbackAltFt}</span>
        </div>
      </div>
      <button id="log-aircraft-btn" class="blue-btn">
        Log Aircraft
      </button>
      `;

    document
      .querySelector("#log-aircraft-btn")
      .addEventListener("click", () => {
        confirmSpot();
      });
  }
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
    notes: "Spotted via live map", // Need to implement user noted rather than hard coded
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
                    LOGBOOK
================================================ */

function formatLogDate(timestamp) {
  if (!timestamp) return "—";
  const d = new Date(timestamp.replace(" ", "T"));
  return (
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

function renderLogbookGrid(logs) {
  const grid = document.querySelector("#logbook-grid");

  if (!logs.length) {
    grid.innerHTML = `<p class="logbook-empty">No aircraft logged yet. Head to the map and start spotting!</p>`;
    return;
  }

  grid.innerHTML = logs
    .map((log) => {
      const date = formatLogDate(log.log_timestamp);
      const callsign = log.log_callsign || "—";
      const airline = log.airline_name || "—";
      const dep = log.log_dep_iata || "—";
      const arr = log.log_arr_iata || "—";
      const model =
        [log.air_manufacturer, log.air_icao_type].filter(Boolean).join(" ") ||
        "—";
      const reg = log.air_reg || "—";

      return `
      <div class="log-card">
        <div class="log-card-header">
          <span class="log-card-date">${date}</span>
          <span class="log-card-callsign">${callsign}</span>
        </div>
        <p class="log-card-airline">${airline}</p>
        <div class="log-card-route">
          <span class="log-card-iata">${dep}</span>
          <span class="log-card-arrow">&rarr;</span>
          <span class="log-card-iata">${arr}</span>
        </div>
        <div class="log-card-footer">
          <p class="log-card-detail">${model} &middot; ${reg}</p>
          <button class="log-delete-btn" data-log-id="${log.log_id}">Delete</button>
        </div>
      </div>`;
    })
    .join("");

  document.querySelectorAll(".log-delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const logId = e.target.getAttribute("data-log-id");
      deleteLog(logId);
    });
  });
}

async function loadLogbook() {
  const userId = sessionStorage.getItem("userId");
  if (!userId) return;

  const userFName = sessionStorage.getItem("userFName");
  document.querySelector("#user-logbook-msg").innerText =
    `${userFName}'s Logbook`;

  const grid = document.querySelector("#logbook-grid");
  grid.innerHTML = `<p class="logbook-empty">Loading...</p>`;

  try {
    const response = await fetch(
      `/api/logbook?userId=${userId}&sort=${logbookSort}`,
    );
    const data = await response.json();
    renderLogbookGrid(data.logs);
  } catch {
    grid.innerHTML = `<p class="logbook-empty">Failed to load logbook. Please try again.</p>`;
  }
}

async function deleteLog(logId) {
  if (!confirm("Are you sure you want to delete this log?")) return;

  try {
    const response = await fetch(`/api/log/${logId}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete log");

    loadLogbook();
  } catch (error) {
    alert("Failed to delete log. Please try again.");
  }
}

/* ================================================
                    PROFILE
================================================ */

let originalUsername = "";

function showProfileDetails() {
  document.querySelector("#profile-details-section").classList.remove("hidden");
  document.querySelector("#profile-edit-section").classList.add("hidden");
}

function showProfileEdit() {
  document.querySelector("#profile-details-section").classList.add("hidden");
  document.querySelector("#profile-edit-section").classList.remove("hidden");
  document.querySelector("#profile-edit-status").innerText = "";
  document.querySelector("#profile-edit-status").className = "";
}

async function loadProfile() {
  const userId = sessionStorage.getItem("userId");
  if (!userId) return;

  const username = sessionStorage.getItem("username");

  document.querySelector("#profile-header-msg").innerText = username;
  document.querySelector("#profile-pass-status").innerText = "";
  document.querySelector("#profile-pass-status").className = "";
  document.querySelector("#profile-current-pass").value = "";
  document.querySelector("#profile-new-pass").value = "";
  document.querySelector("#profile-confirm-pass").value = "";
  showProfileDetails();

  try {
    const response = await fetch(`/api/user/${userId}`);
    const data = await response.json();
    const user = data.user;

    const fullName =
      [user.user_fname, user.user_lname].filter(Boolean).join(" ") || "—";
    document.querySelector("#profile-name").innerText = fullName;
    document.querySelector("#profile-username").innerText = user.user_username;
    document.querySelector("#profile-email").innerText = user.user_email;
    document.querySelector("#profile-joined").innerText = formatLogDate(
      user.user_joined_at,
    );

    document.querySelector("#profile-edit-fname").value = user.user_fname || "";
    document.querySelector("#profile-edit-lname").value = user.user_lname || "";
    document.querySelector("#profile-edit-username").value =
      user.user_username || "";
    originalUsername = user.user_username;
  } catch {
    document.querySelector("#profile-name").innerText =
      "Failed to load profile.";
  }
}

async function saveProfile() {
  const userId = sessionStorage.getItem("userId");
  if (!userId) return;

  const fname = document.querySelector("#profile-edit-fname").value.trim();
  const lname = document.querySelector("#profile-edit-lname").value.trim();
  const username = document
    .querySelector("#profile-edit-username")
    .value.trim();
  const statusEl = document.querySelector("#profile-edit-status");

  if (!fname || !username) {
    statusEl.className = "profile-status-error";
    statusEl.innerText = "First name and username are required.";
    return;
  }

  // Check username availability if changed
  if (username.toLowerCase() !== originalUsername.toLowerCase()) {
    try {
      const check = await fetch(
        `/api/check-username-availability?username=${encodeURIComponent(username)}`,
      );
      const availability = await check.json();
      if (availability.usernameTaken) {
        statusEl.className = "profile-status-error";
        statusEl.innerText = "Username already taken.";
        return;
      }
    } catch {
      statusEl.className = "profile-status-error";
      statusEl.innerText = "Something went wrong. Please try again.";
      return;
    }
  }

  try {
    const response = await fetch(`/api/user/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fname, lname, username }),
    });
    const result = await response.json();

    if (response.ok) {
      statusEl.className = "profile-status-success";
      statusEl.innerText = result.message;
      sessionStorage.setItem("userFName", fname);
      sessionStorage.setItem("username", username.toLowerCase());
      document.querySelector("#logged-in-message").innerText =
        `Logged in as: ${fname}`;
      loadProfile();
    } else {
      statusEl.className = "profile-status-error";
      statusEl.innerText = result.error;
    }
  } catch {
    statusEl.className = "profile-status-error";
    statusEl.innerText = "Failed to save changes. Please try again.";
  }
}

async function changePassword() {
  const userId = sessionStorage.getItem("userId");
  if (!userId) return;

  const currentPassword = document.querySelector("#profile-current-pass").value;
  const newPassword = document.querySelector("#profile-new-pass").value;
  const confirmPassword = document.querySelector("#profile-confirm-pass").value;
  const statusEl = document.querySelector("#profile-pass-status");

  if (!currentPassword || !newPassword || !confirmPassword) {
    statusEl.className = "profile-status-error";
    statusEl.innerText = "Please fill in all password fields.";
    return;
  }

  if (newPassword.length < 5) {
    statusEl.className = "profile-status-error";
    statusEl.innerText = "New password must be at least 5 characters.";
    return;
  }

  if (newPassword !== confirmPassword) {
    statusEl.className = "profile-status-error";
    statusEl.innerText = "New passwords do not match.";
    return;
  }

  try {
    const response = await fetch(`/api/user/${userId}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const result = await response.json();

    if (response.ok) {
      statusEl.className = "profile-status-success";
      statusEl.innerText = result.message;
      document.querySelector("#profile-current-pass").value = "";
      document.querySelector("#profile-new-pass").value = "";
      document.querySelector("#profile-confirm-pass").value = "";
    } else {
      statusEl.className = "profile-status-error";
      statusEl.innerText = result.error;
    }
  } catch {
    statusEl.className = "profile-status-error";
    statusEl.innerText = "Failed to change password. Please try again.";
  }
}

async function deleteAccount() {
  const userId = sessionStorage.getItem("userId");
  if (!userId) return;

  const confirmed = confirm(
    "Are you sure you want to delete your account? This action cannot be undone.",
  );
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/user/${userId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      alert(
        "Your account has been deleted.\nYou will now be directed to the login page.",
      );
      userLogout();
    } else {
      const result = await response.json();
      alert(result.error || "Failed to delete account.");
    }
  } catch {
    alert("Something went wrong. Please try again.");
  }
}

/* ================================================
                  EVENT LISTENERS
================================================ */

document
  .querySelector("#nav-map")
  .addEventListener("click", () => showView("map-view"));
document
  .querySelector("#nav-logbook")
  .addEventListener("click", () => showView("logbook-view"));
document.querySelector("#sort-toggle-btn").addEventListener("click", () => {
  logbookSort = logbookSort === "desc" ? "asc" : "desc";
  document.querySelector("#sort-toggle-btn").textContent =
    logbookSort === "desc" ? "Newest first" : "Oldest first";
  loadLogbook();
});
document
  .querySelector("#nav-stats")
  .addEventListener("click", () => showView("statistics-view"));
document
  .querySelector("#nav-settings")
  .addEventListener("click", () => showView("settings-view"));
document
  .querySelector("#nav-profile")
  .addEventListener("click", () => showView("profile-view"));
document
  .querySelector("#mobile-profile-btn")
  .addEventListener("click", () => showView("profile-view"));
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
  .querySelector("#profile-save-btn")
  .addEventListener("click", saveProfile);
document
  .querySelector("#profile-edit-btn")
  .addEventListener("click", showProfileEdit);
document
  .querySelector("#profile-edit-cancel-btn")
  .addEventListener("click", showProfileDetails);
document
  .querySelector("#profile-pass-btn")
  .addEventListener("click", changePassword);
document
  .querySelector("#mobile-settings-btn")
  .addEventListener("click", () => showView("settings-view"));
document.querySelector("#delete-btn").addEventListener("click", deleteAccount);
document
  .querySelector("#create-account-page-btn")
  .addEventListener("click", goToAccountCreation);
document.querySelector("#login-page-btn").addEventListener("click", goToLogin);
document
  .querySelector("#complete-reg-back-btn")
  .addEventListener("click", () => {
    document.querySelector("#register-step1-status").innerText = "";
    pendingRegistration = null;
    showView("register-step1-view");
  });

// Key handlers for Login and Registration

["#login-id", "#login-pass"].forEach((id) => {
  document.querySelector(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") userLogin();
  });
});

["#reg-email", "#reg-pass"].forEach((id) => {
  document.querySelector(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") userRegisterStep1();
  });
});

["#reg-fname", "#reg-lname", "#reg-user"].forEach((id) => {
  document.querySelector(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") userRegisterStep2();
  });
});
