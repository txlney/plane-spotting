import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 8080;

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('Username:', process.env.OPENSKY_USERNAME);
console.log('Password:', process.env.OPENSKY_PASSWORD);

app.use(express.static('frontend'));

app.get('/api/flights', async (req, res) => {
    try {
        const openskyUrl = 'https://opensky-network.org/api/states/all';
        const params = {
            lamin: 49.0,
            lomin: -8.0,
            lamax: 59.0,
            lomax: 2.0
        };

        const auth = {
            username: process.env.OPENSKY_USERNAME,
            password: process.env.OPENSKY_PASSWORD
        };

        const response = await axios.get(openskyUrl, { params, auth });

        const flightData = response.data.states ? response.data.states.slice(0, 10) : [];

        res.json(flightData);
    } catch (error) {
        console.error('API Error:', error.response?.status, error.response?.data);
        res.status(500).json({ error: "Failed to fetch flight data" });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
});
