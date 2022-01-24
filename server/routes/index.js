var express = require('express');
var router = express.Router();
var Web3 = require(`web3`);
var Tx = require('ethereumjs-tx').Transaction;

var urls = {
	mainnet: `https://mainnet.infura.io/v3/8cf651625107465f96d86d72f7f2184f`,
	ropstein : `https://ropsten.infura.io/v3/8cf651625107465f96d86d72f7f2184f`,
	kovan : `https://kovan.infura.io/v3/8cf651625107465f96d86d72f7f2184f` 
};

var web3

/** functions */
const setUrl = (networkName) => {
	web3 = new Web3(urls[networkName]);
}

const buildTransaction = ({ fromAddress, toAddress, amount }) => {
	return web3.eth.getTransactionCount(fromAddress)
		.then((txCount) => {
			return {
				nonce: web3.utils.toHex(txCount),
				to: toAddress,
				value: web3.utils.toHex(web3.utils.toWei(amount , `ether`)),
				gasLimit: web3.utils.toHex(21000),
				gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
			}
		})
		.catch((err) => {
			return { error : err };
		})
}

/* To Check API status */
router.get('/', function(req, res, next) {
  res.status(200).send({ notice: `Greetings! Welcome to web3 test server created by Clive Mac.` });
});

router.get(`/getNetworks`, function(req, res, next) {
	res.status(200).send({ networks: Object.keys(urls) });
})

router.get(`/getAccountBalance`, function(req, res, next) {
	if(req.headers[`network-type`]){
		setUrl(req.headers[`network-type`]);
	}
	if(req.query.address){
		web3.eth.getBalance(req.query.address)
		.then((balance) => {
			res.status(200).send({ 
				notice : `Successfully retrieved account balance`,
				balance : web3.utils.fromWei(balance, 'ether')
			});
		})
		.catch((err) => {
			res.status(401).send({ 'error': err })
		})
		.finally(() => {
			res.end();
		})
	}
	else{
		res.status(401).send({ 'error': `Address not found!` })
	}
});

router.get(`/getCurrentGasPrice`, function(req, res, next) {
	if(req.headers[`network-type`]){
		setUrl(req.headers[`network-type`]);
	}
	web3.eth.getGasPrice()
	.then((gasPrice) => {
		res.status(200).send({ gasPrice: web3.utils.fromWei(gasPrice, 'ether') });
	})
	.catch((err) => {
		res.status(401).send({ 'error': err })
	})
	.finally(() => {
		res.end();
	})
})

router.post(`/sendBalance`, function(req, res, next) {
	if(req.headers[`network-type`]){
		setUrl(req.headers[`network-type`]);
	}
	if(req.body.privateKey && req.body.fromAddress && web3.utils.isAddress(req.body.fromAddress) 
			&& req.body.toAddress && web3.utils.isAddress(req.body.toAddress) 
			&& req.body.amount
	){
		buildTransaction({
			fromAddress: req.body.fromAddress,
			toAddress: req.body.toAddress,
			amount: req.body.amount,
		})
		.then((txObject) => {
			const tx = new Tx(txObject, { chain: req.headers[`network-type`] });
			tx.sign(new Buffer(req.body.privateKey, 'hex'));

			const serializedTx = tx.serialize();
			const raw = `0x${serializedTx.toString('hex')}`;
			return web3.eth.sendSignedTransaction(raw)
		})
		.then((txHash) => {
			res.status(200).send({ 
				notice : `Successfully sent transaction`,
				data : txHash
			})
		})
		.catch((err) => {
			res.status(401).send({ 'error': err })
		})
		.finally(() => {
			res.end();
		})
	}	else{
		res.status(401).send({ 'error': `Please send all required parameters!` })
	}
})


module.exports = router;
