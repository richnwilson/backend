import mongoose from "mongoose";
import bcrypt from "bcrypt";

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

usersSchema.methods.comparePassword = async function (userPassword) {
  // Compares the provided password with the hashed password in the database
  return await bcrypt.compare(userPassword, this.password);
};

export default mongoose.model('users', usersSchema, "users");