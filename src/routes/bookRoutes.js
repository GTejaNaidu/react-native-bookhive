import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Book from "../models/Book.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();
//post
router.post("/", protectRoute, async (req,res) => {

    try {

       const { title, caption, rating, image} = req.body;

       if (!image || !title || !caption || !rating) {
        return res.status(400).json({message: "Please provide all fields"});
       }

       //upload the image to cloudinary
       const UploadResponse = await cloudinary.uploader.upload(image);
       const imageUrl = UploadResponse.secure_url

       //save to the database
       const newBook = new Book({
        title,
        caption,
        rating,
        image: imageUrl,
        user: req.user._id,
       });
        
      await newBook.save()

      res.status(201).json(newBook)


    } catch (error) {
        console.log("Error creating book", error);
        res.status(500).json({ message: error.message });
        
    }
});

//get
// pagination => infinite loading
router.get("/", protectRoute, async (req, res) => {
   
   //example call from react native - frontend
    //const response = await fetch("http://localhost:3000/api/books?page=1&limit=5");
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 5;
      const skip = (page - 1) * limit;
  
      const books = await Book.find()
        .sort({ createdAt: -1 }) // descending order by creation date
        .skip(skip)
        .limit(limit)
        .populate("user", "username profileImage");
  
     const totalBooks = await Book.countDocuments();
     
        res.send({
        books,
        currentPage: page,
        totalBooks,
        totalPages: Math.ceil(totalBooks / limit),
      });
    } catch (error) {
      console.log("Error in get all books route", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });


// Get recommended books by the logged-in user
router.get("/user", protectRoute, async (req, res) => {
    try {
      // Find all books created by the logged-in user and sort them by newest first
      const books = await Book.find({ user: req.user._id }).sort({ createdAt: -1 });
  
      // Send the books as JSON response
      res.json(books);
    } catch (error) {
      console.error("Get user books error:", error.message);
      
      // Send a 500 server error response if something goes wrong
      res.status(500).json({ message: "Server error" });
    }
  });
  


//Delete
  router.delete("/:id", protectRoute, async (req, res) => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ message: "Book not found" });
  
      // check if user is the creator of the book
      if (book.user.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
  
      // Example Cloudinary image URL format:
// https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/public_id.png

// Delete image from Cloudinary as well
if (book.image && book.image.includes("cloudinary")) {
    try {
      // Extract the public ID from the image URL
      const publicId = book.image.split("/").pop().split(".")[0];
  
      // Call Cloudinary's destroy method to delete the image by public ID
      await cloudinary.uploader.destroy(publicId);
    } catch (deleteError) {
      console.log("Error deleting image from cloudinary", deleteError);
    }
  }
  
      await book.deleteOne();
  
      res.json({ message: "Book deleted successfully" });
    } catch (error) {
      console.log("Error deleting book", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  

export default router;