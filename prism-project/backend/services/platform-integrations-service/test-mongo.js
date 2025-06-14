const mongoose = require('mongoose');

console.log('🔍 Testing MongoDB connection...');
console.log('URI:', process.env.MONGODB_URI);

mongoose.connect('mongodb+srv://prism_user:PzakMIX8E7lcMvxe@cluster0.zjzp4wh.mongodb.net/prism-platform-integrations?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => {
    console.log('✅ MongoDB connected successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  });