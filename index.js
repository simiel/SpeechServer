const express = require("express");
const multer = require("multer");
const openai = require("openai");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const bufferToStream = require("buffer-to-stream");
const { Readable } = require("readable-stream");
const fs = require("fs");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Specify the directory to save the file
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Specify the file name
  },
});
const upload = multer({ storage });

// OpenAI configuration
const openAi = new openai({ apiKey: process.env.OPENAI_API_KEY });

// CORS middleware
app.use(cors());
app.use(bodyParser.json());

app.post("/audio", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  try {
    console.log("🚀 ~ app.post ~ req.file.path:", req.file.path);
    const response = await openAi.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });
    const transcript = response.text;
    console.log("🚀 ~ app.post ~ transcript:", transcript);

    // Generate text using ChatGPT
    const chatCompletion = await openAi.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: transcript }],
    });
    const generatedText = chatCompletion.choices[0].message.content;
    console.log("🚀 ~ app.post ~ generatedText:", generatedText);

    const mp3 = await openAi.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: generatedText,
    });
    console.log("🚀 ~ app.post ~ mp3:", mp3);

    // // Send the mp3 to the client
    // const mp3Data = Buffer.from(mp3.data);
    // res.writeHead(200, {
    //   "Content-Type": "audio/mpeg",
    //   "Content-Length": mp3Data.length,
    // });
    // res.end(mp3Data);

    // save the mp3 to a file
    const buffer = Buffer.from(await mp3.arrayBuffer());
    // const filePath = `./uploads/${Date.now()}-${req.file.originalname}.mp3`;
    // fs.writeFileSync(filePath, buffer);

    // Send the mp3 to the client
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
