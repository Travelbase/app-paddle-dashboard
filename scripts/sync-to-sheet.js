const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const SHEET_ID = process.env.SHEET_ID;
const SHEET_RANGE = process.env.SHEET_RANGE || "Sheet1!A1:D";
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
const ADMIN_API_URL = process.env.ADMIN_API_URL;
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || process.env.ADMIN_API_KEY;
const ADMIN_API_METHOD = process.env.ADMIN_API_METHOD || "GET";
const ADMIN_API_BODY = process.env.ADMIN_API_BODY ? JSON.parse(process.env.ADMIN_API_BODY) : null;

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

function loadServiceAccountKey() {
  const keyPath = path.resolve(requireEnv("GOOGLE_SERVICE_ACCOUNT_FILE", SERVICE_ACCOUNT_KEY));
  const raw = fs.readFileSync(keyPath, "utf8");
  return JSON.parse(raw);
}

async function getSheetsClient() {
  const credentials = loadServiceAccountKey();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function fetchAdminData() {
  const url = requireEnv("ADMIN_API_URL", ADMIN_API_URL);
  const headers = { "Content-Type": "application/json" };
  if (ADMIN_API_TOKEN) {
    headers.Authorization = `Bearer ${ADMIN_API_TOKEN}`;
  }

  const init = {
    method: ADMIN_API_METHOD,
    headers,
  };

  if (ADMIN_API_BODY) {
    init.body = JSON.stringify(ADMIN_API_BODY);
  }

  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Admin API request failed ${response.status} ${response.statusText}: ${body}`);
  }

  return response.json();
}

function normalizeProject(project) {
  const projectName = project.project || project.name || project.project_name || project.title || "Unknown";
  const sales = project.sales ?? project.revenue ?? project.amount ?? 0;
  const leads = project.leads ?? project.leadCount ?? project.leads_count ?? project.new_leads ?? 0;
  return [projectName, sales, leads, new Date().toISOString()];
}

function buildRows(data) {
  if (Array.isArray(data)) {
    return data.map(normalizeProject);
  }

  if (Array.isArray(data.projects)) {
    return data.projects.map(normalizeProject);
  }

  if (Array.isArray(data.items)) {
    return data.items.map(normalizeProject);
  }

  throw new Error(
    "Unable to normalize admin API response. Expected an array or an object containing `projects` or `items`."
  );
}

async function writeRows(rows) {
  const sheets = await getSheetsClient();
  const values = [["Project", "Sales", "Leads", "Updated"], ...rows];

  await sheets.spreadsheets.values.update({
    spreadsheetId: requireEnv("SHEET_ID", SHEET_ID),
    range: SHEET_RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

async function main() {
  const data = await fetchAdminData();
  const rows = buildRows(data);
  await writeRows(rows);
  console.log(`Synced ${rows.length} project rows to ${SHEET_RANGE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
