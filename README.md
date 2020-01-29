# Lego Data Collection

### Background

Web-scraping and API hitting scripts written in Node.js to extract Lego part data and output corresponding JSON files.

(1) Script for converting a Lego parts CSV file into a JSON file with image and dimensions data.

(2) Script for reading in DAT files and using the embedded name data to web-scrape for corresponding dimensions online.

### Set Up

Go to root directory and do 'npm install'.

Make a .env file and add your own Rebrickable API key value: REBRICKABLE_API_KEY={some value}

### Running

In the root directory, run 'node index.js' in the terminal. Follow CL instructions.

### Notes

For development, do 'nodemon index.js' instead for hot reload on save.

The API call to Rebrickable may fail due to their rate limiter (will be in the logs): in this case increase the delay function or split the CSV file into smaller chunks.
