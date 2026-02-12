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

dotenv.config({ path: path.join(__dirname, ".env") });

function dbGet(sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      (err) ? reject(err) : resolve(row);
    });
  });
}

function seedLookupTables() {
  db.get("SELECT COUNT(*) AS count FROM airports", async (err, row) => {
    if (err) return console.error("Error checking airports table:", err.message);
    if (row.count > 0) {
      console.log(`Airports table already has ${row.count} rows, skipping seed.`);
    } else {
      console.log("Seeding airports table from AirLabs...");
      try {
        const response = await axios.get("https://airlabs.co/api/v9/airports", {
          params: { api_key: process.env.AIRLABS_API_KEY },
        });
        const airports = response.data.response;
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO airports (port_iata, port_icao, port_name, port_country_code)
          VALUES (?, ?, ?, ?)`,
        );
        for (const a of airports) {
          if (a.iata_code) {
            stmt.run(a.iata_code, a.icao_code, a.name, a.country_code);
          }
        }
        stmt.finalize(() => console.log(`Seeded ${airports.length} airports.`));
      } catch (error) {
        console.error("Failed to seed airports:", error.message);
      }
    }
  });

  db.get("SELECT COUNT(*) AS count FROM airlines", async (err, row) => {
    if (err) return console.error("Error checking airlines table:", err.message);
    if (row.count > 0) {
      console.log(`Airlines table already has ${row.count} rows, skipping seed.`);
    } else {
      console.log("Seeding airlines table from AirLabs...");
      try {
        const response = await axios.get("https://airlabs.co/api/v9/airlines", {
          params: { api_key: process.env.AIRLABS_API_KEY },
        });
        const airlines = await response.data.response;
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO airlines (airline_icao, airline_iata, airline_name,  
          airline_country_code) VALUES (?, ?, ?, ?)`,
        );
        for (const a of airlines) {
          if (a.icao_code) {
            stmt.run(a.icao_code, a.iata_code, a.name, a.country_code);
          }
        }
        stmt.finalize(() => console.log(`Seeded ${airlines.length} airlines.`));
      } catch (error) {
        console.error("Failed to seed airlines:", error.message);
      }
    }
  });
}

db.exec(schema, (error) => {
  if (error) {
    console.error("Schema error:", error.message);
  } else {
    console.log("Database tables initialised.");
    seedLookupTables();
  }
});

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

    if (!flightInfo) {
      return res
        .status(404)
        .json({ message: "No active flight found for this aircraft hex." });
    }

    const [airline, depAirport, arrAirport] = await Promise.all([
      flightInfo.airline_icao
        ? dbGet("SELECT airline_name FROM airlines WHERE airline_icao = ?", [flightInfo.airline_icao])
        : Promise.resolve(null),
      flightInfo.dep_iata
        ? dbGet("SELECT port_name, port_country_code FROM airports WHERE port_iata = ?", [flightInfo.dep_iata])
        : Promise.resolve(null),
      flightInfo.arr_iata
        ? dbGet("SELECT port_name, port_country_code FROM airports WHERE port_iata = ?", [flightInfo.arr_iata])
        : Promise.resolve(null),
    ]);

    flightInfo.airline_name = airline?.airline_name || null;
    flightInfo.dep_airport_name = depAirport?.port_name || null;
    flightInfo.dep_country_code = depAirport?.port_country_code || null;
    flightInfo.arr_airport_name = arrAirport?.port_name || null;
    flightInfo.arr_country_code = arrAirport?.port_country_code || null;

    res.json(flightInfo);

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
    callsign,
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
      (air_icao24_hex, air_reg, air_airline_icao, air_icao_type, air_manufacturer, air_age)
      VALUES (?, ?, ?, ?, ?, ?)`;

  const logSql = `
    INSERT INTO logs
      (user_id, air_icao24_hex, log_callsign, log_dep_iata, log_arr_iata, log_latitude, log_longitude, log_altitude, log_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  try {
    db.serialize(() => {
      db.run(aircraftSql, [hex, reg, airline, type, manufacturer, age]);

      db.run(
        logSql,
        [user_id, hex, callsign, dep, arr, lat, lon, alt, notes],
        function (error) {
          if (error) return res.status(500).json({ error: error.message });
          res.json({
            message: "Aircraft spotted and logged.",  // Need to implement user notes rather than hard coded
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

  db.run(
    sql,
    [email.toLowerCase(), hash, fName, lName, username.toLowerCase()],
    (error) => {
      if (error) return res.status(400).json({ error: error.message });
      res.json({ message: "User registered successfully." });
    },
  );
});

// User login
app.post("/api/login", async (req, res) => {
  const { identifier, password } = req.body;
  const sql = `SELECT * FROM users WHERE LOWER(user_username) = ? OR LOWER(user_email) = ?`;

  db.get(
    sql,
    [identifier.toLowerCase(), identifier.toLowerCase()],
    async (error, user) => {
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
        res.status(401).json({ error: "Incorrect login credentials." });
      }
    },
  );
});

// Check email availability
app.get("/api/check-email-availability", (req, res) => {
  const email = req.query.email;
  const sql = `
    SELECT user_email FROM users
    WHERE LOWER(user_email) = LOWER(?)`;

  db.get(sql, [email ?? null], (error, row) => {
    if (error) return res.status(500).json({ error: "Database error" });
    res.json({ emailTaken: !!row });
  });
});

// Check username availability
app.get("/api/check-username-availability", (req, res) => {
  const username = req.query.username;
  const sql = `
    SELECT user_username FROM users
    WHERE LOWER(user_username) = LOWER(?)`;

  db.get(sql, [username ?? null], (error, row) => {
    if (error) return res.status(500).json({ error: "Database error" });
    res.json({ usernameTaken: row ? true : false });
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
