document.querySelector('#fetch-btn').addEventListener('click', async () => {
    const statusDiv = document.querySelector('#status-area');
    statusDiv.innerHTML = "<p>Fetching live aircraft...<p>";

    try {
        const response = await fetch('/api/flights');
        const flights = await response.json();

        if (flights.length > 0) {
            statusDiv.innerHTML = '<h3>Live Planes:<h3><ul>' +
                flights.map(f => `<li>
                    ICAO24: <b>${f[0]}</b> | 
                    Callsign: ${f[1] || 'N/A'} | 
                    Altitude: ${f[7]}m
                    </li>`).join('') + '</ul>';
        } else {
            statusDiv.innerHTML = '<p>No aircraft found in this area currently.';
        }
    } catch (error) {
        statusDiv.innerHTML = '<p>Error loading flights.<p>';
        console.error(error);
    }
});