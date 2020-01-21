# lego-ml-backend
### Background
Script for converting a Lego parts CSV file into a JSON file with image and dimensions data.

### Set Up
Go to root directory and do a 'npm install'. 

Make a .env file and add the following (or your own Rebrickable API key value): REBRICKABLE_API_KEY=7addbf95da45e0dfa60b9c069c38b8a5

### Running
In the root directory, do 'node index.js' in the terminal.

### Notes
For development, do 'nodemon index.js' instead for hot reload on save.

The API call to Rebrickable may fail due to their rate limiter (will be in the logs): in this case increase the delay function or split the CSV file into smaller chunks.
