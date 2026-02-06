document.querySelector("#fetch-btn").addEventListener("click", async () => {
  const statusDiv = document.querySelector("#status-area");
  statusDiv.innerHTML = "<p>Fetching live aircraft...<p>";

  try {
    const response = await fetch("/api/flights");
    const flights = await response.json();

    if (flights.length > 0) {
      statusDiv.innerHTML =
        "<h3>Live Planes:<h3><ul>" +
        flights
          .map(
            (f) => `<li id="aircraft-text">
                    ICAO24: <b>${f[0]}</b> | 
                    Callsign: ${f[1] || "N/A"} | 
                    Altitude: ${f[7]}m
                    </li>`,
          )
          .join("") +
        "</ul>";
    } else {
      statusDiv.innerHTML = "<p>No aircraft found in this area currently.";
    }
  } catch (error) {
    statusDiv.innerHTML = "<p>Error loading flights.<p>";
    console.error(error);
  }
});

document.querySelector("#icao-test-btn").addEventListener("click", async () => {
  const statusArea = document.querySelector("#status-area");
  const hex = document.querySelector("#icao-test").value.trim();
  console.log("Searching for Hex:", hex);

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
      <p><b>From:</b> ${data.dep_iata} <b>To:</b> ${data.arr_iata}</p>
      `;
  } catch (error) {
    statusArea.innerHTML = "Could not load flight details.";
  }
});
