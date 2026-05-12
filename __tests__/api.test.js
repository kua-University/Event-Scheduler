const request = require('supertest');
const app = require('../server'); // we will export app from server.js

test('GET /health returns status OK', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('OK');
});