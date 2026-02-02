import express from "express";
const app = express();
import mongoose from "mongoose";
import multer from 'multer';
import { promises as fsPromises} from 'node:fs';
import { jwtDecrypt } from 'jose';
import csv from 'csvtojson';

import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);

import dotenv from 'dotenv';
dotenv.config({
    path: './.env'
});

const { URL, SECRET_KEY }= process.env;

import uploads from './models/uploads.js';
import users from './models/users.js';

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

// Allow proxy from frontend app as the Caddy request appears as internal IP
app.set('trust proxy', 1); // trust first proxy

mongoose
    .connect(URL)
    .then(() => {
        console.log("Connected to DB")
    })
    .catch((e) => {
        console.log(e)
    })

// Middleware to decrypt and protect routes
const authenticateJWE = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Missing token');

  try {
    // 1. Convert the secret string to the required Uint8Array
    const key = new TextEncoder().encode(SECRET_KEY);
    // 2. Decrypt the token
    // No need to specify 'dir' or 'A256GCM'; it reads these from the token header
    const { payload } = await jwtDecrypt(token, key);
    req.user = payload; // Contains the decrypted email
    next();
  } catch (err) {
    res.status(403).send('Invalid or expired token');
  }
};

// Register Route
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const newUser = new users({ email, password });
        await newUser.save();
        res.status(201).json({ message: "User created. Please login with new credentials" });
    } catch (err) {
        res.status(400).json({ message: "Email already exists" });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { token , jwe } = await users.findByCredentials(email, password)
        res.status(200).json({ token, jwe });
    } catch(e) {
        res.status(400).json({ message: e });
    }
});    

// Allow stored files to be accessible via browser
app.use("/uploads", express.static("uploads"))    

app.get("/", async (req,res) => {
    res.send("Success")
})

app.post("/uploadFile", authenticateJWE, upload.single("file"), async (req, res) => {
    try {
        // NOTE: Can reference req.user.email to find out who authenticated request is coming from

        const { file: { filename = ""}, body: { title = ""}} = req
        if (filename === "" || title === "") res.status(400).send("Missing fields for title or file")
        await uploads.create({title, filename})
        res.status(200).send("Upload successfully.")
    } catch(e) {
        res.status(400).send(e?.message || 'Unknown error uploading files')
    }
})

app.get("/getFiles", authenticateJWE, async (req,res) => {
    try {
        // NOTE: Can reference req.user.email to find out who authenticated request is coming from

        const data = await uploads.find({}).lean().select({_id: 0, createdAt: 0, updatedAt: 0}).exec();
        res.status(200).send({status: "ok",data})
    } catch (e) {
        res.status(400).send(e?.message || 'Unknown error trying to get files')
    }
})

app.get("/getFile/:filename",authenticateJWE, async (req,res) => {
try {
    // NOTE: Can reference req.user.email to find out who authenticated request is coming from

    const { filename = ''} = req.params;
    if (filename === "")  res.status(400).send("Missing file")

    const filePath = `./uploads/${filename}`;
    try {
        await fsPromises.access(filePath, fsPromises.constants.F_OK)  
    } catch(e) {
        throw Error ("No such file")
    }

    csv({
        colParser: {
        "X": "number",
        "Y": "number"
        }
    })
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