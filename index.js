import express from 'express';
import fetch from 'node-fetch';
import cors from "cors"
import serverless from 'serverless-http';

const app = express();

// Enable CORS for all routes and origins
app.use(cors());

// Enable JSON parsing for incoming requests
app.use(express.json());

// Proxy route to forward requests to Zendesk API
app.post('/proxy/zendesk/event', async (req, res) => {


    const { userId, eventName, eventProps, apiToken, username, zendeskUrl, source } = req.body;

    // Set up headers for the Zendesk API request
    const myHeaders = {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(`${username}/token:${apiToken}`).toString('base64'),
    };

    // Construct the request body for Zendesk API
    const raw = JSON.stringify({
        "profile": {
            "source": source || "stuffpie",
            "type": "customer",
            "identifiers": [
                {
                    "type": "external_id",
                    "value": userId
                }
            ]
        },
        "event": {
            "source": source || "stuffpie",
            "type": eventName,
            "description": eventName,
            "properties": eventProps
        }
    });

    console.log({raw})

    // Make the POST request to Zendesk API

    const zendeskResponse = await fetch(zendeskUrl, {
        method: 'POST',
        headers: myHeaders,
        body: raw
    });


    console.log({zendeskResponse , zendeskUrl})


    if (zendeskResponse.ok) {
        const result = await zendeskResponse.json();
        res.status(200).json({
            message: 'Event logged successfully',
            result
        });
    } else {
        const errorText = await zendeskResponse.text();
        res.status(zendeskResponse.status).json({
            message: 'Failed to log event',
            error: errorText
        });
    }

});



// Proxy route to forward requests dynamically
app.post('/bridge', async (req, res) => {

    const { url, method, headers, body } = req.body;

    if (!url || !method || !headers) {
        return res.status(400).json({
            message: 'url, method, and headers are required fields'
        });
    }

    try {
        // Set up headers for the proxied request
        const requestHeaders = headers;

        // Make the request to the specified URL with the given method, headers, and body
        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: method !== 'GET' ? JSON.stringify(body) : null, // Body only for non-GET requests
        });

        const responseBody = await response.text(); // Parse the response body

        if (response.ok) {
            // If the response is successful
            res.status(200).json({
                message: 'Request successful',
                response: responseBody
            });
        } else {
            // Handle errors
            res.status(response.status).json({
                message: 'Request failed',
                error: responseBody
            });
        }
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }

});

// Start the server
const PORT = process.env.PORT || 8000;


app.get("/", (req, res) => {
    res.status(200).json({
        message: 'Working!',
    });
})



app.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT}`);
});

export const handler = serverless(app);