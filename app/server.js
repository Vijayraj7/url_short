const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 5001;
const MONGO_URI = "mongodb://mrktadm:alrttadm@147.79.71.247:27017/alert_db"; // MongoDB URI

// Use CORS middleware
app.use(cors({ origin: 'https://marketalert.in' }));

// Middleware to parse JSON bodies
app.use(express.json());

// MongoDB connection
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// URL schema and model
const urlSchema = new mongoose.Schema({
  longUrl: String,
  shortUrl: String,
  alias: String,
});

const Url = mongoose.model("Url", urlSchema);

// Create Short URL
app.post("/api/shorten", async (req, res) => {
  const { longUrl, customAlias } = req.body;
  if (!longUrl) return res.status(400).json({ error: "longUrl is required" });

  const alias = customAlias || Math.random().toString(36).substring(2, 8);
  const shortUrl = `https://marketalert.in/url_api/shorten/${alias}`;

  const newUrl = new Url({ longUrl, shortUrl, alias });
  await newUrl.save();

  res.status(201).json({ shortUrl });
});

// Redirect Short URL
app.get("/shorten/:alias", async (req, res) => {
  const { alias } = req.params;
  const urlData = await Url.findOne({ alias });
  if (!urlData) return res.status(404).json({ error: "URL not found" });

  res.redirect(urlData.longUrl);
});


app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
});
