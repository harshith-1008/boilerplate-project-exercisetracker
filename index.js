const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const { URL } = require("url");
const path = require("path");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGODB_URI);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
});

const exerciseSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.post("/api/users", async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "username must be provided" });
  }

  try {
    const newUser = new User({
      username,
    });
    const savedUser = await newUser.save();
    res.status(201).json({
      username: savedUser.username,
      _id: savedUser._id,
    });
  } catch (error) {
    res.status(500).json({ error: "error creating user" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}).select("-__v");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Error fetching users" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res
      .status(400)
      .json({ error: "Description and duration are required" });
  }

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newExercise = new Exercise({
      userId: _id,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    const savedExercise = await newExercise.save();

    res.status(201).json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: savedExercise._id,
    });
  } catch (error) {
    res.status(500).json({ error: "Error adding exercise" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let dateFilter = {};
    if (from || to) {
      dateFilter.date = {};
      if (from) dateFilter.date.$gte = new Date(from);
      if (to) dateFilter.date.$lte = new Date(to);
    }

    const exercises = await Exercise.find({ userId: _id, ...dateFilter })
      .limit(parseInt(limit) || 500)
      .exec();

    res.status(200).json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map((exercise) => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching logs" });
  }
});

const listener = app.listen(port, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
