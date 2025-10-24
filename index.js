import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs";
import open from "open";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const credentials = JSON.parse(fs.readFileSync("credentials.json"));
const { client_id, client_secret, redirect_uris } = credentials.web;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const TOKEN_PATH = "token.json";
const SCOPES = [process.env.SCOPES || "https://www.googleapis.com/auth/calendar"];

function saveToken(token) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
  console.log(" Token stored to", TOKEN_PATH);
}

app.get("/", async (req, res) => {
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

    // Create a new event with Google Meet
    const eventStart = new Date();
    eventStart.setMinutes(eventStart.getMinutes() + 5);
    const eventEnd = new Date(eventStart);
    eventEnd.setMinutes(eventEnd.getMinutes() + 30);

    const event = {
      summary: "Team Sync via Google Meet",
      description: "Created automatically using the Google Calendar API!",
      start: {
        dateTime: eventStart.toISOString(),
        timeZone: "Africa/Tunis", 
      },
      end: {
        dateTime: eventEnd.toISOString(),
        timeZone: "Africa/Tunis",
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    try {
      const response = await calendar.events.insert({
        calendarId: "primary",
        resource: event,
        conferenceDataVersion: 1,
      });

      const createdEvent = response.data;
      const meetLink =
        createdEvent.conferenceData?.entryPoints?.find(
          (e) => e.entryPointType === "video"
        )?.uri || "No Meet link found";

      console.log("Event created:");
      console.log("Summary:", createdEvent.summary);
      console.log("Start:", createdEvent.start.dateTime);
      console.log("Meet link:", meetLink);

      res.send(`
        <h2> Event Created Successfully</h2>
        <p><strong>Title:</strong> ${createdEvent.summary}</p>
        <p><strong>Start:</strong> ${createdEvent.start.dateTime}</p>
        <p><strong>Meet Link:</strong> <a href="${meetLink}" target="_blank">${meetLink}</a></p>
      `);
    } catch (err) {
      console.error("Error creating event:", err);
      res.send("Error creating event. Check console for details.");
    }
  } else {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    res.send(`
      <h1>Google Meet Demo</h1>
      <p><a href="${authUrl}">Sign in with Google</a></p>
    `);
  }
});

// --- OAuth callback ---
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No code found in query params.");

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    saveToken(tokens);
    res.send("<h3>Authentication successful! Return to the home page.</h3>");
  } catch (err) {
    console.error("Error retrieving access token", err);
    res.send("Error during authentication.");
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  if (!fs.existsSync(TOKEN_PATH)) {
    console.log("Opening browser for authentication...");
    await open(`http://localhost:${PORT}`);
  } else {
    console.log("You are already authenticated. Go to http://localhost:3000");
  }
});
