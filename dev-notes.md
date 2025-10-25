# Developer Diary — Google Meet Integration (Node.js)

## Objective
Build a small Node.js app that allows users to authenticate with Google, create Calendar events, and automatically generate Google Meet links — all from a simple web interface.

---

## Approach

### 1. Setup
Created a new Google Cloud project in **Google Cloud Console**
Enabled **Google Calendar API**
Configured **OAuth consent screen**
Added my email as a **test user**
Created **OAuth 2.0 credentials**
Downloaded `credentials.json` and added it to the project

### 2. Local App Setup
Installed dependencies:
npm install express googleapis dotenv open body-parser

### 3.Key Decisions
Chose Node.js + Express for quick prototyping
Used googleapis official client for API integration
Focused on reliable OAuth token handling and error clarity

### 3.Issues or Error
403 access_denied (App not verified)
No refresh token is set (Google didn’t return refresh token)

### 3.Resources
Google Calendar API – Events.insert
Google OAuth 2.0 for Web Server Applications
Node.js Google APIs Client Library
Stack Overflow and ChatGpt




