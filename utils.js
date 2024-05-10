"use strict";
const fs = require("fs");
const path = require("path");

let crypto = require("crypto");

const { mnemonicToSeedSync } = require("bip39");
const { pki, random } = require("node-forge");

// CRYPTO settings
const HASH_ALG = "sha256";
const SIG_ALG = "RSA-SHA256";

// Constants for HD Wallet
const HARDENED_OFFSET = 0x80000000;
const MASTER_SECRET = Buffer.from("Bitcoin seed", "utf8");
const CURVE_ORDER = BigInt(
  "0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"
);

exports.hash = function hash(s, encoding) {
  encoding = encoding || "hex";
  return crypto.createHash(HASH_ALG).update(s).digest(encoding);
};

/**
 * Generates keypair from mnemonic and password
 *
 * @param {String} mnemonic - associated with the blockchain instance
 * @param {String} password - unique to each user
 * @returns
 */
//https://stackoverflow.com/questions/72047474/how-to-generate-safe-rsa-keys-deterministically-using-a-seed
exports.generateKeypairFromMnemonic = function (mnemonic, password) {
  const seed = mnemonicToSeedSync(mnemonic, password).toString("hex");
  const prng = random.createInstance();
  prng.seedFileSync = () => seed;
  const { privateKey, publicKey } = pki.rsa.generateKeyPair({
    bits: 512,
    prng,
    workers: 2,
  });
  return {
    public: pki.publicKeyToPem(publicKey),
    private: pki.privateKeyToPem(privateKey),
  };
};

exports.generateKeypair = function () {
  const kp = crypto.generateKeyPairSync("rsa", {
    modulusLength: 512,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });
  return {
    public: kp.publicKey,
    private: kp.privateKey,
  };
};

exports.sign = function (privKey, msg) {
  let signer = crypto.createSign(SIG_ALG);
  // Convert an object to its JSON representation
  let str = msg === Object(msg) ? JSON.stringify(msg) : "" + msg;
  return signer.update(str).sign(privKey, "hex");
};

exports.verifySignature = function (pubKey, msg, sig) {
  let verifier = crypto.createVerify(SIG_ALG);
  // Convert an object to its JSON representation
  let str = msg === Object(msg) ? JSON.stringify(msg) : "" + msg;
  return verifier.update(str).verify(pubKey, sig, "hex");
};

exports.calcAddress = function (key) {
  let addr = exports.hash("" + key, "base64");
  //console.log(`Generating address ${addr} from ${key}`);
  return addr;
};

exports.addressMatchesKey = function (addr, pubKey) {
  return addr === exports.calcAddress(pubKey);
};

function hmacSHA512(key, data) {
  return crypto.createHmac("sha512", key).update(data).digest();
}

let validWords = new Set();
let wordListLoaded = false;

// Function to load and parse the word list from file
function loadWordList() {
  if (!wordListLoaded) {
    // Ensures the word list is only loaded once
    const filePath = path.join(__dirname, "wordlist.txt");
    try {
      const data = fs.readFileSync(filePath, "utf8");
      data.split("\n").forEach((line) => {
        const word = line.trim().split(". ")[1]; // Assuming the format "2035. wrestle"
        if (word) validWords.add(word);
      });
      wordListLoaded = true; // Set flag to true after successful load
    } catch (error) {
      console.error("Failed to load or parse the word list:", error);
    }
  }
}

// Function to check if a word is valid
exports.isValidMnemonic = function (word) {
  loadWordList(); // Ensure word list is loaded before checking
  return validWords.has(word);
};

// Function to generate a mnemonic from the loaded word list
exports.generateMnemonic = function () {
  loadWordList();
  const words = Array.from(validWords);
  const indices = Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * words.length)
  );
  return indices.map((index) => words[index]).join(" ");
};

// Generate master key from mnemonic
exports.generateMasterKeyFromMnemonic = function (mnemonic, password = "") {
  const seed = crypto
    .createHash("sha256")
    .update(mnemonic + password)
    .digest();
  const I = hmacSHA512(MASTER_SECRET, seed);
  return {
    privateKey: I.slice(0, 32),
    chainCode: I.slice(32),
  };
};
function getPublicKey(privateKey) {
  const ecdh = crypto.createECDH("secp256k1");
  ecdh.setPrivateKey(privateKey, "hex");
  return ecdh.getPublicKey("hex");
}

// Derive child key
exports.deriveChildKey = function ({
  privateKey,
  chainCode,
  index,
  hardened = true,
}) {
  const indexBuffer = Buffer.alloc(4);
  indexBuffer.writeUInt32BE(index + (hardened ? HARDENED_OFFSET : 0), 0);
  const data = Buffer.concat([Buffer.alloc(1, 0), privateKey, indexBuffer]);
  const I = crypto.createHmac("sha512", chainCode).update(data).digest();
  return {
    privateKey: I.slice(0, 32),
    chainCode: I.slice(32),
    publicKey: getPublicKey(I.slice(0, 32)),
  };
};

// Generate address from public key
exports.generateAddress = function (publicKey) {
  const sha = crypto.createHash("sha256").update(publicKey).digest();
  const ripemd = crypto.createHash("ripemd160").update(sha).digest("hex");
  return ripemd;
};
