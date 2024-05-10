const readline = require("readline");
const utils = require("./utils.js");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function generateWallet() {
  console.log("Welcome to the HD Wallet Generator");
  let mnemonic = await ask(
    "Enter a mnemonic (or press Enter to generate one): "
  );
  if (!mnemonic.trim()) {
    mnemonic = utils.generateMnemonic();
    console.log("Generated mnemonic:", mnemonic);
  } else if (!utils.isValidMnemonic(mnemonic)) {
    console.log("Error: Invalid mnemonic. Make sure all words are correct.");
    return;
  }

  const numChildren = await ask(
    "How many child keys would you like to generate? "
  );
  const count = parseInt(numChildren, 10);
  if (isNaN(count)) {
    console.log("Please enter a valid number.");
    return;
  }

  const hardened =
    (await ask("Use hardened derivation? (yes/no): ")).toLowerCase() === "yes";

  const masterKey = utils.generateMasterKeyFromMnemonic(mnemonic);
  console.log("Master Private Key:", masterKey.privateKey.toString("hex"));
  console.log("Master Chain Code:", masterKey.chainCode.toString("hex"));

  for (let i = 0; i < count; i++) {
    const childKey = utils.deriveChildKey({
      privateKey: masterKey.privateKey,
      chainCode: masterKey.chainCode,
      index: i,
      hardened: hardened,
    });
    console.log(`\nChild Key ${i} Info:`);
    console.log("Private Key:", childKey.privateKey.toString("hex"));
    console.log("Public Key:", childKey.publicKey);
    console.log("Chain Code:", childKey.chainCode.toString("hex"));
    console.log("Address:", utils.generateAddress(childKey.publicKey));
  }

  let repeat = await ask("Do you want to create another wallet? (y/n): ");
  if (repeat.toLowerCase() === "y") {
    await generateWallet();
  } else {
    rl.close();
  }
}

generateWallet();
