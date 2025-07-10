Dynamic1 Casino Management System – Reports Module Functional Requirements Author: Aaron Hazzard
Date: 05/06/2025
________________________________________
1. Introduction
This document outlines the core functional requirements for the redesigned Reports Module within the Dynamic1 Casino Management System. These requirements reflect common reporting needs requested by internal stakeholders, collections staff, and licensees. The goal is to enable efficient monitoring of financials, machine performance, customer data, and site operations across all locations.
________________________________________
2. Functional Requirements
Each report listed below should support the ability to: - Filter by date range, location, and other relevant parameters - View on screen with pagination and sorting - Export to PDF and CSV formats
2.1. Daily Counts and Voucher Reports
•	Summarize daily meter readings and physical cash counts
•	Include voucher issuance and redemptions
•	Track variances between expected vs actual counts
2.2. Active Customer Count
•	Display how many customers are currently registered and/or active
•	Include filters for date range and location (e.g., by sign-in records)
•	Optionally show trends over time (weekly/monthly)
2.3. Location Statistics Summary
•	Show performance metrics per location:
o	Machine count
o	Online/offline breakdown
o	Total daily intake and payouts
o	Net revenue and uptime
2.4. Bar & Concession Performance
•	Generate revenue tracking for bar/concession POS areas (if integrated)
•	Support daily, weekly, and monthly views
•	Display trends over selected periods
2.5. Machine Cash Intake and Performance
•	Show performance metrics for each machine:
o	Money in/out
o	Play count
o	Average play duration
o	Total income generated
•	Allow comparisons across locations and types
2.6. Location Cash Balances
•	Display cash on hand per location
•	Include both opening and closing balances
•	Support reconciliation with machine counts and collection entries
2.7. Daily Cash Snapshot (Needs Further Planning)
•	Framework for defining and capturing daily start/end cash flows
•	May require new input screens or syncing with collection data
•	Stakeholder planning session needed to finalize flow
2.8. Financial Performance of Machines and Games
•	Breakdown revenue and net performance by:
o	Machine ID
o	Game type or game name
•	Include payout ratio, hold percentage, and earnings per game
2.9. Terminal Counts by Manufacturer and Game Type
•	Show how many terminals exist per:
o	Manufacturer (e.g., Novomatic, IGT)
o	Machine type (e.g., Roulette, Fruit, Video Slots)
•	Support grouping and exporting by type
________________________________________
3. Design Notes & Next Steps
•	Reports will be accessible under the redesigned Reports tab
•	Each report will include responsive layouts for desktop and mobile
•	Data should update in near real-time where possible
•	Stakeholders (Vanessa, Sylvia, Kevin) will review and prioritize report types for MVP delivery
•	Further feedback will be gathered during QA and beta testing to iterate layout and filtering
________________________________________
4. Delivery Considerations
•	Prioritize foundational reports (counts, machines, location stats) in first implementation wave
•	Additional integrations (e.g., bar POS) may follow if data sources become available
•	Export and printing must be consistent across all reports
•	All reports must respect user permissions and role-based access
