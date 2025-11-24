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
  - The system should allow users to log aircraft spotted into their collection (via clicking aircraft markers or a searchable feature)
  - The system should include flight details with each log, along with the date of logging and an optional photo uploaded.
  - The system should allow users to edit or delete logged entries.
- **FR3:** Collection Management
  - The system should provide a searchable/filterable display of the user's logged aircraft.
  - Filters should include: aircraft model/type, airline, and date of spotting.
  - The system could include simple summary statistics, e.g. total aircraft spotted, airline spotted the most.

## NOTES
- should the map be limited to a certain area? possibly easier to implement, need to gather ideas from potential users
