# Literature Review, UP2158859 :book:

## 1. Introduction :airplane:

This literature review aims to analyse existing applications and research related to the hobby of plane spotting, and any digital solutions to support it. By examining current systems and designs, the purpose of the review is to identify and explore any potential gaps and opportunities that may help construct the requirements and architecture of my application.

Plane spotting is a popular hobby amongst all age demographics, yet many often continue to use multiple fragmented tools for the tracking, logging, and managing of their collections. This review will focus on existing solutions to this problem, such as FlightRadar24 and FlightAware, as well as a variety of ADS-B data providers. Understanding and evaluating these elements will help ensure that the application meets users' needs, maintains expected standards, and differentiates itself from existing solutions.

The following sections of the review cover the existing solutions, design trends, and functional gaps, concluding with a summary of key insights.

## 2. Existing Solutions :key:

### 2.1 FlightRadar24
FlightRadar24 is used by thousands of hobbyists, most major airlines, and other companies - such as Airbus and Boeing - in the aviation industry, with over 5 million users and 250,000 flights tracked per day *([Flightradar24, 2025](#references))*. It reliably provides real-time global aircraft data using [ADS-B](/glossary.md) receivers, [MLAT](/glossary.md), and satellite feeds, and details a vast amount of information for every flight - such as aircraft model, route, altitude, and speed. These data inputs are processed within FlightRadar24's data platform and exposed to users via its own proprietary interfaces, collectively known as FR24 API *([Flightradar24 API - Overview, 2025](#references))*. In addition, its simple data visualisation features make it a very popular solution for everyone from hardcore aviation enthusiasts to complete beginners.

One drawback of this solution is how it is primarily focused on aircraft tracking and monitoring, rather than spotting and logging. The app lacks features such as a logbook, limiting its usefulness for users who want to maintain a personal collection. This highlights the need for my solution to be more oriented towards plane-spotters, where a logbook aspect can help prioritise collection management.
Another disadvantage of FlightRadar24 is the number of features that are locked behind premium subscriptions, potentially discouraging new and casual hobbyists, underlining the need for a free alternative. Current users of FlightRadar24 have also noted a recent gradual increase in interruptions like advertisements on the application, with a subscription required to remove them, this causes users to grow frustrated and eventually stop using the platform *([Reddit - Flightradar24, 2023](#references))*. Whilst this is a downside of this platform, it will have minimal effect on the design and functionality of my solution, as most of the hidden aspects are centred around aircraft tracking, such as historical flight data, which will not be necessary in my hobby-based application. Despite this, paywall subscriptions are still a major downside of an application, so I will avoid using them.

### 2.2 FlightAware
FlightAware is another widely used application amongst flight trackers, also offering real-time data for both commercial and private aircraft. Similar to FlightRadar24, it mostly uses ADS-B, MLAT, and radar information to gather its data; however, one key difference is its direct use of ATC data, which FR24 does not use. The main features of FlightAware include flight alerts, airport activity, and historical flight data, making it a very useful application in regards to tracking and planning for both organisations and casual travellers. These features are enabled through multiple API's used by FlightAware, such as Firehose and AeroAPI *([Data Sources - FlightAware, 2025](#references))*, which is useful for advanced users, but does not improve the experience for hobbyists searching for a plane-spotting focused platform.

Despite this, FlightAware suffers from many parallel drawbacks as FlightRadar24, such as its design being primarily focued on monitoring and detailed tracking of aircraft, as opposed to plane spotting. Features like logbooks and collection management are absent, whilst other features such as extended historical data and advanced aircraft information are locked behind subscriptions. This makes the program very useful for users such as organisations and travellers, who need to organise and plan in detail *([Pilotplans - FlightAware Review, 2025](#references))*, but not very useful for users who would prefer a place to collect and log aircraft. These limitations do not directly impact my design, as my application will likely not require extensive historical data; however, they further highlight the need for a free, hobby-focused platform that prioritises user logging and collection over detailed tracking.

### 2.3 ADS-B Exchange

### 2.4 OpenSky Network

## 3. Design Trends :pencil2:

## 4. Functional Gaps :mag_right:

## 5. Technical Considerations :satellite:

## 6. Summary :pushpin:

## References

- Flightradar24. (2025). Flightradar24.com. https://www.flightradar24.com/about
- Flightradar24 API - Overview. (2025). Flightradar24.com. https://fr24api.flightradar24.com/
- Reddit - Flightradar24. (2023). Reddit.com. https://www.reddit.com/r/flightradar24/comments/11cu751/why_are_there_more_and_more_ads_popping_up/
- Data Sources - FlightAware. (2025). Flightaware.com. https://www.flightaware.com/about/data-sources/
- Pilotplans Blog. (2025). FlightAware Review: A Reliable Flight Tracker? Pilotplans.com. https://www.pilotplans.com/blog/flightaware-review

### General Notes
- Ethics: encouraging people to plane spot in potential illegal areas? need a warning
- User req: forms/interviews to determine what aircraft data is (un)necessary etc. cannot assume.
