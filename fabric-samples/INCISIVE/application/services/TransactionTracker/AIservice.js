const { Gateway, Wallets} = require('fabric-network');
const path = require('path');
const fs = require('fs');

const channelName = process.env.CHANNEL_NAME;
const chaincodeName = process.env.CC_NAME;
const secret = process.env.HASH_SECRET;
const walletPath = path.join(__dirname, '..', '..', 'wallet');


const {ccps, msps, caClients, cas} = require('../../helpers/initalization');
const insertlog = require('../../MongoDB/controllers/logs/insertlog');


function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}


const AIservice = async(req, res, next) => {

    //should be given by request or taken from a token (e.g. jwt)
    const identity = req.body.user;
    let data = req.body.data;
    let service = req.body.service;
    console.log(req.body)

    try {

        let ccp = ccps['incisive'];

        const wallet = await Wallets.newFileSystemWallet(path.join(walletPath, 'incisive'));


        //check if the identity eixsts
        await wallet.get(identity);
        // if (exists) {
        //     console.log('OK! Registered user!!!');
        // }
        // else{

        //     console.log('User identity does not exist in wallet.... Not registered user');
        //     res.status(403).send('User identity does not exist in wallet.... Not registered user')
        //     return;
        // }


        const gateway = new Gateway();


        console.log("Trying to connect to gateway...")
        await gateway.connect(ccp, {
            wallet,
            identity: identity,
            discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
        });
        console.log("Connected!!!")

        // Build a network instance based on the channel where the smart contract is deployed
        const network = await gateway.getNetwork(channelName);

        // Get the contract from the network.
        const contract = network.getContract(chaincodeName, 'AIContract');

        //let timestamp = Date.now();

        console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
        let result = await contract.submitTransaction('AIService', service, data, identity, secret);

        console.log('*** Result: committed');
        let resultjson = JSON.parse(result.toString());
        console.log(`*** Result: ${prettyJSONString(result.toString())}`);
        // console.log("The result is:", action)

        //save log to mongodb
        let action = resultjson[0];
        console.log('acyion', action)
        let hash = resultjson[1];
        console.log('hash', hash)
        await insertlog(hash, action);

        res.status(200).send("OK!");
    
        // Disconnect from the gateway when the application is closing
        // This will close all connections to the network
        gateway.disconnect();
        
    }

    catch(error) {

        console.log('New critical action (use of AI service '+service+') submition failed with error: '+error);

        res.status(403).send('Use of AI service '+service+' action submission failed with '+error)
        

    }
    
}
module.exports = AIservice;