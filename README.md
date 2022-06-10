# Steps to setup and run the script

- clone this repo
- npm install
- copy .env.sample file to .env
- copy transactions.csv file inside data folder

# script arguments

    - token (-t, --token <tokenName>)
    - date (-d, --date <date>) date in MM-DD-YYYY format

# How to run script

- Given no parameters, return the latest portfolio value per token in USD
  `node index.js`
- Given a token, return the latest portfolio value for that token in USD
  `node index.js -t BTC`
- Given a date, return the portfolio value per token in USD on that date
  `node index.js -d 12-12-2018` date should be in MM-DD-YYYY format
- Given a date and a token, return the portfolio value of that token in USD on that date
  `node index.js -t BTC -d 12-12-2018` date should be in MM-DD-YYYY format

# Design decision

For this script I used streaming csv parser provided by `csv-parse` module. and all calculations were done per row so that we would not use up a lot of memory and our program is memory efficient.
Added `ora` module to show progress bar in cli for user experience
