import * as fs from "fs";
import * as path from "path";

// Ensure assets directory exists
const ASSETS_DIR = path.join(__dirname, 'assets');
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Check for API key
if (!process.env.MISTRAL_API_KEY) {
    console.warn('⚠️ MISTRAL_API_KEY environment variable is not set. Tests may fail.');
}
