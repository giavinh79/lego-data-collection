const express = require('express');
const helmet = require('helmet');
const axios = require('axios');
const csv = require('csv-parser');
const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');
require('dotenv').config();

const app = express();
const port = 3030 || process.env;
app.use(helmet);
// example part 3003,Brick 2 x 2,11,1

/*
 * Script for reading Lego part CSV file, finding associated dimensions, and writing final JSON file locally/uploading to MongoDB
 * Maybe for ETL related operations like this, make an API endpoint that you can call to run these functions?
 */

const exampleObj = {
  part_num: '3003',
  name: 'Brick 2 x 2'
};

/*
 * Fallback if web scraping doesn't work or is not available
 * Typically first two #s are length x width and third # is height
 */
const parseDimensionsFromName = name => {
  let dimensionMatches = name.match(/([0-9]+.[0-9]+|[0-9]*)( |)x( |)([0-9]+.[0-9]+|[0-9]*|)*/g);
  if (dimensionMatches == null) {
    return null;
  }
  let dimensions = '';

  for (let item of dimensionMatches) {
    item = item.trim();
    dimensions += item;
  }

  let dimensionsArray = dimensions.split('x');
  if (dimensionsArray.length === 2) {
    return { width: dimensionsArray[0].trim(), length: dimensionsArray[1].trim(), height: 1 };
  } else {
    return { width: dimensionsArray[0].trim(), length: dimensionsArray[1].trim(), height: dimensionsArray[2].trim() };
  }
};

let globalPartsArray = [];
let counter = 0;

// Most units are 1.6cm
const webscrapePart = part => {
  const partObj = new Promise(async resolve => {
    try {
      const { data } = await axios.get(`https://rebrickable.com/api/v3/lego/parts/${part}/`, {
        headers: {
          Authorization: `key ${process.env.REBRICKABLE_API_KEY}`
        }
      });

      if (data.external_ids.BrickOwl) {
        request(`https://www.brickowl.com/catalog/${data.external_ids.BrickOwl[0]}`, (err, res, body) => {
          const $ = cheerio.load(body);
          let parsedDimensions = $('.even .dimseg').text();
          if (parsedDimensions.indexOf('cm') > -1) {
            parsedDimensions = $('.odd .dimseg').text();
          }

          let dimensionsObject = parseDimensionsFromName(parsedDimensions.replace(/\u00A0/g, ' '));

          if (!dimensionsObject) {
            resolve({ name: data.name, partNum: part, dimensions: null, brickOwlId: data.external_ids.BrickOwl[0] });
          } else {
            resolve({
              name: data.name,
              partNum: part,
              dimensions: dimensionsObject,
              brickOwlId: data.external_ids.BrickOwl[0]
            });
          }
        });
      } else {
        let dimensionsObject = parseDimensionsFromName(data.name);
        if (!dimensionsObject) {
          resolve({ name: data.name, partNum: part, dimensions: null });
        } else {
          resolve({ name: data.name, partNum: part, dimensions: dimensionsObject });
        }
      }
    } catch (err) {
      resolve({ name: data.name, partNum: part, dimensions: null });
    }
  });
  counter++;
  console.log(counter);
  return partObj;
};

const retrievePartData = () => {
  fs.createReadStream('./res/parts-minimal.csv')
    .pipe(csv())
    .on('data', row => {
      globalPartsArray.push(webscrapePart(row.part_num));
    })
    .on('end', async () => {
      try {
        const res = await Promise.all(globalPartsArray);
        let data = JSON.stringify(res);
        fs.writeFileSync('./res/parts.json', data);
      } catch (err) {
        console.log(err);
      }
    });
};

retrievePartData();

/*
 * Serverside Code
 */

// app.get('/', (request, response) => {
//     response.send('Hello World!');
// });

// app.listen(port, () => {
//     console.log('starting server on localhost:3030');
// });
