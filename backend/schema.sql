-- Users
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_fname TEXT NOT NULL,
    user_lname TEXT,
    user_username TEXT NOT NULL UNIQUE,
    user_email TEXT UNIQUE NOT NULL,
    user_pass_hash TEXT NOT NULL,
    user_pfp_url TEXT,
    user_joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
    -- add constraints for email check
);

-- Aircraft
CREATE TABLE IF NOT EXISTS aircraft (
    air_icao24_hex TEXT PRIMARY KEY,
    air_reg TEXT UNIQUE,
    air_airline TEXT,
    air_icao_type TEXT,
    air_model_name TEXT,
    air_manufacturer TEXT,
    air_age INT
);

-- Sighting Logs
CREATE TABLE IF NOT EXISTS logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    air_icao24_hex TEXT NOT NULL,
    log_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    log_dep_port TEXT,
    log_arr_port TEXT,
    log_latitude REAL,
    log_longitude REAL,
    log_altitude INT,
    log_notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (air_icao24_hex) REFERENCES aircraft(air_icao24_hex)
);
