const readline = require("readline");
const utils = require("./utils.js");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function validateMnemonic() {
  while (true) {
    let mnemonic = await ask(
      "Enter a mnemonic (or press Enter to generate one): "
    );
    if (!mnemonic.trim()) {
      mnemonic = utils.generateMnemonic();
      console.log("Generated mnemonic:", mnemonic);
      return mnemonic;
    } else if (
      mnemonic.split(" ").length !== 12 ||
      !mnemonic.split(" ").every((word) => utils.isValidMnemonic(word))
    ) {
      console.log(
        "Error: Mnemonic must be exactly 12 words and all words must be in the predefined word list."
      );
    } else {
      return mnemonic;
    }
  }
}

async function validateChildCount() {
  while (true) {
    const numChildren = await ask(
      "How many child keys would you like to generate? "
    );
    const count = parseInt(numChildren, 10);
    if (isNaN(count) || count < 1) {
      console.log("Please enter a valid number greater than 0.");
    } else {
      return count;
    }
  }
}

async function validateHardened() {
  while (true) {
    const answer = await ask("Use hardened derivation? (yes/no): ");
    if (answer.toLowerCase() === "yes" || answer.toLowerCase() === "no") {
      return answer.toLowerCase() === "yes";
    }
    console.log("Please enter 'yes' or 'no'.");
  }
}

async function generateWallet() {
  console.log("Welcome to the HD Wallet Generator");

  const mnemonic = await validateMnemonic();
  const count = await validateChildCount();
  const hardened = await validateHardened();

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
