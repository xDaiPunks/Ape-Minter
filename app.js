const Web3 = require("web3");
const readline = require("readline");
const BigNumber = require("bignumber.js");

const mintPrice = new BigNumber(6e18);
const contractAddress = "0x0f38f41cd7ef4793412c58263c7dc54dbd807f73";

const provider = "https://rpc.ankr.com/gnosis";
const web3 = new Web3(new Web3.providers.HttpProvider(provider));

const abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

const contract = new web3.eth.Contract(abi, contractAddress);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let account;
let privateKey;
let desiredNFTs;

rl.question("Enter your private key: ", (key) => {
  privateKey = key;
  account = web3.eth.accounts.privateKeyToAccount("0x" + privateKey);
  console.log(account.address);
  web3.eth.accounts.wallet.add(account);
  web3.eth.defaultAccount = account.address;

  rl.question("Please enter desired number of NFTs: ", async (num) => {
    desiredNFTs = new BigNumber(num);
    const balance = await web3.eth.getBalance(account.address);
    console.log(
      "Your balance is: ",
      web3.utils.fromWei(balance, "ether"),
      "ETH"
    );

    if (
      new BigNumber(balance).isLessThan(mintPrice.multipliedBy(desiredNFTs))
    ) {
      console.log("Insufficient balance for this operation.");
      rl.close();
      return;
    }
    await mintBatch(desiredNFTs);
    console.log("Minting complete!");
    rl.close();
  });
});

async function mintBatch(nftsToMint) {
  const maxBatchSize = 20; // maximum amount that can be minted at once
  while (nftsToMint > 0) {
    let currentBatchSize = BigNumber.min(nftsToMint, maxBatchSize);
    nftsToMint = nftsToMint.minus(currentBatchSize);
    let batchPrice = mintPrice.multipliedBy(currentBatchSize);
    console.log("Batch size: ", currentBatchSize.toString(), "NFTs");
    console.log(
      "Batch price: ",
      web3.utils.fromWei(batchPrice.toString()),
      "ETH"
    );

    const tx = contract.methods.mint(currentBatchSize.toString()); // Mint the maximum or the remaining
    const gasEstimate = await tx.estimateGas({
      from: account.address,
      value: batchPrice.toString(),
    });

    const gas = Math.floor(gasEstimate * 1.5);
    const gasPrice = await web3.eth.getGasPrice();
    const data = tx.encodeABI();
    const nonce = await web3.eth.getTransactionCount(account.address);

    const signedTx = await web3.eth.accounts.signTransaction(
      {
        to: contractAddress,
        data,
        gas,
        gasPrice,
        nonce,
        value: batchPrice.toString(),
      },
      privateKey
    );

    await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  }
}
