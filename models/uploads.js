import mongoose from "mongoose";

const uploadsSchema = new mongoose.Schema({
  title: String,
  filename: String
}, {
    timestamps: { 
      createdAt: true, 
      updatedAt: true }, 
    versionKey: false, 
    strict: true
   }
);

// Index to improve performance
uploadsSchema.index({_virtual: -1});

export default mongoose.model("uploads", uploadsSchema, "uploads");