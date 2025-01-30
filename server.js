// server.js
import express from 'express';
import { connect, Schema, model } from 'mongoose';
import cors from 'cors';
import bodyparser from 'body-parser';

const app = express();

// Middleware
app.use(cors());
app.use(bodyparser.json());

// MongoDB connection
connect('mongodb+srv://harihareshwar08:h12@cluster0.7kphm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Favourite Schema
const favouriteSchema = new Schema({
  username: String,
  email: String,
  bookIds: [String]
});

const Favourite = model('Favourite', favouriteSchema);

// Reading List Schema
const readingListSchema = new Schema({
  username: String,
  email: String,
  books: [{
    bookId: String,
    status: String, // 'reading' or 'completed'
    progress: Number,
    pagesRead: Number,
    bookData: Object // Store all book data
  }]
});

const ReadingList = model('ReadingList', readingListSchema);

// Route for adding books to favorites
app.post('/add-favourite', async (req, res) => {
  const { username, email, bookId } = req.body;

  try {
    let userFav = await Favourite.findOne({ username, email });

    if (!userFav) {
      userFav = new Favourite({
        username,
        email,
        bookIds: [bookId]
      });
    } else {
      if (!userFav.bookIds.includes(bookId)) {
        userFav.bookIds.push(bookId);
      } else {
        return res.status(400).json({ message: 'Book already in favourites' });
      }
    }

    await userFav.save();
    res.status(200).json({ message: 'Book added to favourites' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding to favourites' });
  }
});

// Route for retrieving user's favourite books
app.get('/favourites/:username/:email', async (req, res) => {
  const { username, email } = req.params;

  try {
    const userFav = await Favourite.findOne({ username, email });

    if (userFav) {
      res.status(200).json({ favourites: userFav.bookIds });
    } else {
      res.status(200).json({ favourites: [] });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving favourites' });
  }
});

// Route for removing a book from favorites
app.delete('/remove-favourite', async (req, res) => {
  const { email, bookId } = req.body;

  try {
    const userFav = await Favourite.findOne({ email });

    if (!userFav) {
      return res.status(404).json({ message: 'User favorites not found' });
    }

    userFav.bookIds = userFav.bookIds.filter(id => id !== bookId);
    await userFav.save();

    res.status(200).json({ message: 'Book removed from favourites' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error removing from favourites' });
  }
});

// Reading List Routes
app.post('/reading-list/add', async (req, res) => {
  const { username, email, book, status } = req.body;

  try {
    let userReadingList = await ReadingList.findOne({ username, email });

    if (!userReadingList) {
      userReadingList = new ReadingList({
        username,
        email,
        books: []
      });
    }

    const existingBookIndex = userReadingList.books.findIndex(b => b.bookId === book.id);
    
    if (existingBookIndex >= 0) {
      userReadingList.books[existingBookIndex] = {
        bookId: book.id,
        status,
        progress: 0,
        pagesRead: 0,
        bookData: book
      };
    } else {
      userReadingList.books.push({
        bookId: book.id,
        status,
        progress: 0,
        pagesRead: 0,
        bookData: book
      });
    }

    await userReadingList.save();
    res.status(200).json({ message: 'Book added to reading list' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding to reading list' });
  }
});

app.get('/reading-list/:username/:email', async (req, res) => {
  const { username, email } = req.params;

  try {
    const userReadingList = await ReadingList.findOne({ username, email });
    res.status(200).json({ readingList: userReadingList?.books || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving reading list' });
  }
});

app.put('/reading-list/update-progress', async (req, res) => {
  const { email, bookId, pagesRead, progress } = req.body;

  try {
    const userReadingList = await ReadingList.findOne({ email });
    if (!userReadingList) {
      return res.status(404).json({ message: 'Reading list not found' });
    }

    const bookIndex = userReadingList.books.findIndex(b => b.bookId === bookId);
    if (bookIndex >= 0) {
      userReadingList.books[bookIndex].pagesRead = pagesRead;
      userReadingList.books[bookIndex].progress = progress;
    }

    await userReadingList.save();
    res.status(200).json({ message: 'Progress updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating progress' });
  }
});

app.put('/reading-list/mark-completed', async (req, res) => {
  const { email, bookId } = req.body;

  try {
    const userReadingList = await ReadingList.findOne({ email });
    if (!userReadingList) {
      return res.status(404).json({ message: 'Reading list not found' });
    }

    const bookIndex = userReadingList.books.findIndex(b => b.bookId === bookId);
    if (bookIndex >= 0) {
      userReadingList.books[bookIndex].status = 'completed';
      userReadingList.books[bookIndex].progress = 100;
      userReadingList.books[bookIndex].pagesRead = 
        userReadingList.books[bookIndex].bookData.volumeInfo.pageCount;
    }

    await userReadingList.save();
    res.status(200).json({ message: 'Book marked as completed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error marking book as completed' });
  }
});

app.delete('/reading-list/remove', async (req, res) => {
  const { email, bookId } = req.body;

  try {
    const userReadingList = await ReadingList.findOne({ email });
    if (!userReadingList) {
      return res.status(404).json({ message: 'Reading list not found' });
    }

    userReadingList.books = userReadingList.books.filter(b => b.bookId !== bookId);
    await userReadingList.save();

    res.status(200).json({ message: 'Book removed from reading list' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error removing from reading list' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
