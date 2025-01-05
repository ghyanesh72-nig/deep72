const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();

// Use the environment variable for the port, or default to 5000 for local development
const port = process.env.PORT || 5000;

// MongoDB URI
const uri = 'mongodb+srv://dsatm72:DSATM72dsatm@cluster0.8jygx.mongodb.net/studentPortfolioDB?retryWrites=true&w=majority';

// MongoDB client setup outside route handlers
let client;
let studentsCollection;
let adminCollection;

// Middleware
app.use(cors({
  origin: 'https://sites-8sp6.vercel.app',  // Only allow requests from the Vercel domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify the allowed HTTP methods (optional)
  allowedHeaders: ['Content-Type', 'Authorization'] // Specify the allowed headers (optional)
}));

// Allow preflight OPTIONS requests for all routes (important for CORS)
app.options('*', cors());

// Body parser middleware
app.use(bodyParser.json());

// Mongo connection
const connectMongoDB = async () => {
  try {
    client = new MongoClient(uri);
    await client.connect();
    studentsCollection = client.db("studentPortfolioDB").collection("students");
    adminCollection = client.db("studentPortfolioDB").collection("admin");
    console.log('MongoDB connected successfully!');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit the process if MongoDB connection fails
  }
};

// Routes
app.post('/submit-form', async (req, res) => {
  const formData = req.body;

  try {
    const result = await studentsCollection.insertOne(formData);
    res.status(200).json({ message: "Data inserted successfully", data: result });
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({ message: "Error inserting data" });
  }
});

app.get('/students', async (req, res) => {
  try {
    const students = await studentsCollection.find().toArray();
    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Error fetching data" });
  }
});

app.get('/students/:usn', async (req, res) => {
  const { usn } = req.params;

  try {
    const student = await studentsCollection.findOne({ usn });
    if (student) {
      delete student.hobbies;
      res.status(200).json(student);
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (error) {
    console.error("Error fetching student by USN:", error);
    res.status(500).json({ message: "Error fetching data" });
  }
});

app.get('/admin', async (req, res) => {
  try {
    const admin = await adminCollection.find().toArray();
    res.status(200).json(admin);
  } catch (error) {
    console.error('Error fetching admin:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Shutdown of MongoDB
process.on('SIGINT', async () => {
  console.log('Closing MongoDB connection...');
  await client.close();
  process.exit(0);
});

// Start the server after connecting to MongoDB
connectMongoDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
});

// Admin login and other routes
app.post('/admin', async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await adminCollection.findOne({ email });

    if (admin && admin.password === password) {
      const username = email.split('@')[0];
      res.status(200).json({
        success: true,
        message: 'Login successful',
        adminName: username,
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/update-student/:usn', async (req, res) => {
  const { usn } = req.params;
  const updatedData = req.body;

  try {
    const result = await studentsCollection.updateOne(
      { usn },
      { $set: updatedData }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Student not found or no changes made." });
    }

    res.status(200).json({ success: true, message: "Student data updated successfully." });
  } catch (error) {
    console.error("Error updating student data:", error);
    res.status(500).json({ success: false, message: "Error updating student data" });
  }
});

app.get('/check-usn/:usn', async (req, res) => {
  const { usn } = req.params;

  try {
    const student = await studentsCollection.findOne({ usn });
    if (student) {
      res.status(200).json({ exists: true });
    } else {
      res.status(200).json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking USN:', error);
    res.status(500).json({ message: 'Error checking USN' });
  }
});
