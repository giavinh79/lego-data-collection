const inquirer = require('inquirer');
const axios = require('axios');
const csv = require('csv-parser');
const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');
require('dotenv').config();

/*
 * Script for reading Lego part CSV file, finding associated dimensions, and writing final JSON file locally/uploading to MongoDB
 * Maybe for ETL related operations like this, make an API endpoint that you can call to run these functions?
 */

let globalPartsArray = [];
let counter = 0;

/*
 * Fallback if web scraping doesn't work or is not available
 * Typically first two #s are length x width and third # is height
 */
const parseDimensionsFromName = name => {
  let dimensions = '';
  let dimensionsArray;
  let dimensionMatches = name.match(/([.0-9]+)( |)x( |)([.0-9]+)( |)x( |)([.0-9]+)|([.0-9]+)( |)x( |)([.0-9]+)/g);

  if (dimensionMatches == null) {
    return null;
  }

  for (let item of dimensionMatches) {
    dimensions += item.trim();
  }

  dimensionsArray = dimensions.split('x');
  if (dimensionsArray.length === 2) {
    return { width: dimensionsArray[0].trim(), length: dimensionsArray[1].trim(), height: 1 };
  } else {
    return { width: dimensionsArray[0].trim(), length: dimensionsArray[1].trim(), height: dimensionsArray[2].trim() };
  }
};

const webscrapePart = async part => {
  const partObj = await new Promise(async resolve => {
    try {
      let partObject = {};
      const { data } = await axios.get(`https://rebrickable.com/api/v3/lego/parts/${part}/`, {
        headers: {
          Authorization: `key ${process.env.REBRICKABLE_API_KEY}`
        }
      });

      if (data.external_ids.BrickOwl) {
        request(`https://www.brickowl.com/catalog/${data.external_ids.BrickOwl[0]}`, (err, res, body) => {
          const $ = cheerio.load(body);
          let dimensionsObject;
          let parsedDimensions = $('.even .dimseg').text();

          // Most common conversion I've seen is 1 unit = 1.6cm
          if (parsedDimensions.indexOf('cm') > -1) {
            parsedDimensions = $('.odd .dimseg').text();
          }
          console.log('wack');
          console.log(parsedDimensions);

          dimensionsObject = parseDimensionsFromName(parsedDimensions.replace(/\u00A0/g, ' ')); // replacing &nbsp char. with space

          if (!dimensionsObject) {
            resolve({
              name: data.name,
              partNum: part,
              dimensions: null,
              brickOwlId: data.external_ids.BrickOwl[0],
              partImage: data.part_img_url
            });
          } else {
            resolve({
              name: data.name,
              partNum: part,
              dimensions: dimensionsObject,
              brickOwlId: data.external_ids.BrickOwl[0],
              partImage: data.part_img_url
            });
          }
        });
      } else {
        dimensionsObject = parseDimensionsFromName(data.name);
        if (!dimensionsObject) {
          resolve({ name: data.name, partNum: part, dimensions: null, partImage: data.part_img_url });
        } else {
          resolve({ name: data.name, partNum: part, dimensions: dimensionsObject, partImage: data.part_img_url });
        }
      }
    } catch (err) {
      console.log(`Unable to generate part object [Error: ${err.message}]`);
      resolve({ part: part, error: 'ERROR' });
    }
  });
  return partObj;
};

const retrievePartData = () => {
  let csvPartsArray = [];

  fs.createReadStream('./res/parts-minimal.csv')
    .pipe(csv())
    .on('data', async row => {
      csvPartsArray.push(row.part_num);
    })
    .on('end', async () => {
      try {
        for (item of csvPartsArray) {
          globalPartsArray.push(webscrapePart(item));
          counter++;
          console.log(counter);

          // Need to delay due to API rate limiter
          await new Promise(resolve => {
            setTimeout(resolve, 700);
          });
        }

        let data = await Promise.all(globalPartsArray);
        data = JSON.stringify(data);
        fs.writeFileSync('./res/parts.json', data);
      } catch (err) {
        console.log(`Unable to generate JSON file [Error: ${err.message}]`);
      }
    });
};

// retrievePartData();

let questions = [
  {
    type: 'input',
    name: 'process'
  }
];

(startProcess = () => {
  console.log('-----------------------------------------------------------------');
  console.log('Welcome. Please enter a digit to initiate the process you desire:');
  console.log('-----------------------------------------------------------------');
  console.log('(1): Generate JSON of CSV file using Rebrickable API and web scraping BrickOwl');
  console.log('(2): Webscrape BrickOwl using .dat files (used by Ldraw programs)');
  inquirer.prompt(questions).then(answers => {
    if (answers.process == 1) {
      console.log('Starting CSV file data extraction process...');
    } else if (answers.process == 2) {
      console.log('Starting DAT file data extraction process...');
    } else {
      console.log('Exiting...');
      return;
    }
    console.log(answers);
  });
})();
