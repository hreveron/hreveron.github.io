const request = require("request");
const StellarSdk = require('stellar-sdk');
const horizontUrl = "http://ec2-54-152-32-209.compute-1.amazonaws.com:8000";
	

function iPromiseToCreateAnAccount(accountId) {
    var options = {
        url: 'https://friendbot.stellar.org',
        qs: { addr: accountId },
        json: true
    };
    return new Promise(function(resolve, reject) {
        request.get(options, function(err, resp, body) {
            if (err) {
                reject(err);
            } else {
                //resolve(JSON.parse(body));
                resolve(body);
            }
        })
    })
}


function iPromiseToGetAccountTransactions(accountId, order, limit, cursor) {
    var options = {
        url: horizontUrl+'/accounts/'+accountId+'/transactions',
        qs: { limit: limit, order: order, cursor: cursor},
        json: false
    };
    return new Promise(function(resolve, reject) {
        request.get(options, function(err, resp, page) {
            if (err) {
            	console.log("error: "+err+"\n");
                reject(err);
            } else {
                //resolve(JSON.parse(body));
                console.log("resp: "+resp+"\n");
                console.log("page: "+page+"\n");
                resolve(page);
            }
        })
    })
}


function iPromiseToGetAccountBalance(accountId) {
    var options = {
        url: horizontUrl+'/accounts/'+accountId,
        json: false
    };
    return new Promise(function(resolve, reject) {
        request.get(options, function(err, resp, page) {
            if (err) {
                reject(err);
            } else {
                resolve(page);
            }
        })
    })
}




function createAccount() {
	const pair = StellarSdk.Keypair.random();
    const accountCreated = iPromiseToCreateAnAccount(pair.publicKey());
    accountCreated.then(function(result) {
        console.log("publicKey: "+pair.publicKey());
        console.log("secret: "+pair.secret());
    }), function(err) {
        console.log(err);
    }
};



function createAccountAndGetBalance() {
	const pair = StellarSdk.Keypair.random();
    const accountCreated = iPromiseToCreateAnAccount(pair.publicKey());
    accountCreated.then(function(result) {
        console.log("publicKey: "+pair.publicKey());
    }).then(iPromiseToGetAccountBalance(accountId))
    .then(function(data){
    	console.log(data);
    	//const dataJson = JSON.parse(data);
		//console.log('Balances for account: ' + data.account_id);
        //data.balances.forEach(function(balance) {
        //  console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
        //});
    }), function(err) {
        console.log(err);
    }
};



function getBalance(accountId) {
    const accountBalance = iPromiseToGetAccountBalance(accountId);
    accountBalance.then(function(data){
    	const dataJson = JSON.parse(data);
		console.log('Balances for account: ' + dataJson.account_id);
        dataJson.balances.forEach(function(balance) {
          console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
        });
    }), function(err) {
        console.log(err);
    }
};




function transferir(assetName, issuingPublicKey, sourceSecretKey, receiverPublicKey, amount){
    // The source account is the account we will be signing and sending from.
    //var sourceSecretKey = 'SAIRWUXWUSD46JSMVNVPHZZB6WHGJEARIXBRNIIW6HZQ37T6IGIFFOWL';

    // Derive Keypair object and public key (that starts with a G) from the secret
    var sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
    var sourcePublicKey = sourceKeypair.publicKey();

    //var receiverPublicKey = 'GC2DXHGVS72K2HHYNINA3PXUVRKHQNZRDMZNJBDSXNFE5R6DA4CNBCZD';

    var server = new StellarSdk.Server(horizontUrl, {allowHttp: true});
    // Uncomment the following line to build transactions for the live network. Be
    // sure to also change the horizon hostname.
    // StellarSdk.Network.usePublicNetwork();
    StellarSdk.Network.useTestNetwork();

    var tokenObj = new StellarSdk.Asset(assetName, issuingPublicKey);


    // Transactions require a valid sequence number that is specific to this account.
    // We can fetch the current sequence number for the source account from Horizon.
    server.loadAccount(sourcePublicKey)
      .then(function(account) {
        var transaction = new StellarSdk.TransactionBuilder(account)
          // Add a payment operation to the transaction
          .addOperation(StellarSdk.Operation.payment({
            destination: receiverPublicKey,
            // The term native asset refers to lumens
            //asset: StellarSdk.Asset.native(),
            asset: tokenObj,



            // Specify 350.1234567 lumens. Lumens are divisible to seven digits past
            // the decimal. They are represented in JS Stellar SDK in string format
            // to avoid errors from the use of the JavaScript Number data structure.
            // amount: '350.1234567',
            amount: amount,
          }))
          // Uncomment to add a memo (https://www.stellar.org/developers/learn/concepts/transactions.html)
          // .addMemo(StellarSdk.Memo.text('Hello world!'))
          .build();

        // Sign this transaction with the secret key
        // NOTE: signing is transaction is network specific. Test network transactions
        // won't work in the public network. To switch networks, use the Network object
        // as explained above (look for StellarSdk.Network).
        transaction.sign(sourceKeypair);

        // Let's see the XDR (encoded in base64) of the transaction we just built
        console.log(transaction.toEnvelope().toXDR('base64'));

        // Submit the transaction to the Horizon server. The Horizon server will then
        // submit the transaction into the network for us.
        server.submitTransaction(transaction)
          .then(function(transactionResult) {
            console.log(JSON.stringify(transactionResult, null, 2));
            console.log('\nSuccess! View the transaction at: ');
            console.log(transactionResult._links.transaction.href);
          })
          .catch(function(err) {
            console.log('An error has occured:');
            console.log(err);
          });
      })
      .catch(function(e) {
        console.error(e);
      });
}




