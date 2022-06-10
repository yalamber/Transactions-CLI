#!/usr/bin/env node

import 'dotenv/config';
import fs from 'fs';
import fetch from 'node-fetch';
import { program } from 'commander';
import { parse } from 'csv-parse';
import moment from 'moment';
import chalk from 'chalk';
import ora from 'ora';

async function getCurrentTokensPrice(tokens) {
  const res = await fetch(
    `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${tokens}&tsyms=USD`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Apikey ${process.env.CRYPTO_COMPARE_API_KEY}`,
      },
    }
  );
  const result = await res.json();
  return result;
}

async function getCurrentTokenPriceTS(token, timestamp) {
  const res = await fetch(
    `https://min-api.cryptocompare.com/data/pricehistorical?fsym=${token}&tsyms=USD&ts=${timestamp}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Apikey ${process.env.CRYPTO_COMPARE_API_KEY}`,
      },
    }
  );
  const result = await res.json();
  return result;
}

(async () => {
  const spinner = ora('Processing Transactions').start();

  // Initialize the parser
  const parser = parse({
    columns: true,
  });

  program.option('-t, --token <symbol>').option('-d, --date <date>');

  program.parse();

  const options = program.opts();

  const tokenBalances = {};

  let optDateInUnix;
  if (options.date) {
    // format date
    const dateObj = moment(options.date, 'MM-DD-YYYY', true)
      .add(23, 'hours')
      .add(59, 'minutes')
      .add(59, 'seconds');
    optDateInUnix = dateObj.unix();

    if (!dateObj.isValid()) {
      spinner.fail('Please provide valid date');
      spinner.clear();
      return;
    }
  }

  // Use the readable stream api to consume records
  parser.on('readable', function () {
    let record;
    while ((record = parser.read()) !== null) {
      if (options.token) {
        // filter only specific tokens
        if (record.token !== options.token) {
          continue;
        }
        if (optDateInUnix && optDateInUnix < record.timestamp) {
          continue;
        }
        // add current token to tokenBalances object if not available already
        if (!tokenBalances[record.token]) {
          tokenBalances[record.token] = 0;
        }
        if (record.transaction_type === 'DEPOSIT') {
          tokenBalances[record.token] =
            parseFloat(tokenBalances[record.token]) + parseFloat(record.amount);
        } else if (record.transaction_type === 'WITHDRAWL') {
          tokenBalances[record.token] =
            parseFloat(tokenBalances[record.token]) - parseFloat(record.amount);
        }
      } else {
        if (optDateInUnix && optDateInUnix < record.timestamp) {
          continue;
        }
        // check if token exists in token balances array
        if (!tokenBalances[record.token]) {
          tokenBalances[record.token] = 0;
        }
        if (record.transaction_type === 'DEPOSIT') {
          tokenBalances[record.token] =
            parseFloat(tokenBalances[record.token]) + parseFloat(record.amount);
        } else if (record.transaction_type === 'WITHDRAWL') {
          tokenBalances[record.token] =
            parseFloat(tokenBalances[record.token]) - parseFloat(record.amount);
        }
      }
    }
  });

  // Catch any error
  parser.on('error', function (err) {
    console.error('Error:', err.message);
  });

  parser.on('end', async function () {
    spinner.text = 'Processed all transactions';
    spinner.color = 'green';
    spinner.succeed();
    spinner.clear();
    // call api to get USD values
    const tokens = Object.keys(tokenBalances);
    if (!optDateInUnix) {
      const usdTokenValues = await getCurrentTokensPrice(tokens.join(','));
      for (const token in usdTokenValues) {
        console.log(
          `${chalk.yellow(token)} : $${chalk.green(
            usdTokenValues[token].USD * tokenBalances[token]
          )}`
        );
      }
    } else {
      for (const token in tokenBalances) {
        const usdTokenValues = await getCurrentTokenPriceTS(
          token,
          optDateInUnix
        );
        console.log(
          `${chalk.yellow(token)} : $${chalk.green(
            usdTokenValues[token].USD * tokenBalances[token]
          )}`
        );
      }
    }
  });

  fs.createReadStream('./data/transactions.csv').pipe(parser);
})();
