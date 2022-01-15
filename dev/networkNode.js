const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = process.argv[2];
const Blockchain = require('./blockchain');
const uuid = require('uuid').v1; //v1 is version one of this library. This library creates a unique and random string, which we will use as the recipient address for proof of work

const nodeAddress = uuid()
  .split('-')
  .join('');

const bitcoin = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//bodyparser will parse the data, then we can use the data

const rp = require('request-promise');

app.get('/blockchain', function(req, res) {
  res.send(bitcoin);

  // this will send back the entire blockchain
});

app.post('/transaction', function(req, res) {
  const blockIndex = bitcoin.createNewTransaction(
    req.body.amount,
    req.body.sender,
    req.body.recipient
  );
  res.json({ note: `Transaction will be added in block ${blockIndex}.` });
});

app.get('/mine', function(req, res) {
  const lastBlock = bitcoin.getLastBlock();
  const previousBlockHash = lastBlock['hash']; // this is the previous block's hash
  const currentBlockData = {
    transactions: bitcoin.pendingTransactions,
    index: lastBlock['index'] + 1,
    //the above oject comprises the current block data, that is, the transactions that are present in this new block and its index
  };
  const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
  const blockHash = bitcoin.hashBlock(
    previousBlockHash,
    currentBlockData,
    nonce
  );

  bitcoin.createNewTransaction(12.5, '00', nodeAddress);
  // '00' shows for our records who sent the bitcoin
  const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);

  res.json({
    note: 'New block mined successfully',
    block: newBlock,
  });
});

// register a node and broadcast it to the entire network. This can be done on any node
// that already exists in the network.
app.post('/register-and-broadcast-node', function(req, res) {
  const newNodeUrl = req.body.newNodeUrl;
  if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1) {
    bitcoin.networkNodes.push(newNodeUrl); // this is going into the network nodes array.
  }
  const regNodesPromises = [];
  bitcoin.networkNodes.forEach((networkNodeUrl) => {
    const requestOptions = {
      uri: networkNodeUrl + '/register-node',
      method: 'POST',
      body: { newNodeUrl: newNodeUrl },
      json: true,
    };
    regNodesPromises.push(rp(requestOptions));
  });
  Promise.all(regNodesPromises)
    .then((data) => {
      // use the data
      const bulkRegisterOptions = {
        uri: newNodeUrl + '/register-nodes-bulk',
        method: 'POST',
        body: {
          allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl],
        },
        json: true,
      };
      return rp(bulkRegisterOptions);
    })
    .then((data) => {
      res.json({ note: 'New node registered with network successfully' });
    });
});

// register a node with the network. This is where the other network nodes register the new node. We only want a registration here, not a broadcast.
app.post('/register-node', function(req, res) {
  const newNodeUrl = req.body.newNodeUrl;
  const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1; // if the node isnt there already, then this variable will be true
  const notCurrentNode = bitcoin.currentNodeUrl != newNodeUrl; //this line is evala
  if (nodeNotAlreadyPresent && notCurrentNode)
    bitcoin.networkNodes.push(newNodeUrl);
  res.json({ note: 'New node registered successfully.' });
});

// register multiple nodes at once. This passes along all the other urls of the other nodes
// to the new node. This step makes all the other nodes aware of all the other nodes.
app.post('/register-nodes-bulk', function(req, res) {
  const allNetworkNodes = req.body.allNetworkNodes;
  allNetworkNodes.forEach((networkNodeUrl) => {
    const nodeNotAlreadyPresent =
      bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;
    const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl;
    if (nodeNotAlreadyPresent && notCurrentNode)
      bitcoin.networkNodes.push(networkNodeUrl);
  });
  res.json({ note: 'Bulk registration succussful.' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}...`);
  // this function is to show that our port is running, this is shown in the console.
});
