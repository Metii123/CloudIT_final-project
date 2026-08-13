const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const NO_ID = { projection: { _id: 0 } };

let events;
let registrations;

app.get("/healthz", (req, res) => {
  res.status(events ? 200 : 503).json({ status: events ? "ok" : "starting" });
});

app.get("/api/events", async (req, res, next) => {
  try {
    res.json(await events.find({}, NO_ID).toArray());
  } catch (err) {
    next(err);
  }
});


app.get("/api/events/:id", async (req, res, next) => {
  try {
    const event = await events.findOne({ id: req.params.id }, NO_ID);
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    next(err);

  }
});


app.post("/api/events", async (req, res, next) => {
  try {
    const event = {
      id: "evt-" + Date.now(),
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      department: req.body.department,
      date: req.body.date,
      time: req.body.time,
      location: req.body.location,
      capacity: Number(req.body.capacity),
      organizerId: req.body.organizerId || "org-1"
    };
    if (!event.title || !event.date) {
      return res.status(400).json({ error: "title and date are required" });
    }
    await events.insertOne({ ...event });
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

app.put("/api/events/:id", async (req, res, next) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    delete updates._id;
    if (updates.capacity !== undefined) updates.capacity = Number(updates.capacity);

    const updated = await events.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { returnDocument: "after", projection: { _id: 0 } }
    );
    const doc = updated && (updated.value || updated);
    if (!doc || !doc.id) return res.status(404).json({ error: "Event not found" });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/events/:id", async (req, res, next) => {
  try {
    const result = await events.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Event not found" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.get("/api/registrations", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.eventId) filter.eventId = req.query.eventId;
    if (req.query.status) filter.status = req.query.status;
    res.json(await registrations.find(filter, NO_ID).toArray());
  } catch (err) {
    next(err);
  }
});

app.post("/api/registrations", async (req, res, next) => {
  try {
    const { eventId, studentName, studentEmail } = req.body;
    if (!eventId || !studentName || !studentEmail) {
      return res.status(400).json({ error: "eventId, studentName and studentEmail are required" });
    }
    const registration = {
      id: "reg-" + Date.now(),
      eventId,
      studentName,
      studentEmail,
      notes: req.body.notes || "",
      status: "registered",
      registeredAt: new Date().toISOString()
    };

    await registrations.insertOne({ ...registration });
    res.status(201).json(registration);
  } catch (err) {
    next(err);
  }
});

app.patch("/api/registrations/:id", async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }
    const updated = await registrations.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { returnDocument: "after", projection: { _id: 0 } }
    );
    const doc = updated && (updated.value || updated);
    if (!doc || !doc.id) return res.status(404).json({ error: "Registration not found" });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/registrations/:id", async (req, res, next) => {
  try {
    const result = await registrations.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Registration not found" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.post("/api/reset", async (req, res, next) => {
  try {
    await registrations.deleteMany({});
    await events.deleteMany({});
    await seed();
    res.json({ reset: true });
  } catch (err) {
    next(err);
  }
});


app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: "Internal server error" });
});

async function seed() {
  if ((await events.countDocuments()) > 0) return;
  const file = path.join(__dirname, "exampleEvents.json");

  
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  await events.insertMany(data.map((e) => ({ ...e })));
}

async function connect() {
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      return client.db("campusevents");
    } catch (err) {
      console.error(`mongo attempt ${attempt}: ${err.message}`);
      if (attempt === 15) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}


connect()
  .then(async (db) => {
    events = db.collection("events");
    registrations = db.collection("registrations");
    await seed();
    app.listen(PORT, () => console.log("backend listening on " + PORT));
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
