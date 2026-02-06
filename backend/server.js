import express from "express";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 8080;

dotenv.config({ path: path.join(__dirname, ".env") });

console.log("Username:", process.env.OPENSKY_USERNAME);
// console.log('Password:', process.env.OPENSKY_PASSWORD);

app.use(express.static("frontend"));

app.get("/api/flights", async (req, res) => {
  try {
    const { lamin, lomin, lamax, lomax } = req.query;
    const openskyUrl = "https://opensky-network.org/api/states/all";
    const params = { lamin, lomin, lamax, lomax };

    const auth = {
      username: process.env.OPENSKY_USERNAME,
      password: process.env.OPENSKY_PASSWORD,
    };

    const response = await axios.get(openskyUrl, { params }); // removed authentication for now, would always throw 401 error

    const flightData = response.data.states
      ? response.data.states.slice(0, 10)
      : [];

    res.json(flightData);
  } catch (error) {
    console.error("API Error:", error.response?.status, error.response?.data);
    res.status(500).json({ error: "Failed to fetch flight data" });
  }
});

app.get("/api/plane-details/:hex", async (req, res) => {
  try {
    const hex = req.params.hex;
    const airlabsUrl = "https://airlabs.co/api/v9/flights";

    const response = await axios.get(airlabsUrl, {
      params: {
        api_key: process.env.AIRLABS_API_KEY,
        hex: hex,
      },
    });

    const flightInfo =
      response.data.response && response.data.response.length > 0
        ? response.data.response[0]
        : null;

    if (flightInfo) {
      res.json(flightInfo);
    } else {
      res
        .status(404)
        .json({ message: "No active flight found for this aircraft hex." });
    }
  } catch (error) {
    console.error("Airlabs Error:", error.message);
    res.status(500).json({ error: "Failed to fetch rich aircraft data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
