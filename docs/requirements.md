# Application Requirements, UP2158859

## 1. Introduction

- **Purpose:** To define functional and non-functional requirements for the plane spotting application, which aims to centralise the hobby of plane spotting via aircraft tracking, logging and collection management integration.
- **Scope:** The application will aim to provide a live aircraft map using ADS-B data, allow users to log aircraft they have spotted into a personal collection, and offer a searchable interface to manage their collections.

## 2. Stakeholders

- **Primary Users:** Plane spotters and other aviation enthusiasts who would like an easier and more efficient method of tracking and logging aircraft spotted.
- **Secondary Stakeholders:** Tourists/travellers interested in aviation, as well as potentially educators and students using the app for learning.

## 3. Functional Requirements

- **FR1:** Live Aircraft Map
  - The system should display a live map showing aircraft positions using ADS-B data.
  - The system should update the map at regular intervals. **TO BE DETERMINED**
  - Each aircraft marker should be clickable to display flight information.
  - Each aircraft on the map should include minimum: model, tail number, route, altitude, and speed.
- **FR2:** Aircraft Logging
  - The system should allow users to log aircraft spotted into their collection by clicking a marker.
  - The system should provide a search feature for users to search for specific aircraft.
  - The system should include flight details with each log, along with the date of logging and an optional photo uploaded.
  - The system should allow users to edit or delete logged entries.
- **FR3:** Collection Management
  - The system should provide a searchable/filterable display of the user's logged aircraft.
  - Filters should include: aircraft model/type, airline, and date of spotting.
  - The system could include simple summary statistics, e.g. total aircraft spotted, airline spotted the most. (secondary feature, added if there is time)
- **FR4:** User Profiles
  - The system should allow users to create accounts and login.
  - The users information should be stored securely, with passwords hashed.
  - Users should be able to view and change their profile information.
  - Users should be able to delete their profile.
- **FR5:** Photo Upload (secondary feature, added if there is time)
  - The system should allow the user to upload a photo of logged aircraft.
  - The system should store and display photos alongside aircraft when viewed.

## 4. Non-Functional Requirements

- **Performance:**
  - The system should load the home page within 3 seconds on a standard connection.
  - The aircraft map should update every X seconds. **TO BE DETERMINED**
- **Security:**
  - User passwords should be hashed before storage.
  - The system should comply with GDPR for data handling.
  - The system should use role-based access control for database admin.
- **Usability:**
  - The UI should be responsive and function on desktop and mobile.
  - The system should provide clear and understandable error messages.
  - The UI should follow WCAG standards.
- **Compatibility:**
  - The system should work on different browsers (Chrome, Firefox, Edge, etc.)
  - The system should work on Windows, macOS, and mobile OS.
 
## 5. System Architecture

### 5.1: Overview

The system will follow a clear client-server architecture, with separation between the frontend, backend, and database. The frontend should provide an interactive UI for real-time aircraft viewing, logging, and collection management. The backend should handle the logic, API integration, and user profiles/authentication, whilst the database should securely store the user data and aircraft logs. The external flight data API should be gathered from OpenSky Network via RESTful API calls.

### 5.2: Components

- **Frontend: React**
  - I've decided to build the frontend using React for its component-based architecture and efficient rendering. This makes it ideal for my live aircraft map and responsive UI.
- **Backend: Node.js and Express**
  - The backend will use Node.js and Express to handle the real-time API calls efficiently. It's a suitable framework for processing the live flight data.
- **Database: PostgreSQL**
  - I will use PostgreSQL for my relational database to store user profiles, aircraft data and logs, etc., due to its scalability and advanced querying, which will be useful for filtering user collections.
- **External API: OpenSky Network**
  - The system will use OpenSky Network for its ADS-B data, providing real-time flight data. It will be ideal for my project because it offers free, but limited, access.

## 6. Constraints

- API Limitations:
  - OpenSky Network has rate limits, exact limits to be determined.
  - ADS-B data will likely have delays and incomplete coverage in certain regions.
  - ADS-B data will be missing for certain aircraft such as military or blocked flights.
- Time and Resource Limitations:
  - Deadline in May 2026 and one developer, may fall behind schedule.
  - Scope must remain realistic, some features may not make it to final product.
- Compliance Limitations:
  - Must comply with GDPR for user data.
  - Must comply with OpenSky Network API licensing terms - non-commercial only.

## 7. Acceptance Criteria

Each major feature can be considered as complete if they match the following criteria:

- **FR1:** Live Aircraft Map
  - The app loads and displays a live map of aircraft within 3 seconds on a standard connection.
  - Aircraft markers on the map update every X seconds. **TO BE DETERMINED**
  - Clicking on an aircraft marker displays flight details including model, tail number, altitude, and speed.
- **FR2:** Aircraft Logging
  - The user can log an aircraft with important information such as tail number, timestamp, etc.
  - Logged entries appear in the users collection immediately after addition.
  - The user is able to edit or delete an entry.
- **FR3:** Collection Management
  - The user can effectively search for aircraft by details such as tail number, and filter aircraft.
  - The results display at least X entries per page. **TO BE DETERMINED**
  - The collection page displays summary statistics (secondary feature).
- **FR4:** User Profiles
  - The user is able to register a profile, delete their profile, login, and logout securely.
  - Passwords are properly hashed and stored.
- **FR5:** Photo Upload (secondary feature)
  - The user is able to upload a photo of maximum XMB size. **TO BE DETERMINED**
  - The photo displays properly alongside the entry in the users collection.
