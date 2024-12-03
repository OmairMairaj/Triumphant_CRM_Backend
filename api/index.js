const serverless = require('serverless-http');
const app = require('../server'); // Import the exported Express app from server.js

module.exports = serverless(app);
