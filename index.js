import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs";
import open from "open";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));

const credentials = JSON.parse(fs.readFileSync("credentials.json"));
const { client_id, client_secret, redirect_uris } = credentials.web;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const TOKEN_PATH = "token.json";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

function saveToken(token) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
  console.log("✅ Token stored to", TOKEN_PATH);
}

app.get("/", async (req, res) => {
  if (fs.existsSync(TOKEN_PATH)) {
    res.send(`
      <h1>📅 Create Google Meet Event</h1>
      <form action="/create-event" method="POST">
        <label>Enter attendee emails (comma separated):</label><br/>
        <input type="text" name="emails" placeholder="e.g. user1@gmail.com, user2@gmail.com" style="width: 300px; padding: 6px;" required />
        <br/><br/>
        <button type="submit" style="padding:8px 16px;">Create Meet Event</button>
      </form>
      <p style="margin-top:20px;"><a href="/logout">🔁 Re-authenticate</a></p>
    `);
  } else {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent", // ensures refresh_token is returned
      scope: SCOPES,
    });
    res.send(`
      <h1>Google Meet Demo</h1>
      <p><a href="${authUrl}">Sign in with Google</a></p>
    `);
  }
});

app.post("/create-event", async (req, res) => {
  if (!fs.existsSync(TOKEN_PATH)) return res.redirect("/");

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oAuth2Client.setCredentials(token);

  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

  const emails = req.body.emails
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.includes("@"));

  const attendees = emails.map((email) => ({ email }));

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
    attendees,
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
      sendUpdates: "all",
    });

    const createdEvent = response.data;
    const meetLink =
      createdEvent.conferenceData?.entryPoints?.find(
        (e) => e.entryPointType === "video"
      )?.uri || "No Meet link found";

    res.send(`
      <h2> Event Created!</h2>
      <p><strong>Title:</strong> ${createdEvent.summary}</p>
      <p><strong>Start:</strong> ${createdEvent.start.dateTime}</p>
      <p><strong>Meet Link:</strong> <a href="${meetLink}" target="_blank">${meetLink}</a></p>
      <p><strong>Invited:</strong> ${attendees.map((a) => a.email).join(", ")}</p>
      <br/>
      <a href="/">➕ Create another event</a>
    `);

    console.log(" Event created with attendees:", emails);
  } catch (err) {
    console.error(" Error creating event:", err);
    res.send("Error creating event. Check console for details.");
  }
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No code found in query params.");

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    saveToken(tokens);
    res.send(`
      <h3>Authentication successful!</h3>
      <p>You can now <a href="/">return to the app</a> to create a Meet event.</p>
    `);
  } catch (err) {
    console.error(" Error retrieving access token:", err);
    res.send("Error during authentication. Check console for details.");
  }
});

// --- Logout (delete token) ---
app.get("/logout", (req, res) => {
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  res.send(`
    <h3>🔁 You have logged out.</h3>
    <p><a href="/">Sign in again</a></p>
  `);
});

app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  if (!fs.existsSync(TOKEN_PATH)) {
    console.log("Opening browser for authentication...");
    await open(`http://localhost:${PORT}`);
  } else {
    console.log("Already authenticated. Go to http://localhost:${PORT}");
  }
});
