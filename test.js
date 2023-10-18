//1. Import coingecko-api
const CoinGecko = require('coingecko-api');

//2. Initiate the CoinGecko API Client
const CoinGeckoClient = new CoinGecko();
(async()=>{
	/*let exchanges = await CoinGeckoClient.exchanges.all()
	exchanges.data.forEach((exc)=>{
		if(exc.name == "Bitfinex")
			console.log(exc)
	})*/

	
	let data = await CoinGeckoClient.exchanges.fetch('bitfinex');
  let data_for_leoToken = await CoinGeckoClient.coins.fetch('leo-token');
  // console.log(data_for_leoToken)
  const metaData_for_leoToken = data_for_leoToken['data']['market_data'];
  const coinMeta_for_leoToken = { 
		marketcap_btc 		 : metaData_for_leoToken['market_cap']['btc'],
		price_in_btc 			 :  metaData_for_leoToken['current_price']['btc'],
		price_in_usd 			 :  metaData_for_leoToken['current_price']['usd'],
		total_supply 			 :  metaData_for_leoToken['total_supply'],
		circulating_supply : metaData_for_leoToken['circulating_supply']
	};
	console.log('leo-token', coinMeta_for_leoToken);
})()
//3. Make calls for bitmax
async function bitmax(){
  let data = await CoinGeckoClient.exchanges.fetch('bitmax');
  let data_for_bitmax = await CoinGeckoClient.coins.fetch('bmax');
  const metaData_for_bitmax = data_for_bitmax['data']['market_data'];
  const coinMeta_for_bitmax = { 
		marketcap_btc 		 : metaData_for_bitmax['market_cap']['btc'],
		price_in_btc 			 :  metaData_for_bitmax['current_price']['btc'],
		price_in_usd 			 :  metaData_for_bitmax['current_price']['usd'],
		total_supply 			 :  metaData_for_bitmax['total_supply'],
		circulating_supply : metaData_for_bitmax['circulating_supply']
	};
	console.log('bitmax', coinMeta_for_bitmax);
};

//4. Make calls for fcoin
async function fcoin(){
	let data = await CoinGeckoClient.exchanges.fetch('fcoin');
	let data_for_fcoin = await CoinGeckoClient.coins.fetch('fcoin-token');
  const metaData_for_fcoin = data_for_fcoin['data']['market_data'];
  const coinMeta_for_fcoin = { 
		marketcap_btc 		 : metaData_for_fcoin['market_cap']['btc'],
		price_in_btc 			 :  metaData_for_fcoin['current_price']['btc'],
		price_in_usd 			 :  metaData_for_fcoin['current_price']['usd'],
		total_supply  		 :  metaData_for_fcoin['total_supply'],
		circulating_supply : metaData_for_fcoin['circulating_supply']
	};
	console.log('fcoin', coinMeta_for_fcoin);
}

async function test(){
	let data = await CoinGeckoClient.exchanges.fetch('Coinbe');
	console.log('1', data)

	let data_for_test = await CoinGeckoClient.coins.fetch('coinbene-token');
  const metaData_for_test = data_for_test['data']['market_data'];
  const coinMeta_for_test = { 
		marketcap_btc 		 : metaData_for_test['market_cap']['btc'],
		price_in_btc 			 :  metaData_for_test['current_price']['btc'],
		price_in_usd 			 :  metaData_for_test['current_price']['usd'],
		total_supply  		 :  metaData_for_test['total_supply'],
		circulating_supply : metaData_for_test['circulating_supply']
	};
	console.log('2', coinMeta_for_test);
}

// test()
// bitmax();

// fcoin();