function createAsset(assetName, issuingAcountSecret, receivingAccountSecret, tokenAmount){
    StellarSdk.Network.useTestNetwork();
    //var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
    var server = new StellarSdk.Server(horizontUrl, {allowHttp: true});

    // Keys for accounts to issue and receive the new asset
    var issuingKeys = StellarSdk.Keypair
      .fromSecret(issuingAcountSecret);
    var receivingKeys = StellarSdk.Keypair
      .fromSecret(receivingAccountSecret);

    // Create an object to represent the new asset
    var tokenObj = new StellarSdk.Asset(assetName, issuingKeys.publicKey());

    // First, the receiving account must trust the asset
    server.loadAccount(receivingKeys.publicKey())
      .then(function(receiver) {
        var transaction = new StellarSdk.TransactionBuilder(receiver)
          // The `changeTrust` operation creates (or alters) a trustline
          // The `limit` parameter below is optional
          .addOperation(StellarSdk.Operation.changeTrust({
            asset: tokenObj,
            limit: tokenAmount
          }))
          .build();
        transaction.sign(receivingKeys);
        return server.submitTransaction(transaction);
      })

      // Second, the issuing account actually sends a payment using the asset
      .then(function() {
        return server.loadAccount(issuingKeys.publicKey())
      })
      .then(function(issuer) {
        var transaction = new StellarSdk.TransactionBuilder(issuer)
          .addOperation(StellarSdk.Operation.payment({
            destination: receivingKeys.publicKey(),
            asset: tokenObj,
            amount: '10'
          }))
          .build();
        transaction.sign(issuingKeys);
        return server.submitTransaction(transaction);
      })
      .catch(function(error) {
        console.error('Error!', error);
      });    
}








createAccount();

const assetName = 'JCL';
const issuingAcountSecret = 'SCFGVU324V2MRXCS42ZL2LMOY6OQ3PSLS5LDHIR4SXXJ52CMHMCIAYTH';
const receivingAccountSecret = 'SAMV4HFMD6R4NPUQLKLQBJLYVU2IPEWS6JKMHH7PSZCIUY5QOKJ5NKO5';
const tokenInitialAmount = '1000000';
const amount = '10';
const receiverPublicKey = 'GBWOJS22DWLJWPQ6BQ6PGAQVLMQKY3TBQMQYYNIH4C4XO4IPJKNDR6VM';
const issuingPublicKey = 'GBHYXZDEQFEPCCZAXOY5JCP5N2EP6R2Y7ZJWEPBIUYYVHZNA77O23RJ2';


//createAsset(assetName, issuingAcountSecret, receivingAccountSecret, tokenAmount);

//getBalance('GBWOJS22DWLJWPQ6BQ6PGAQVLMQKY3TBQMQYYNIH4C4XO4IPJKNDR6VM');
//getBalance('GBHYXZDEQFEPCCZAXOY5JCP5N2EP6R2Y7ZJWEPBIUYYVHZNA77O23RJ2');
//getBalance('GBWOJS22DWLJWPQ6BQ6PGAQVLMQKY3TBQMQYYNIH4C4XO4IPJKNDR6VM');

//transferir(assetName, issuingPublicKey, issuingAcountSecret, receiverPublicKey, amount);
transferir(assetName, issuingPublicKey, issuingAcountSecret, receiverPublicKey, amount);
//getBalance('GBBEVVRCEY6N3KSRAQSB47XUL27J2NPGPQKA6DA5LJD3HU74R33WW6VT');

//createAccount();
//getBalance('GAG4LX4WI5BQN74SZ656KDEUKR7VCMOAW3DU32BHF3JX4MX5BLP2RAJM');
//getBalance('GBBEVVRCEY6N3KSRAQSB47XUL27J2NPGPQKA6DA5LJD3HU74R33WW6VT');



/*
publicKey: GDZN5Z3OGQOI526H2AL6IFJKVA7FLFFFSVML7JH7TQT252F5BRS6BUID
secret: SADSTHI53AMJFKQ5LCQWPRV4KT52X26GEGPAKNYESTZPBURVZ34S23ES




GAG4LX4WI5BQN74SZ656KDEUKR7VCMOAW3DU32BHF3JX4MX5BLP2RAJM

publicKey: GBBEVVRCEY6N3KSRAQSB47XUL27J2NPGPQKA6DA5LJD3HU74R33WW6VT
secret: SCN7QPTICHQXP6AWZDZYPWL5NY5W26G54JXJ65VVTDSLQUT6SMMPJTHJ

publicKey: GCCKXMUD3ESPZBTTNLKNOSOPCJHCEWX6KFTACAQ5QAOQC5IL45SDKZYM
secret: SDEFRX3AFXJD2NIOV3YPNAF4VJORZLSSQKDFMXTMMPYZSTZJ5V67RAMW
*/

/*
sourceSecretKey = 'SCN7QPTICHQXP6AWZDZYPWL5NY5W26G54JXJ65VVTDSLQUT6SMMPJTHJ';
receiverPublicKey = 'GCCKXMUD3ESPZBTTNLKNOSOPCJHCEWX6KFTACAQ5QAOQC5IL45SDKZYM';
amount = '350.1234567';
transferir(sourceSecretKey, receiverPublicKey, amount);
*/
