import express from "express";
const app = express();
import mongoose from "mongoose";
import multer from 'multer';

import uploads from './models/uploads.js'

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now()
    cb(null, `${uniqueSuffix}${file.originalname}`)
  }
})

const upload = multer({ storage: storage })

app.use(express.json());
import cors from "cors";
app.use(cors());

import dotenv from 'dotenv';
dotenv.config({
    path: './.env'
});

const { URL }= process.env;

mongoose
    .connect(URL)
    .then(() => {
        console.log("Connected to DB")
    })
    .catch((e) => {
        console.log(e)
    })


app.get("/", async (req,res) => {
    res.send("Success")
})

app.post("/uploadFile", upload.single("file"), async (req, res) => {
    try {
        const { file: { filename = ""}, body: { title = ""}} = req
        if (filename === "" || title === "") res.status(400).send("Missing fields for title or file")
        await uploads.create({title, filename})
        res.status(200).send("Upload successfully.")
    } catch(e) {
        res.status(400).send(e?.message || 'Unknown error')
    }
})

// handle undefined Routes
app.use((req, res, next) => {
  res.status(404).send(`Undefined route ${req.originalUrl}`);
});

app.listen(5000, () => {
    console.log("Server started")
})