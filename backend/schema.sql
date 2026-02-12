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
);

-- Airports
CREATE TABLE IF NOT EXISTS airports (
    port_iata TEXT PRIMARY KEY,
    port_icao TEXT,
    port_name TEXT NOT NULL,
    port_country_code TEXT
);

-- Airlines
CREATE TABLE IF NOT EXISTS airlines (
    airline_icao TEXT PRIMARY KEY,
    airline_iata TEXT,
    airline_name TEXT NOT NULL,
    airline_country_code TEXT
);

-- Aircraft
CREATE TABLE IF NOT EXISTS aircraft (
    air_icao24_hex TEXT PRIMARY KEY,
    air_reg TEXT UNIQUE,
    air_airline_icao TEXT,
    air_icao_type TEXT,
    air_manufacturer TEXT,
    air_age INT,
    FOREIGN KEY (air_airline_icao) REFERENCES airlines(airline_icao)
);

-- Sighting Logs
CREATE TABLE IF NOT EXISTS logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL,
    air_icao24_hex TEXT NOT NULL,
    log_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    log_callsign TEXT,
    log_dep_iata TEXT,
    log_arr_iata TEXT,
    log_latitude REAL,
    log_longitude REAL,
    log_altitude INT,
    log_notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (air_icao24_hex) REFERENCES aircraft(air_icao24_hex),
    FOREIGN KEY (log_dep_iata) REFERENCES airports(port_iata),
    FOREIGN KEY (log_arr_iata) REFERENCES airports(port_iata)
);
