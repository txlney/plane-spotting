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
  - The system should update the map at regular intervals to be determined.
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
  - The system could include simple summary statistics, e.g. total aircraft spotted, airline spotted the most.
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
  - The aircraft map should update every X seconds.
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

### 5.1: Decisions:

- **Frontend: React**
  - I've decided to build the frontend using React for its component-based architecture and efficient rendering. This makes it ideal for my live aircraft map and responsive UI.
- **Backend: Node.js and Express**
  - The backend will use Node.js and Express to handle the real-time API calls efficiently. It's a suitable framework for processing the live flight data.
- **Database: PostgreSQL**
  - I will use PostgreSQL for my relational database to store user profiles, aircraft data and logs, etc., due to its scalability and advanced querying, which will be useful for filtering user collections.
- **External API: OpenSky Network**
  - The system will use OpenSky Network for its ADS-B data, providing real-time flight data. It will be ideal for my project because it offers free, but limited, access.

## NOTES
- should the map be limited to a certain area? possibly easier to implement, need to gather ideas from potential users
