//1. Import coingecko-api
const CoinGecko = require('coingecko-api');
const mysql = require('mysql2');
const winston = require('winston');
const cron = require('node-cron');
const util = require('util');
require('winston-daily-rotate-file');

// require config env variables for application to run
const config = require('./config.json')
const environment = process.env.NODE_ENV || 'development';
const defaultConfig = config[environment];

// winston log rotator settings
const appLogRotator = new (winston.transports.DailyRotateFile)({
	filename: 'logs/app-%DATE%.log',
	datePattern: 'YYYY-MM-DD',
	zippedArchive: true,
	maxSize: '20m',
	maxFiles: '90d'
});

const exceptionsLogRotator = new (winston.transports.DailyRotateFile)({
	filename: 'logs/exceptions-%DATE%.log',
	datePattern: 'YYYY-MM-DD',
	zippedArchive: true,
	maxSize: '20m'
});

// create logger
const logger  = winston.createLogger({
	level: defaultConfig['logLevel'],
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json()
	),
	transports: [
		//
		// - Write to all logs with level `info` and below to `combined.log` 
		// - Write all logs error (and below) to `error.log`.
		//
		new winston.transports.File({ filename: './logs/error.log', level: 'error', format: winston.format.errors()}),
		appLogRotator
	],
	exceptionHandlers: [
		exceptionsLogRotator
	],
	exitOnError: false
});


// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
  	level: 'info',
  	format: winston.format.combine(
  		winston.format.colorize(),
  		winston.format.simple()
  	),
  	handleExceptions: true
  }));
}


//2. Initiate the CoinGecko API Client
const CoinGeckoClient = new CoinGecko();

// 3. Make exchange calls
// getTvevRatio("binancecoin", 'binance')
let dbPool;
// logger.error("Test Logging, check if timestamp is provided.");

cron.schedule('0 2 * * *', () => {
  logger.info('task run every day');
  tvevFullBlock();
});

(async () => {
	// testCoingeckoAPI("binance")
	// 	.then(result => console.log(util.inspect(result, { showHidden: false, depth: null })))
	// 	.catch(err => console.error(err));
	tvevFullBlock();
}) ();


async function tvevFullBlock () {
	try {
		global.dbPool = await connectToDb();
		const allCoins = await getCoinRows();
		
		// const result = await getTvevRatio(1, 'binancecoin', 1, 'binance');
		// logger.info(`tvev: ${result}`);

		// Loops to insert tvev ratio
		for (const value of allCoins) {
			logger.info(`coinID: ${value['coin_id']}`);
			const result = await getTvevRatio(value['id'], value['coin_id'], value['exchange_id'], value['exchange_name_id']);
			logger.info(`tvev: ${result}`);
		}


	} catch(err) {
		logger.error(err);
	}

}


async function testCoingeckoAPI(coin) {
  try {
  	let data = await CoinGeckoClient.exchanges.fetch(coin);
  	// console.dir(data['data']['market_data']['market_cap']['usd']);
  	return data['data'];
  } catch(err) {
  	logger.error(err);
  }
}

function getCoinRows() {
	return new Promise((resolve, reject) => {
		// simple query
		const sql = `
			SELECT \`coins\`.\`id\`,\`coins\`.\`name\` AS coin, \`coins\`.\`name_id\` AS coin_id, \`exchanges\`.\`id\` AS exchange_id, \`exchanges\`.\`name_id\` AS exchange_name_id  FROM \`coins\` 
			INNER JOIN \`exchanges\` ON \`coins\`.\`exchange_id\` = \`exchanges\`.\`id\` WHERE \`active\` = TRUE;
		`;
		const promisePool = global.dbPool.promise();
		promisePool.query(sql, function(err, results, fields) {
			if (results) {
				// logger.info(results);
				resolve(results);
			} else {
				// console.log(err)
				reject("No result found.");
			}
		});
	}); 
}

async function getTvevRatio(coinID, coin, exchangeID, exchange) {

	try {
		// Get total market cap of coins in btc
		const coinMeta = await getCoinMeta(coin);

		// Save to coinMeta table
		// convert first to array
		const row = [coinID];
		for(const key in coinMeta) {
			row.push(coinMeta[key]);
		}
		insertCoinMeta(row);

		// Get exchange total 24hr btc volume
		const exchangeVol = await getExchangeVol(exchange);
		const marketCap = coinMeta['price_in_btc'] * coinMeta['total_supply'];
		logger.info(`marketcap: ${marketCap}, volume: ${exchangeVol}`);

		// Insert to exchange_vol
		insertExchangeVol(exchangeID, exchangeVol);

		// Calculate tvev ratio
		const ratio = marketCap / exchangeVol;
		
		// Insert ratio to coinTvev
		insertTvevRatio(coinID, ratio);

		return ratio;
	} catch(err) {
		logger.error(err);
	}
}

function insertTvevRatio(id, ratio) {
	// simple query
	const sql = `
		INSERT INTO \`coin_tvev\` (\`coin_id\`, \`ratio\`) VALUES (?, ?);
		`;
	const promisePool = global.dbPool.promise();
	promisePool.execute(sql, [id, ratio], function(err, results, fields) {});
}

function insertExchangeVol(id, volume) {
	// simple query
	const sql = `
		INSERT INTO \`exchange_vol\` (\`exchange_id\`, \`vol_24hr\`) VALUES (?, ?);
		`;
	const promisePool = global.dbPool.promise();
	promisePool.execute(sql, [id, volume], function(err, results, fields) {});
}

function insertCoinMeta(row) {
	// simple query
	const sql = `
		INSERT INTO \`coin_metadata\` (\`coin_id\`, \`marketcap_in_btc\`, \`price_in_btc\`, \`price_in_usd\`, \`total_supply\`, \`circulating_supply\`) 
		VALUES (?, ?, ?, ?, ?, ?);
	`;
	const promisePool = global.dbPool.promise();
	promisePool.execute(sql, row, function(err, results, fields) {});
}

async function getCoinMeta(coin) {
	try {
		const data = await CoinGeckoClient.coins.fetch(coin, {
			localization: false,
			tickers: false,
			community_data: false,
			developer_data: false
		});
		// console.dir(data['data']['market_data']['current_price']['usd']);
		const metaData = data['data']['market_data'];
		// Get price in btc
		const coinMeta = { 
			marketcap_btc: metaData['market_cap']['btc'],
			price_in_btc: metaData['current_price']['btc'],
			price_in_usd: metaData['current_price']['usd'],
			total_supply: metaData['total_supply'],
			circulating_supply: metaData['circulating_supply']
		}
		// console.dir(coinMeta);

		return coinMeta;

	} catch(err) {
		logger.error(err);
	}
};


async function getExchangeVol(exchange) {
  try {
  	const data = await CoinGeckoClient.exchanges.fetch(exchange);
  	// logger.info(data['data']['trade_volume_24h_btc']);
  	if (!data['data']) {
  		throw `Error: ${data['error']}`;
  	} else {
  		return data['data']['trade_volume_24h_btc'];
  	}
  } catch(err) {
  	logger.error(err);
  }
}

function connectToDb() {
	return new Promise((resolve, reject) => {
		// create the connection to database
		const pool = mysql.createPool({
		  host: defaultConfig["dbHost"],
		  user: defaultConfig['dbUser'],
		  password: defaultConfig['dbPassword'],
		  database: defaultConfig['dbName'],
		  waitForConnections: true,
		  connectionLimit: 10,
		  queueLimit: 0
		});
		// console.log(defaultConfig)
		resolve(pool);
	});
}
