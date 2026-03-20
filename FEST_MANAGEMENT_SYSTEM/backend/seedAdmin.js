require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@felicity.com' });
    
    if (existingAdmin) {
      console.log('Admin already exists!');
      console.log('Email: admin@felicity.com');
      process.exit(0);
    }

    // Create admin account
    const admin = await Admin.create({
      email: 'admin@felicity.com',
      password: 'admin123',
      role: 'admin',
    });

    console.log('✅ Admin account created successfully!');
    console.log('==========================================');
    console.log('Email: admin@felicity.com');
    console.log('Password: admin123');
    console.log('==========================================');
    console.log('⚠️  Please change this password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
