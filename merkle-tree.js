const utils = require('./utils.js');
class MerkleTree {
    constructor(transactions) {
        this.levels = [];
        this.rootHash = null;
        this.transactions = [];
        this.buildTree(transactions);
    }

    buildTree(transactions) {
        if (!transactions || transactions.length === 0) {
            this.levels.push([]);
            this.rootHash = null;
            this.transactions = [];
            return;
        }

        let leaves = [];
        if (this.levels[0] && this.levels[0].length !== 0) {
            leaves = this.levels[0]
        } else {
            leaves = transactions.map(transaction => utils.hash(JSON.stringify(transaction)));

        }
        this.levels = []
        this.levels.push(leaves);
        while (leaves.length > 1) {
            let level = [];
            for (let i = 0; i < leaves.length; i += 2) {
                let combinedHash = leaves[i];
                if (i + 1 < leaves.length) {
                    combinedHash += leaves[i + 1];
                }
                level.push(utils.hash(combinedHash));
            }
            this.levels.push(level);
            leaves = level;
        }
        this.rootHash = leaves[0];
    }

    insert(transaction) {
        let leafHash = utils.hash(JSON.stringify(transaction));
        if (this.levels.length === 0) {
            this.levels.push([leafHash]);
            this.rootHash = leafHash;
            return;
        }
        this.levels[0].push(leafHash)
        this.buildTree(this.levels[0]);
        this.transactions.push(transaction);
    }

    verifyRootHash() {
        const computedRootHash = this.computeRootHash();
        return computedRootHash === this.rootHash;
    }

    computeRootHash() {
        let levelHashes = this.levels[this.levels.length - 1];
        return levelHashes[0];
    }

    containsTransaction(tx) {
        // Traverse the Merkle tree and find the node containing the transaction hash
        if (this.transactions) {
            return this.transactions.includes(tx);
        }
        return false;
    }

    getAllTransactions() {
        // Traverse the Merkle tree and collect all transactions
        return this.transactions;
    }

}


module.exports = MerkleTree;