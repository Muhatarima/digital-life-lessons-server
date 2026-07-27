require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { toNodeHandler } = require("better-auth/node");
const { auth } = require("./lib/auth");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

async function run() {
  await client.connect();
  const db = client.db("digital-life-lessons");
  console.log("MongoDB connected");

  const lessonsCollection = db.collection("lessons");
  const usersCollection = db.collection("user");
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
      const result = await lessonsCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  // ---------- FAVORITES ----------

  app.post("/api/favorites", async (req, res) => {
    try {
      const { userId, lessonId } = req.body;
      const exists = await favoritesCollection.findOne({ userId, lessonId });
      if (exists) return res.send({ message: "Already favorited" });

      await favoritesCollection.insertOne({
        userId,
        lessonId,
        savedAt: new Date(),
      });
      await lessonsCollection.updateOne(
        { _id: new ObjectId(lessonId) },
        { $inc: { favoritesCount: 1 } }
      );
      res.send({ message: "Favorited" });
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.delete("/api/favorites/:userId/:lessonId", async (req, res) => {
    try {
      const { userId, lessonId } = req.params;
      await favoritesCollection.deleteOne({ userId, lessonId });
      await lessonsCollection.updateOne(
        { _id: new ObjectId(lessonId) },
        { $inc: { favoritesCount: -1 } }
      );
      res.send({ message: "Removed from favorites" });
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.get("/api/favorites/:userId", async (req, res) => {
    try {
      const favorites = await favoritesCollection
        .find({ userId: req.params.userId })
        .toArray();
      res.send(favorites);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  // ---------- LIKES ----------

  app.patch("/api/lessons/:id/like", async (req, res) => {
    try {
      const { userId } = req.body;
      const lesson = await lessonsCollection.findOne({
        _id: new ObjectId(req.params.id),
      });

      const alreadyLiked = lesson.likes?.includes(userId);
      const update = alreadyLiked
        ? { $pull: { likes: userId }, $inc: { likesCount: -1 } }
        : { $addToSet: { likes: userId }, $inc: { likesCount: 1 } };

      await lessonsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        update
      );
      res.send({ liked: !alreadyLiked });
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  // ---------- COMMENTS ----------

  app.post("/api/comments", async (req, res) => {
    try {
      const comment = { ...req.body, createdAt: new Date() };
      const result = await commentsCollection.insertOne(comment);
      res.status(201).send(result);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.get("/api/comments/:lessonId", async (req, res) => {
    try {
      const comments = await commentsCollection
        .find({ lessonId: req.params.lessonId })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(comments);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  // ---------- REPORTS ----------

  app.post("/api/reports", async (req, res) => {
    try {
      const report = { ...req.body, timestamp: new Date() };
      const result = await reportsCollection.insertOne(report);
      res.status(201).send(result);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  // ---------- USER STATS ----------

  app.get("/api/users/stats/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const lessonsCreated = await lessonsCollection.countDocuments({
        creatorId: userId,
      });
      const favoritesSaved = await favoritesCollection.countDocuments({
        userId,
      });
      res.send({ lessonsCreated, favoritesSaved });
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  // ---------- STRIPE ----------

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { userId, email } = req.body;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "bdt",
              product_data: {
                name: "Digital Life Lessons - Premium Lifetime",
              },
              unit_amount: 150000,
            },
            quantity: 1,
          },
        ],
        metadata: { userId },
        customer_email: email,
        success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
      });

      res.send({ url: session.url });
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.get("/api/verify-payment/:sessionId", async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        req.params.sessionId
      );
      console.log(
        "Session retrieved:",
        session.payment_status,
        session.metadata
      );

      if (session.payment_status === "paid") {
        const userId = session.metadata.userId;
        const result = await usersCollection.updateOne(
          { id: userId },
          { $set: { isPremium: true } }
        );
        console.log(
          "Update result:",
          result.matchedCount,
          result.modifiedCount
        );
        res.send({ success: true });
      } else {
        res.send({ success: false });
      }
    } catch (err) {
      console.error("Verify payment error:", err.message);
      res.status(500).send({ error: err.message });
    }
  });
}
// ---------- ADMIN ----------

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const totalUsers = await usersCollection.countDocuments();
      const totalLessons = await lessonsCollection.countDocuments({
        visibility: "Public",
      });
      const totalReported = await reportsCollection.countDocuments();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayLessons = await lessonsCollection.countDocuments({
        createdAt: { $gte: today },
      });

      res.send({ totalUsers, totalLessons, totalReported, todayLessons });
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await usersCollection.find().toArray();
      const usersWithCounts = await Promise.all(
        users.map(async (u) => {
          const lessonsCount = await lessonsCollection.countDocuments({
            creatorId: u.id,
          });
          return { ...u, lessonsCount };
        })
      );
      res.send(usersWithCounts);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.patch("/api/admin/users/:id/role", async (req, res) => {
    try {
      const { role } = req.body;
      const result = await usersCollection.updateOne(
        { id: req.params.id },
        { $set: { role } }
      );
      res.send(result);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const result = await usersCollection.deleteOne({ id: req.params.id });
      res.send(result);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.get("/api/admin/lessons", async (req, res) => {
    try {
      const lessons = await lessonsCollection
        .find()
        .sort({ createdAt: -1 })
        .toArray();
      res.send(lessons);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.patch("/api/admin/lessons/:id/feature", async (req, res) => {
    try {
      const { isFeatured } = req.body;
      const result = await lessonsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { isFeatured } }
      );
      res.send(result);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.patch("/api/admin/lessons/:id/review", async (req, res) => {
    try {
      const result = await lessonsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { isReviewed: true } }
      );
      res.send(result);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.get("/api/admin/reports", async (req, res) => {
    try {
      const reports = await reportsCollection.find().toArray();

      const grouped = {};
      for (const r of reports) {
        if (!grouped[r.lessonId]) grouped[r.lessonId] = [];
        grouped[r.lessonId].push(r);
      }

      const result = await Promise.all(
        Object.entries(grouped).map(async ([lessonId, reportsList]) => {
          const lesson = await lessonsCollection.findOne({
            _id: new ObjectId(lessonId),
          });
          return {
            lessonId,
            lessonTitle: lesson?.title || "Deleted Lesson",
            reportCount: reportsList.length,
            reports: reportsList,
          };
        })
      );

      res.send(result);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.delete("/api/admin/reports/:lessonId/ignore", async (req, res) => {
    try {
      await reportsCollection.deleteMany({ lessonId: req.params.lessonId });
      res.send({ message: "Reports cleared" });
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });
  // ---------- HOME PAGE DATA ----------

  app.get("/api/home/featured", async (req, res) => {
    try {
      const featured = await lessonsCollection
        .find({ isFeatured: true, visibility: "Public" })
        .limit(6)
        .toArray();
      res.send(featured);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.get("/api/home/top-contributors", async (req, res) => {
    try {
      const pipeline = [
        { $match: { visibility: "Public" } },
        {
          $group: {
            _id: "$creatorId",
            name: { $first: "$creatorName" },
            image: { $first: "$creatorImage" },
            lessonsCount: { $sum: 1 },
          },
        },
        { $sort: { lessonsCount: -1 } },
        { $limit: 5 },
      ];
      const contributors = await lessonsCollection
        .aggregate(pipeline)
        .toArray();
      res.send(contributors);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  app.get("/api/home/most-saved", async (req, res) => {
    try {
      const mostSaved = await lessonsCollection
        .find({ visibility: "Public" })
        .sort({ favoritesCount: -1 })
        .limit(6)
        .toArray();
      res.send(mostSaved);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

run().catch(console.error);

app.get("/", (req, res) => {
  res.send("Digital Life Lessons API is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});