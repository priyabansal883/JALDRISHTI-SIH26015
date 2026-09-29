const dotenv = require("dotenv");

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const connectDB = require("./config/db");

dotenv.config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: "Database not connected. Please try again later.",
      status: "database_error"
    });
  }
  next();
});

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const surveyRoutes = require("./routes/surveyRoutes");
const photoRoutes = require("./routes/photoRoutes");
const satelliteRoutes = require("./routes/satelliteRoutes");
const alertRoutes =require("./routes/alertRoutes");
const taskRoutes = require("./routes/taskRoutes");
app.use("/api/users", require("./routes/userRoutes"));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/surveys", surveyRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/satellite", satelliteRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/tasks", taskRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "JalDrishti Backend is running 🚀",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});