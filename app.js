import express from "express";
const app = express();
import mongoose from "mongoose";
import multer from 'multer';
import { promises as fsPromises} from 'node:fs';

import csv from 'csvtojson';

import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Middleware to parse raw body as text
app.use(express.text({ type: 'text/csv' }));

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


// Allow stored files to be accessible via browser
app.use("/uploads", express.static("uploads"))    

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
        res.status(400).send(e?.message || 'Unknown error uploading files')
    }
})

app.get("/getFiles", async (req,res) => {
    try {
        const data = await uploads.find({}).lean().select({_id: 0, createdAt: 0, updatedAt: 0}).exec();
        res.status(200).send({status: "ok",data})
    } catch (e) {
        res.status(400).send(e?.message || 'Unknown error trying to get files')
    }
})

app.get("/getFile/:filename", async (req,res) => {
try {
    const { filename = ''} = req.params;
    if (filename === "")  res.status(400).send("Missing file")

    const filePath = `./uploads/${filename}`;
    try {
        await fsPromises.access(filePath, fsPromises.constants.F_OK)  
    } catch(e) {
        throw Error ("No such file")
    }

    csv()
    .fromFile(filePath)
    .then((jsonObj) => {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send({status: "ok", data: JSON.stringify(jsonObj)});
    })
} catch (e) {
    res.status(400).send(e?.message || 'Unknown error trying to get file')
}
})

// handle undefined Routes
app.use((req, res, next) => {
  res.status(404).send(`Undefined route ${req.originalUrl}`);
});

app.listen(5000, () => {
    console.log("Server started")
})