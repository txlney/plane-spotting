import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import axios from "axios";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";

function sanitiseInput(input) {
  if (typeof input !== "string") return input;
  return input.replace(/[<;>]/, "");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 8080;
const db = new sqlite3.Database(path.join(__dirname, "spotting.db"));
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const pfpStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `pfp_${req.user.userId}_${Date.now()}${ext}`);
  },
});

const pfpUpload = multer({
  storage: pfpStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WebP, or GIF images are allowed."));
    }
  },
});

dotenv.config({ path: path.join(__dirname, ".env") });

const JWT_SECRET = process.env.JWT_SECRET;

function validateEmail(email) {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  return emailRegex.test(email);
}

function validateUsername(username) {
  const usernameRegex = /^[A-Za-z0-9._-]{3,20}$/;
  return usernameRegex.test(username);
}

function validatePassword(password) {
  const passwordRegex = /^[A-Za-z0-9._\-]+$/;
  return password.length >= 5 && passwordRegex.test(password);
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

function dbGet(sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      err ? reject(err) : resolve(row);
    });
  });
}

function dbAll(sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      err ? reject(err) : resolve(rows);
    });
  });
}

function seedLookupTables() {
  db.get("SELECT COUNT(*) AS count FROM airports", async (err, row) => {
    if (err)
      return console.error("Error checking airports table:", err.message);
    if (row.count > 0) {
      console.log(
        `Airports table already has ${row.count} rows, skipping seed.`,
      );
    } else {
      console.log("Seeding airports table from AirLabs...");
      try {
        const response = await axios.get("https://airlabs.co/api/v9/airports", {
          params: { api_key: process.env.AIRLABS_API_KEY },
        });
        const airports = response.data.response;
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO airports (port_iata, port_icao, port_name, port_country_code)
          VALUES (?, ?, ?, ?)`);
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
    if (err)
      return console.error("Error checking airlines table:", err.message);
    if (row.count > 0) {
      console.log(
        `Airlines table already has ${row.count} rows, skipping seed.`,
      );
    } else {
      console.log("Seeding airlines table from AirLabs...");
      try {
        const response = await axios.get("https://airlabs.co/api/v9/airlines", {
          params: { api_key: process.env.AIRLABS_API_KEY },
        });
        const airlines = response.data.response;
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO airlines (airline_icao, airline_iata, airline_name,  
          airline_country_code) VALUES (?, ?, ?, ?)`);
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
app.use("/uploads", express.static(uploadsDir));

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

    const response = await axios.get(openskyUrl, { params, auth });

    const flightData = response.data.states
      ? response.data.states.slice(0, 50)
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
        ? dbGet("SELECT airline_name FROM airlines WHERE airline_icao = ?", [
            flightInfo.airline_icao,
          ])
        : Promise.resolve(null),
      flightInfo.dep_iata
        ? dbGet(
            "SELECT port_name, port_country_code FROM airports WHERE port_iata = ?",
            [flightInfo.dep_iata],
          )
        : Promise.resolve(null),
      flightInfo.arr_iata
        ? dbGet(
            "SELECT port_name, port_country_code FROM airports WHERE port_iata = ?",
            [flightInfo.arr_iata],
          )
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
app.post("/api/log-spot", authenticateToken, async (req, res) => {
  const user_id = req.user.userId;
  const {
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

  const safeNotes = sanitiseInput(notes || "");

  const aircraftSql = `
    INSERT OR IGNORE INTO aircraft
      (air_icao24_hex, air_reg, air_airline_icao, air_icao_type, air_manufacturer, air_age)
      VALUES (?, ?, ?, ?, ?, ?)`;

  const logSql = `
    INSERT INTO logs
      (user_id, air_icao24_hex, log_callsign, log_dep_iata, log_arr_iata, log_latitude, log_longitude, log_altitude, log_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.serialize(() => {
    db.run(
      aircraftSql,
      [hex, reg, airline, type, manufacturer, age],
      (error) => {
        if (error) return res.status(500).json({ error: error.message });

        db.run(
          logSql,
          [user_id, hex, callsign, dep, arr, lat, lon, alt, safeNotes],
          function (error) {
            if (error) return res.status(500).json({ error: error.message });
            res.json({
              message: "Aircraft spotted and logged.",
              logId: this.lastID,
            });
          },
        );
      },
    );
  });
});

// Get all user logged spots
app.get("/api/logbook", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { sort } = req.query;

  const order = sort === "asc" ? "ASC" : "DESC";

  const sql = `
    SELECT
      l.log_id,
      l.log_timestamp,
      l.log_callsign,
      l.log_dep_iata,
      l.log_arr_iata,
      a.air_reg,
      a.air_icao_type,
      a.air_manufacturer,
      al.airline_name,
      dep_p.port_name AS dep_name,
      arr_p.port_name AS arr_name
    FROM logs l
    LEFT JOIN aircraft a ON l.air_icao24_hex = a.air_icao24_hex
    LEFT JOIN airlines al ON a.air_airline_icao = al.airline_icao
    LEFT JOIN airports dep_p ON l.log_dep_iata = dep_p.port_iata
    LEFT JOIN airports arr_p ON l.log_arr_iata = arr_p.port_iata
    WHERE l.user_id = ?
    ORDER BY l.log_timestamp ${order}`;

  db.all(sql, [userId], (error, rows) => {
    if (error) return res.status(500).json({ error: "Database error" });
    res.json({ logs: rows });
  });
});

// Delete user log entry
app.delete("/api/log/:logId", authenticateToken, (req, res) => {
  const logId = req.params.logId;
  const userId = req.user.userId;

  db.run(
    "DELETE FROM logs WHERE log_id = ? AND user_id = ?",
    [logId, userId],
    function (error) {
      if (error)
        return res.status(500).json({ error: "Failed to delete log." });
      if (this.changes === 0)
        return res.status(404).json({ error: "Log entry not found." });
      res.json({ message: "Log entry deleted successfully." });
    },
  );
});

// Register user into database & hash password
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, fName, lName, username } = req.body;

    if (!email || !password || !fName || !username) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email." });
    }

    if (!validateUsername(username)) {
      return res.status(400).json({
        error:
          "Invalid username. Must be 3-20 characters, alphanumeric, or ._- only.",
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error:
          "Invalid password. Must be at least 5 characters, alphanumeric, or ._- only.",
      });
    }

    const safeFName = sanitiseInput(fName);
    const safeLName = sanitiseInput(lName);

    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const sql = `
      INSERT INTO users
        (user_email, user_pass_hash, user_fname, user_lname, user_username)
        VALUES (?, ?, ?, ?, ?)`;

    db.run(
      sql,
      [email.toLowerCase(), hash, safeFName, safeLName, username.toLowerCase()],
      (error) => {
        if (error) {
          if (error.message.includes("UNIQUE constraint")) {
            return res
              .status(400)
              .json({ error: "Email or username already exists" });
          }
          return res.status(400).json({ error: "Registration failed." });
        }
        res.json({ message: "User registered successfully." });
      },
    );
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// User login
app.post("/api/login", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: "Missing credentials." });
  }

  const safeIdentifier = sanitiseInput(identifier);

  const sql = `SELECT * FROM users WHERE LOWER(user_username) = ? OR LOWER(user_email) = ?`;

  db.get(
    sql,
    [safeIdentifier.toLowerCase(), safeIdentifier.toLowerCase()],
    async (error, user) => {
      if (error) return res.status(500).json({ error: "Database error" });
      if (!user) return res.status(401).json({ error: "User not found" });

      const match = await bcrypt.compare(password, user.user_pass_hash);

      if (match) {
        const token = jwt.sign(
          {
            userId: user.user_id,
            username: user.user_username,
            fname: user.user_fname,
          },
          JWT_SECRET,
          { expiresIn: "30d" },
        );

        res.json({
          message: "Login successful",
          token: token,
          user: {
            id: user.user_id,
            username: user.user_username,
            fname: user.user_fname,
            pfpUrl: user.user_pfp_url || null,
          },
        });
      } else {
        res.status(401).json({ error: "Incorrect login credentials." });
      }
    },
  );
});

// Get user statistics
app.get("/api/stats", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [totalLogs, uniqueAircraft, topAirline, topType, byMonth] =
      await Promise.all([
        dbGet("SELECT COUNT(*) as count FROM logs WHERE user_id = ?", [userId]),
        dbGet(
          "SELECT COUNT(DISTINCT air_icao24_hex) as count FROM logs WHERE user_id = ?",
          [userId],
        ),
        dbGet(
          `SELECT al.airline_name, COUNT(*) as count
          FROM logs l
          JOIN aircraft a ON l.air_icao24_hex = a.air_icao24_hex
          JOIN airlines al ON a.air_airline_icao = al.airline_icao
          WHERE l.user_id = ? AND al.airline_name IS NOT NULL
          GROUP BY al.airline_name ORDER BY count DESC LIMIT 1`,
          [userId],
        ),
        dbGet(
          `SELECT a.air_icao_type, COUNT(*) as count
          FROM logs l
          JOIN aircraft a ON l.air_icao24_hex = a.air_icao24_hex
          WHERE l.user_id = ? AND a.air_icao_type IS NOT NULL
          GROUP BY a.air_icao_type ORDER BY count DESC LIMIT 1`,
          [userId],
        ),
        dbAll(
          `SELECT strftime('%Y-%m', log_timestamp) as month, COUNT(*) as count
          FROM logs WHERE user_id = ?
          GROUP BY month ORDER BY month ASC`,
          [userId],
        ),
      ]);

    res.json({
      total_logs: totalLogs?.count ?? 0,
      unique_aircraft: uniqueAircraft?.count ?? 0,
      most_common_airline: topAirline?.airline_name ?? null,
      most_common_type: topType?.air_icao_type ?? null,
      by_month: byMonth,
    });
  } catch (error) {
    console.error("Stats error:", error.message);
    res.status(500).json({ error: "Failed to fetch statistics." });
  }
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
    res.json({ usernameTaken: !!row });
  });
});

// Get user profile
app.get("/api/user/:userId", authenticateToken, (req, res) => {
  const requestedUserId = req.params.userId;
  const authenticatedUserId = req.user.userId;

  if (parseInt(requestedUserId) !== authenticatedUserId) {
    return res.status(403).json({ error: "Access denied." });
  }

  const sql = `
    SELECT user_id, user_fname, user_lname, user_username, user_email, user_pfp_url, user_joined_at
    FROM users WHERE user_id = ?`;

  db.get(sql, [requestedUserId], (error, user) => {
    if (error) return res.status(500).json({ error: "Database error" });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  });
});

// Update user profile
app.put("/api/user/:userId", authenticateToken, async (req, res) => {
  const userId = req.params.userId;

  if (parseInt(userId) !== req.user.userId) {
    return res.status(403).json({ error: "Access denied." });
  }

  const { fname, lname, username } = req.body;

  if (!fname || !username) {
    return res
      .status(400)
      .json({ error: "First name and username are required." });
  }

  // Check if new username is taken by another user
  try {
    const existing = await dbGet(
      "SELECT user_id FROM users WHERE LOWER(user_username) = LOWER(?) AND user_id != ?",
      [username, userId],
    );
    if (existing) {
      return res.status(409).json({ error: "Username already taken." });
    }
  } catch (error) {
    return res.status(500).json({ error: "Database error" });
  }

  const sql = `
    UPDATE users SET user_fname = ?, user_lname = ?, user_username = ?
    WHERE user_id = ?`;

  db.run(sql, [fname, lname, username.toLowerCase(), userId], function (error) {
    if (error)
      return res.status(500).json({ error: "Failed to update profile." });
    if (this.changes === 0)
      return res.status(404).json({ error: "User not found." });
    res.json({ message: "Profile updated successfully." });
  });
});

// Change user password
app.put("/api/user/:userId/password", authenticateToken, async (req, res) => {
  const userId = req.params.userId;

  if (parseInt(userId) !== req.user.userId) {
    return res.status(403).json({ error: "Access denied." });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Current and new passwords are required." });
  }

  if (newPassword.length < 5) {
    return res
      .status(400)
      .json({ error: "New password must be at least 5 characters." });
  }

  try {
    const user = await dbGet(
      "SELECT user_pass_hash FROM users WHERE user_id = ?",
      [userId],
    );
    if (!user) return res.status(404).json({ error: "User not found." });

    const match = await bcrypt.compare(currentPassword, user.user_pass_hash);
    if (!match)
      return res.status(401).json({ error: "Current password is incorrect." });

    const hash = await bcrypt.hash(newPassword, 10);
    db.run(
      "UPDATE users SET user_pass_hash = ? WHERE user_id = ?",
      [hash, userId],
      (error) => {
        if (error)
          return res.status(500).json({ error: "Failed to update password." });
        res.json({ message: "Password changed successfully." });
      },
    );
  } catch (error) {
    res.status(500).json({ error: "Something went wrong." });
  }
});

// Delete user account
app.delete("/api/user/:userId", authenticateToken, async (req, res) => {
  const userId = req.params.userId;

  if (parseInt(userId) !== req.user.userId) {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    const user = await dbGet(
      "SELECT user_pfp_url FROM users WHERE user_id = ?",
      [userId],
    );
    if (user?.user_pfp_url) {
      const filePath = path.join(uploadsDir, path.basename(user.user_pfp_url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  } catch {}

  db.serialize(() => {
    db.run("DELETE FROM logs WHERE user_id = ?", [userId]);
    db.run("DELETE FROM users WHERE user_id = ?", [userId], function (error) {
      if (error)
        return res.status(500).json({ error: "Failed to delete account." });
      if (this.changes === 0)
        return res.status(404).json({ error: "User not found." });
      res.json({ message: "Account deleted successfully." });
    });
  });
});

// Upload profile picture
app.post("/api/user/:userId/pfp", authenticateToken, (req, res) => {
  if (parseInt(req.params.userId) !== req.user.userId) {
    return res.status(403).json({ error: "Access denied." });
  }

  pfpUpload.single("pfp")(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ error: "File too large. Maximum size is 2MB." });
      }
      return res.status(400).json({ error: err.message || "Upload failed." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file provided." });
    }

    const userId = req.params.userId;
    const pfpUrl = `/uploads/${req.file.filename}`;

    try {
      const user = await dbGet(
        "SELECT user_pfp_url FROM users WHERE user_id = ?",
        [userId],
      );
      if (user?.user_pfp_url) {
        const oldFilePath = path.join(
          uploadsDir,
          path.basename(user.user_pfp_url),
        );
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
    } catch {}

    db.run(
      "UPDATE users SET user_pfp_url = ? WHERE user_id = ?",
      [pfpUrl, userId],
      (error) => {
        if (error)
          return res
            .status(500)
            .json({ error: "Failed to save profile picture." });
        res.json({ message: "Profile picture updated.", pfpUrl });
      },
    );
  });
});

// Delete profile picture
app.delete("/api/user/:userId/pfp", authenticateToken, async (req, res) => {
  const userId = req.params.userId;

  if (parseInt(userId) !== req.user.userId) {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    const user = await dbGet(
      "SELECT user_pfp_url FROM users WHERE user_id = ?",
      [userId],
    );
    if (!user?.user_pfp_url) {
      return res.status(404).json({ error: "No profile picture to remove." });
    }

    const oldFilePath = path.join(uploadsDir, path.basename(user.user_pfp_url));
    if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);

    db.run(
      "UPDATE users SET user_pfp_url = NULL WHERE user_id = ?",
      [userId],
      (error) => {
        if (error)
          return res
            .status(500)
            .json({ error: "Failed to remove profile picture." });
        res.json({ message: "Profile picture removed." });
      },
    );
  } catch {
    res.status(500).json({ error: "Something went wrong." });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
