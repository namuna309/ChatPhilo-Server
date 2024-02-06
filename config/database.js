const { MongoClient } = require('mongodb');
const config = require('../config');

const mongodb_clusterUrl = `mongodb+srv://${config.mongodb_username}:${config.mongodb_pw}@${config.mongodb_cluster}.fdqwv6g.mongodb.net/?retryWrites=true&w=majority`;

let db;

const connectDB = async () => {
  try {
    const client = await MongoClient.connect(mongodb_clusterUrl);
    console.log('DB 연결 성공');
    db = client.db(config.mongodb_db);
  } catch (err) {
    console.error(err);
  }
};

const getDB = () => db;

module.exports = { connectDB, getDB };