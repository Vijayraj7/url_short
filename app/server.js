const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 5001;
const MONGO_URI = "mongodb://mrktadm:alrttadm@147.79.71.247:27017/alert_db";


app.use(cors({ origin: 'https://marketalert.in' }));


app.use(express.json());

// Mongo DB Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));


const urlSchema = new mongoose.Schema({
  longUrl: String,
  shortUrl: String,
  alias: String,
  email: String,
  clicks: [
    {
      date: { type: Date, default: Date.now },
      osType: String,
      deviceType: String,
      uniqueUsers: Number,
      uniqueClicks: Number,
    }
  ],
  topic: String,
});

const Url = mongoose.model("Url", urlSchema);


// Url short route
app.post("/api/shorten", async (req, res) => {
  const { longUrl, customAlias, topic, email } = req.body;
  if (!longUrl) return res.status(400).json({ error: "longUrl is required" });

  const alias = customAlias || Math.random().toString(36).substring(2, 8);
  const shortUrl = `https://marketalert.in/url_api/shorten/${alias}`;

  const newUrl = new Url({ longUrl, shortUrl, alias, topic, email });
  await newUrl.save();

  res.status(201).json({ shortUrl });
});


app.get("/shorten/:alias", async (req, res) => {
  const { alias } = req.params;
  const urlData = await Url.findOne({ alias });
  if (!urlData) return res.status(404).json({ error: "URL not found" });


  const clickData = {
    osType: req.headers['user-agent'],
    deviceType: req.headers['user-agent'],
    uniqueUsers: 1,
    uniqueClicks: 1,
  };

  urlData.clicks.push(clickData);
  await urlData.save();

  res.redirect(urlData.longUrl);
});


// analytics by email
app.get("/api/urls/by-email/:email", async (req, res) => {
  const { email } = req.params;
  const urls = await Url.find({ email });
  if (!urls.length) return res.status(404).json({ error: "No URLs found for this email" });

  res.json(urls);
});


app.get("/api/analytics/:alias", async (req, res) => {
  const { alias } = req.params;
  const urlData = await Url.findOne({ alias });
  if (!urlData) return res.status(404).json({ error: "URL not found" });

  res.json({
    totalClicks: urlData.clicks.length,
    uniqueUsers: urlData.clicks.filter((click, index, self) =>
      self.findIndex(c => c.osType === click.osType && c.deviceType === click.deviceType) === index
    ).length,
    clicksByDate: urlData.clicks.reduce((acc, click) => {
      const date = click.date.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = 0;
      acc[date]++;
      return acc;
    }, {}),
    osType: groupByOs(urlData.clicks),
    deviceType: groupByDevice(urlData.clicks),
  });
});


// analytics by topic
app.get("/api/analytics/topic/:topic", async (req, res) => {
  const { topic } = req.params;
  const urls = await Url.find({ topic });
  if (!urls.length) return res.status(404).json({ error: "No URLs found for this topic" });

  const overallStats = urls.reduce((acc, url) => {
    acc.totalClicks += url.clicks.length;
    acc.uniqueUsers += url.clicks.filter((click, index, self) =>
      self.findIndex(c => c.osType === click.osType && c.deviceType === click.deviceType) === index
    ).length;
    return acc;
  }, { totalClicks: 0, uniqueUsers: 0 });

  res.json({
    totalClicks: overallStats.totalClicks,
    uniqueUsers: overallStats.uniqueUsers,
    clicksByDate: urls.reduce((acc, url) => {
      url.clicks.forEach(click => {
        const date = click.date.toISOString().split('T')[0];
        if (!acc[date]) acc[date] = 0;
        acc[date]++;
      });
      return acc;
    }, {}),
    urls: urls.map(url => ({
      shortUrl: url.shortUrl,
      totalClicks: url.clicks.length,
      uniqueUsers: url.clicks.filter((click, index, self) =>
        self.findIndex(c => c.osType === click.osType && c.deviceType === click.deviceType) === index
      ).length,
    })),
  });
});


app.get("/api/analytics/overall", async (req, res) => {
  const urls = await Url.find({});
  const overallStats = urls.reduce((acc, url) => {
    acc.totalClicks += url.clicks.length;
    acc.uniqueUsers += url.clicks.filter((click, index, self) =>
      self.findIndex(c => c.osType === click.osType && c.deviceType === click.deviceType) === index
    ).length;
    return acc;
  }, { totalClicks: 0, uniqueUsers: 0 });

  res.json({
    totalUrls: urls.length,
    totalClicks: overallStats.totalClicks,
    uniqueUsers: overallStats.uniqueUsers,
    clicksByDate: urls.reduce((acc, url) => {
      url.clicks.forEach(click => {
        const date = click.date.toISOString().split('T')[0];
        if (!acc[date]) acc[date] = 0;
        acc[date]++;
      });
      return acc;
    }, {}),
    osType: groupByOs(urls.flatMap(url => url.clicks)),
    deviceType: groupByDevice(urls.flatMap(url => url.clicks)),
  });
});


function groupByOs(clicks) {
  return clicks.reduce((acc, click) => {
    const os = click.osType;
    if (!acc[os]) acc[os] = { uniqueClicks: 0, uniqueUsers: 0 };
    acc[os].uniqueClicks++;
    acc[os].uniqueUsers++;
    return acc;
  }, {});
}


function groupByDevice(clicks) {
  return clicks.reduce((acc, click) => {
    const device = click.deviceType;
    if (!acc[device]) acc[device] = { uniqueClicks: 0, uniqueUsers: 0 };
    acc[device].uniqueClicks++;
    acc[device].uniqueUsers++;
    return acc;
  }, {});
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});
