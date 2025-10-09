const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Salesforce License Utilization Backend...\n');

// Create .env file from .env.example if it doesn't exist
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from .env.example');
  } else {
    console.log('❌ .env.example file not found');
  }
} else {
  console.log('ℹ️  .env file already exists');
}

console.log('\n📋 Next Steps:');
console.log('1. Update the .env file with your configuration:');
console.log('   - Database URLs (PostgreSQL and Redis)');
console.log('   - Salesforce Connected App credentials');
console.log('   - JWT and session secrets');

console.log('\n2. Set up your databases:');
console.log('   - Create PostgreSQL database');
console.log('   - Run the schema: psql -d your_db < database/schema.sql');
console.log('   - Start Redis server');

console.log('\n3. Configure Salesforce Connected App:');
console.log('   - Create a Connected App in Salesforce Setup');
console.log('   - Enable OAuth settings');
console.log('   - Set callback URL to: http://localhost:3001/api/auth/salesforce/callback');
console.log('   - Enable required scopes: api, id, web, refresh_token');

console.log('\n4. Start the development server:');
console.log('   - npm run dev');

console.log('\n🔗 Useful URLs:');
console.log('   - API Health Check: http://localhost:3001/health');
console.log('   - Auth Status: http://localhost:3001/api/auth/status');
console.log('   - Salesforce Login: http://localhost:3001/api/auth/salesforce');

console.log('\n✨ Setup completed! Happy coding! ✨\n');