const Blockchain = require('./blockchain');

const bitcoin = new Blockchain();

const previousBlockHash = 'ASDF';
const currentBlockData = [
  {
    amount: 10,
    sender: 'NM',
    recipient: '21654651',
  },
  {
    amount: 2000,
    sender: 'M',
    recipient: '2',
  },
  {
    amount: 10,
    sender: 'NMK',
    recipient: '1',
  },
];

console.log(bitcoin.hashBlock(previousBlockHash, currentBlockData, 12221));
