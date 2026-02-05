
const { Sequelize } = require('sequelize');

const db = new Sequelize('connectub', 'root', 'qazwsxedc1235', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false, 
});


async function testConnection() {
  try {
    await db.authenticate();
    console.log('✅ Connected to MySQL with Sequelize!');
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
}

testConnection();

module.exports = db;