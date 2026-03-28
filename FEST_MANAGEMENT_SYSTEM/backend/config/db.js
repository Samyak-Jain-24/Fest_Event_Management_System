const mongoose = require('mongoose');

/**
 * connectDB
 * Function to handle MongoDB connection establishment.
 * Uses Mongoose to connect to the configured database URI provided in environment variables.
 * Note: Exit process with failure code 1 if the connection is unsuccessful.
 */
const connectDB = async () => {
  try {
    // Attempting to establish a connection to the MongoDB cluster
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`[Database] MongoDB Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database] Connection Error: ${error.message}`);
    // Terminate the application if we cannot connect to the database
    process.exit(1);
  }
};

module.exports = connectDB;
