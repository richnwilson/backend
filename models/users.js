import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import { EncryptJWT } from 'jose';

import dotenv from 'dotenv';
dotenv.config({
    path: './.env'
});

const { SECRET_KEY }= process.env;

const usersSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true } 
}, {
    timestamps: { 
      createdAt: true, 
      updatedAt: true }, 
    versionKey: false, 
    strict: true
   });

// Hash password before saving the user document
// IMPORTANT: Since we need the 'this' object we must use standard functions and not arrow functions
usersSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return next(); // Only hash if the password field is new or has been modified
  }
  try {
    const saltRounds = 10; // The cost factor (higher is more secure but slower)
    const hashedPassword = await bcrypt.hash(this.password, saltRounds);
    this.password = hashedPassword;

  } catch (err) {
    console.log(err)    
  }
});

// statics is used when need to run method calls on the model
usersSchema.statics.findByCredentials = async function (email, password) {
  try {
    const user = await this.findOne({ email }).select({password: 1}).exec();

    if (!(user && await user.comparePassword(password))) {
        throw new Error("Invalid credentials");
    }

    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '1h' });

    // Create token that is encoded and encrypted with email
    const jwe = await new EncryptJWT({ email }) // Adding the email claim
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }) // 'dir' uses the secret directly
      .setIssuedAt()
      .encrypt( new TextEncoder().encode(SECRET_KEY)); // IMPORTANT: Must be 32 characters long

    return { token, jwe};
  } catch(e) {
    console.log(e)
  }
}

// Methods are used when just passing in properties to a returned object
usersSchema.methods.comparePassword = async function (userPassword)  {
  try {
    // Compares the provided password with the hashed password in the database
    return await bcrypt.compare(userPassword, this.password); 
  } catch (error) {
    console.log(error)
  }
};

export default mongoose.model('users', usersSchema, "users");