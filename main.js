const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');

async function startServer() {
    // Create an instance of Express
    const app = express();

    // Set up connection URI
    const uri =
        'mongodb+srv://userReadOnly:7ZT817O8ejDfhnBM@minichallenge.q4nve1r.mongodb.net/';
    const client = new MongoClient(uri);

    // Middleware for parsing JSON bodies
    app.use(bodyParser.json());

    try {
        await client.connect();
    } catch (e) {
        console.error(e);
    }

    // Function to retrieve flights based on departure date, return date and destination city
    async function getFlights(departureDate, returnDate, destination) {
        try {
            const dbo = client.db('minichallenge');
            const flightsCollection = dbo.collection('flights');

            // Convert to Date
            const departureDateConverted = new Date(departureDate);
            const returnDateConverted = new Date(returnDate);

            const flights = await flightsCollection
                .find({
                    $or: [
                        { srccity: "Singapore", destcity: destination, date: departureDateConverted },
                        { srccity: destination, destcity: "Singapore", date: returnDateConverted }
                    ]
                })
                .sort({ price: 1 })
                .toArray();

            const departureFlight = flights.find(flight => flight.srccity === "Singapore");
            const returnFlight = flights.find(flight => flight.destcity === "Singapore");

            const departureFlights = flights.filter(flight => flight.srccity === "Singapore");
            const returnFlights = flights.filter(flight => flight.destcity === "Singapore");

            const zippedFlights = departureFlights.map((departureFlight, index) => ({
                'City': destination,
                'Departure Date': departureDate,
                'Departure Airline': departureFlight.airlinename,
                'Departure Price': departureFlight.price,
                'Return Date': returnDate,
                'Return Airline': returnFlights[index].airlinename,
                'Return Price': returnFlights[index].price
            }));

            const response = zippedFlights.sort((a, b) => a['Return Price'] - b['Return Price']);
            // console.log(response);

            return response;

        } catch (error) {
            console.error(error);
        }
    }

    // Function to retrieve hotels based on check-in date, check-out date and destination city
    async function getHotels(checkInDate, checkOutDate, destination) {
        try {
            const dbo = client.db('minichallenge');
            const hotelCollection = dbo.collection('hotels');

            const query = {
                city: destination,
                date: { $gte: new Date(checkInDate), $lte: new Date(checkOutDate) }
            };

            const hotels = await hotelCollection
                .aggregate([
                    {
                        $match: query
                    },
                    {
                        $group: {
                            _id: "$hotelName",
                            totalPrice: { $sum: "$price" }
                        }
                    },
                    {
                        $project: {
                            _id: 0, // Exclude the _id field
                            "City": destination,
                            "Check In Date": checkInDate,
                            "Check Out Date": checkOutDate,
                            "Hotel": "$_id",
                            "Price": "$totalPrice"
                        }
                    }
                ])
                .sort({ Price: 1 })
                .toArray();

            // console.log(hotels);
            return hotels;

        } catch (error) {
            console.error(error);
        }
    }

    // GET /flight - Get a list of return flights at the cheapest price, given the destination city, departure date, and arrival date
    app.get('/flight', async (req, res) => {
        const { departureDate, returnDate, destination } = req.query;

        const dateFormat = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

        if (new Date(departureDate) >= new Date(returnDate)) {
            return res.status(400).json({ error: 'Invalid date range' });
        }

        if (!departureDate || !returnDate || !destination) {
            return res.status(400).json({ error: 'Missing query parameters' });
        }

        if (!dateFormat.test(departureDate) || !dateFormat.test(returnDate)) {
            return res.status(400).json({ error: 'Date format is incorrect' });
        }

        const flights = await getFlights(departureDate, returnDate, destination);
        return res.json(flights);
    });

    // GET /hotel - Get a list of hotels providing the cheapest price, given the destination city, check-in date, and check-out date.
    app.get('/hotel', async (req, res) => {
        const { checkInDate, checkOutDate, destination } = req.query;

        const dateFormat = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

        if (new Date(checkInDate) >= new Date(checkOutDate)) {
            return res.status(400).json({ error: 'Invalid date range' });
        }

        if (!checkInDate || !checkOutDate || !destination) {
            return res.status(400).json({ error: 'Missing query parameters' });
        }

        if (!dateFormat.test(checkInDate) || !dateFormat.test(checkOutDate)) {
            return res.status(400).json({ error: 'Date format is incorrect' });
        }

        const hotels = await getHotels(checkInDate, checkOutDate, destination);
        return res.json(hotels);
    });


    app.listen(8080, () => {
        console.log(`Server is running on port 8080`);
    });

}

startServer();