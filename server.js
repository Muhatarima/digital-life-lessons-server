require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { toNodeHandler } = require("better-auth/node");
const { auth } = require("./lib/auth");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

async function run() {
  await client.connect();
  db = client.db("digital-life-lessons");
  console.log("MongoDB connected");

  const lessonsCollection = db.collection("lessons");
  const usersCollection = db.collection("users");
  const favoritesCollection = db.collection("favorites");
  const commentsCollection = db.collection("comments");
  const reportsCollection = db.collection("lessonsReports");

  // ---------- LESSON ROUTES ----------

  app.post("/api/lessons", async (req, res) => {
    try {
      const lesson = req.body;
      lesson.likes = [];
      lesson.likesCount = 0;
      lesson.favoritesCount = 0;
      lesson.isFeatured = false;
      lesson.isReviewed = false;
      lesson.createdAt = new Date();
      lesson.updatedAt = new Date();

      const result = await lessonsCollection.insertOne(lesson);
      res.status(201).send(result);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.get("/api/lessons", async (req, res) => {
    try {
      const lessons = await lessonsCollection
        .find({ visibility: "Public" })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(lessons);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.get("/api/lessons/my/:email", async (req, res) => {
    try {
      const lessons = await lessonsCollection
        .find({ creatorEmail: req.params.email })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(lessons);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.get("/api/lessons/:id", async (req, res) => {
    try {
      const { ObjectId } = require("mongodb");
      const lesson = await lessonsCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(lesson);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.patch("/api/lessons/:id", async (req, res) => {
    try {
      const { ObjectId } = require("mongodb");
      const updateData = { ...req.body, updatedAt: new Date() };
      delete updateData._id;

      const result = await lessonsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: updateData }
      );
      res.send(result);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.delete("/api/lessons/:id", async (req, res) => {
    try {
      const { ObjectId } = require("mongodb");
      const result = await lessonsCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });
}

run().catch(console.error);

app.get("/", (req, res) => {
  res.send("Digital Life Lessons API is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});