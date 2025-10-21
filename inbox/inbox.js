// inbox/inbox.js
import fs from "fs";
import path from "path";
import multer from "multer";
import { analyzeToTasks } from "../ai/assistant.js";

const uploadDir = path.resolve("./inbox/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, `${timestamp}_${safe}`);
  }
});
const upload = multer({ storage });

export function setupInboxRoutes(app) {
  // Text -> Tasks
  app.post("/inbox/text", async (req, res) => {
    try {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", async () => {
        const text = decodeURIComponent((body.split("text=")[1] || "").replace(/\+/g, "%20"));
        if (!text || !text.trim()) return res.status(400).json({ ok: false, error: "Kein Text erhalten" });
        const tasks = await analyzeToTasks(JSON.parse(text || "[]"));
        res.json({ ok: true, tasks });
      });
    } catch (err) {
      console.error("Fehler in /inbox/text:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Datei -> Tasks
  app.post("/inbox/upload", upload.single("file"), async (req, res) => {
    try {
      const filePath = req.file.path;
      const content = fs.readFileSync(filePath, "utf8");
      const tasks = await analyzeToTasks([{ source: "Datei", text: content }]);
      res.json({ ok: true, file: req.file.originalname, tasks });
    } catch (err) {
      console.error("Fehler in /inbox/upload:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Dateien auflisten
  app.get("/inbox/list", (_req, res) => {
    const files = fs.readdirSync(uploadDir).map(name => ({ name }));
    res.json({ ok: true, files });
  });
}
