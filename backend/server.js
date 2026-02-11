import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import axios from "axios";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 8080;
const db = new sqlite3.Database(path.join(__dirname, "spotting.db"));
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

db.exec(schema, (error) => {
  error
    ? console.error("Schema error:", error.message)
    : console.log("Database tables initialised.");
});

dotenv.config({ path: path.join(__dirname, ".env") });

app.use(express.json());
app.use(express.static("frontend"));

// Get basic details of nearby aircraft
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

// Get detailed information about aircraft
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

// Log aircraft spot in database
app.post("/api/log-spot", async (req, res) => {
  const {
    user_id,
    hex,
    reg,
    airline,
    type,
    manufacturer,
    age,
    dep,
    arr,
    lat,
    lon,
    alt,
    notes,
  } = req.body;

  const aircraftSql = `
    INSERT OR IGNORE INTO aircraft
      (air_icao24_hex, air_reg, air_airline, air_icao_type, air_manufacturer, air_age)
      VALUES (?, ?, ?, ?, ?, ?)`;

  const logSql = `
    INSERT INTO logs
      (user_id, air_icao24_hex, log_dep_port, log_arr_port, log_latitude, log_longitude, log_altitude, log_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  try {
    db.serialize(() => {
      db.run(aircraftSql, [hex, reg, airline, type, manufacturer, age]);

      db.run(
        logSql,
        [user_id, hex, dep, arr, lat, lon, alt, notes],
        function (error) {
          if (error) return res.status(500).json({ error: error.message });
          res.json({
            message: "Aircraft spotted and logged.",
            logId: this.lastID,
          });
        },
      );
    });
  } catch (error) {
    res.status(500).json({ error: "Database transaction failed" });
  }
});

// Register user into database & hash password
app.post("/api/register", async (req, res) => {
  const { email, password, fName, lName, username } = req.body;
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);

  const sql = `
    INSERT INTO users
      (user_email, user_pass_hash, user_fname, user_lname, user_username)
      VALUES (?, ?, ?, ?, ?)`;

  db.run(sql, [email, hash, fName, lName, username], (error) => {
    if (error)
      return res.status(400).json({ error: "Error with registration." });
    res.json({ message: "User registered successfully." });
  });
});

// User login
app.post("/api/login", async (req, res) => {
  const { identifier, password } = req.body;
  const sql = `SELECT * FROM users WHERE user_username = ? OR user_email = ?`;

  db.get(sql, [identifier, identifier], async (error, user) => {
    if (error) return res.status(500).json({ error: "Database error" });
    if (!user) return res.status(401).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.user_pass_hash);

    if (match) {
      res.json({
        message: "Login successful",
        user: {
          id: user.user_id,
          username: user.user_username,
          fname: user.user_fname,
        },
      });
    } else {
      console.error("Login failed");
      res.status(401).json({ error: "Invalid password" });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
