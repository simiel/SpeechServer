# SpeechServer

SpeechServer is a Node.js HTTP service that answers a spoken question with spoken audio. A caller uploads an audio file; the server transcribes it with OpenAI Whisper, generates a reply with GPT-3.5-turbo, and returns that reply as MP3 from OpenAI text-to-speech. The reply is written for Ghanaian adolescents who are visually or hearing impaired and stays within adolescent sexual and reproductive health. This repository is that HTTP service, meant to be called by other programs.

**Author:** [Samuel Mensah](https://github.com/simiel)

## Features

- **Voice in, voice out.** `POST /audio` accepts one multipart upload in the `audio` field and responds with `audio/mpeg`.
- **Whisper transcription.** The saved upload is sent to `whisper-1` as a file stream, requesting `verbose_json` and word-level timestamps. The chat step receives the transcript text.
- **Domain-constrained answers.** `gpt-3.5-turbo` is called with a system prompt that asks for information that is safe, concise, precise, relevant, age-appropriate, and culturally acceptable for Ghanaian adolescents who are visually or hearing impaired. The same prompt tells the model to decline, politely, questions that seek a response that sympathizes with, advocates, encourages, promotes, justifies, campaigns for, or supports LGBTQ+ topics, and to direct the asker to a Ghanaian adolescent information and counselling body.
- **Speech synthesis.** The generated text is spoken with `tts-1` and the `alloy` voice. The MP3 bytes are the HTTP response body, with `Content-Type` and `Content-Length` set.
- **Explicit failure responses.** A missing file returns `400` and the text `No file uploaded.` Failures from transcription, chat, or speech synthesis return `500` and `{ "error": "Something went wrong" }`.

The transcript and word timestamps are logged on the server. Callers receive the MP3 only.

## Tech stack

- **Runtime:** Node.js, CommonJS (`require`)
- **HTTP:** [Express](https://expressjs.com/) 4
- **Uploads:** [Multer](https://github.com/expressjs/multer) disk storage
- **Models:** [OpenAI Node SDK](https://github.com/openai/openai-node) 4 — Whisper (`whisper-1`), Chat Completions (`gpt-3.5-turbo`), and speech (`tts-1`)
- **Configuration:** [dotenv](https://github.com/motdotla/dotenv)
- **Middleware also mounted:** [cors](https://github.com/expressjs/cors) (all origins) and [body-parser](https://github.com/expressjs/body-parser) JSON parsing

`package.json` still lists `axios`, `buffer-to-stream`, `readable-stream`, and the npm `fs` package from earlier drafts of the server. `index.js` reads files with Node's built-in `fs` module.

## Architecture

One process handles the whole pipeline. All of the request logic is in `index.js`.

```
client  -- POST /audio (multipart field "audio") -->  Express
                                                        |
                                                        | Multer writes the file under uploads/
                                                        v
                                                whisper-1 transcription
                                                        |
                                                        v
                                                gpt-3.5-turbo
                                                (system prompt + transcript)
                                                        |
                                                        v
                                                tts-1 speech (voice: alloy)
                                                        |
client  <-- audio/mpeg --------------------------------+
```

| Path | Role |
| --- | --- |
| `index.js` | Express app, Multer setup, and the transcribe → answer → speak pipeline |
| `package.json` | Package metadata, dependencies, and the `start` and `test` scripts |
| `package-lock.json` | Locked dependency tree |
| `uploads/` | Directory Multer writes incoming audio into. The directory has to exist before an upload succeeds. |
| `.gitignore` | Ignores `node_modules/` and `.env` |

The process listens on `process.env.PORT`, or port `3000` when `PORT` is unset. Each request logs the saved path, the transcript, and the generated text to stdout.

## Getting started

### Prerequisites

- Node.js and npm
- An OpenAI API key that can call the Whisper, chat, and speech models named above

### Install

```bash
npm install
```

### Environment variables

Put these in a `.env` file in the project root. The file is gitignored. Set values locally; none are stored in the repository.

| Name | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | Passed to the OpenAI client |
| `PORT` | No | Port the server listens on. Defaults to `3000` |

### Run

```bash
npm start
```

`npm start` runs `node index.js`. On startup the process prints `Server listening on port <port>`.

`uploads/` is already in the repository. Multer writes into that directory, so it has to be present when the server starts.

Example request (the response body is an MP3):

```bash
curl -sS -X POST "http://localhost:3000/audio" \
  -F "audio=@/path/to/question.m4a" \
  --output reply.mp3
```

The form field name is `audio`. The server stores the single uploaded file as Multer receives it and does not check MIME type.

### Tests and build

`package.json` defines `start` and `test`. There is no build script. `npm test` is the default npm placeholder:

```bash
echo "Error: no test specified" && exit 1
```

It exits with status 1. There is no test suite to run.

## Project status

Prototype. The server was written as a single file in August 2024 (commits on 1 August 2024). This repository contains the API process.

## What this demonstrates

- A full speech loop behind one endpoint: multipart upload, speech-to-text, a constrained completion, and text-to-speech returned as audio with an explicit content type and length.
- Use of the OpenAI Node SDK across three APIs in a single request — Whisper (`whisper-1`, verbose JSON with word timestamps), Chat Completions (`gpt-3.5-turbo`), and speech (`tts-1`, `alloy`) — including passing a filesystem stream of the saved upload into transcription.
- Express file handling with Multer disk storage, CORS enabled for cross-origin callers, and environment-based configuration of the API key and listen port.
- Prompt design that fixes both the audience (Ghanaian adolescents who are visually or hearing impaired) and the subject (adolescent sexual and reproductive health), including an explicit redirect for questions the prompt places outside that scope.

## License

ISC (`package.json`).
