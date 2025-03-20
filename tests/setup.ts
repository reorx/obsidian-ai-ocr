import * as fs from "fs";
import * as path from "path";

// Ensure assets directory exists
const ASSETS_DIR = path.join(__dirname, 'assets');
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}
