import { createHash, createSign, createVerify } from 'crypto';
import { promises as fs } from 'fs';
// Block class
class Block {
    constructor(timestamp, transactions, previousHash = '') {
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
        this.nonce = 0;
    }

    calculateHash() {
        return createHash('sha256')
            .update(
                this.previousHash + 
                this.timestamp + 
                JSON.stringify(this.transactions) + 
                this.nonce
            )
            .digest('hex');
    }

    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
    }
}

// Product class to define product structure
class Product {
    constructor(id, name, category, unit, initialQuantity, price) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.unit = unit;
        this.quantity = initialQuantity;
        this.price = price;
        this.history = []; // Track quantity changes
    }
}

// Enhanced Transaction class with proper signing
class Transaction {
    constructor(type, data, timestamp) {
        this.type = type;
        this.data = data;
        this.timestamp = timestamp;
        this.signature = null;
        this.transactionId = this.generateTransactionId();
    }

    generateTransactionId() {
        return createHash('sha256')
            .update(JSON.stringify(this.data) + this.timestamp)
            .digest('hex');
    }

    signTransaction(privateKey) {
        try {
            // Make sure we have a proper private key
            if (typeof privateKey !== 'string' || !privateKey.includes('BEGIN PRIVATE KEY')) {
                throw new Error('Invalid private key format');
            }

            const sign = createSign('SHA256');
            // Include all relevant transaction data in the signature
            sign.update(this.type + JSON.stringify(this.data) + this.timestamp + this.transactionId);
            this.signature = sign.sign(privateKey, 'hex');
        } catch (error) {
            throw new Error(`Failed to sign transaction: ${error.message}`);
        }
    }

    verifySignature(publicKey) {
        try {
            if (!this.signature) return false;
            
            const verify = createVerify('SHA256');
            verify.update(this.type + JSON.stringify(this.data) + this.timestamp + this.transactionId);
            return verify.verify(publicKey, this.signature, 'hex');
        } catch (error) {
            throw new Error(`Failed to verify signature: ${error.message}`);
        }
    }
}

class ShopChain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2;
        this.pendingTransactions = [];
        
        // Product-specific state management
        this.products = new Map(); // Map of all products
        this.productCategories = new Set(); // Track unique categories
        this.inventorySnapshots = []; // Periodic snapshots of inventory state
    }

    createGenesisBlock() {
        return new Block(Date.now(), [], "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    minePendingTransactions(miningRewardAddress) {
        const block = new Block(
            Date.now(),
            this.pendingTransactions,
            this.getLatestBlock().hash
        );
        
        block.mineBlock(this.difficulty);
        console.log('Block mined! Hash:', block.hash);
        
        this.chain.push(block);
        this.updateState(block);
        this.pendingTransactions = [];
    }

    addProduct(productData) {
        const transaction = new Transaction('PRODUCT_ADD', {
            product: productData,
            timestamp: Date.now()
        }, Date.now());

        this.pendingTransactions.push(transaction);
        return transaction.transactionId;
    }

    updateProductPrice(productId, newPrice, reason) {
        const transaction = new Transaction('PRODUCT_UPDATE', {
            productId,
            updateType: 'PRICE',
            oldPrice: this.products.get(productId)?.price,
            newPrice,
            reason,
            timestamp: Date.now()
        }, Date.now());

        this.pendingTransactions.push(transaction);
        return transaction.transactionId;
    }

    recordInventoryMovement(productId, quantity, type, reason) {
        const transaction = new Transaction('INVENTORY_UPDATE', {
            productId,
            quantity,
            movementType: type, // 'IN' | 'OUT' | 'ADJUST'
            reason,
            timestamp: Date.now()
        }, Date.now());

        this.pendingTransactions.push(transaction);
        return transaction.transactionId;
    }

    updateState(block) {
        // Process each transaction in the block and update the state accordingly
        for (const transaction of block.transactions) {
            switch (transaction.type) {
                case 'PRODUCT_ADD':
                    this.handleProductAdd(transaction.data);
                    break;
                case 'PRODUCT_UPDATE':
                    this.handleProductUpdate(transaction.data);
                    break;
                case 'INVENTORY_UPDATE':
                    this.handleInventoryUpdate(transaction.data);
                    break;
                case 'SALE':
                    this.handleSale(transaction.data);
                    break;
            }
        }
    
        // Ensure categories are added across all blocks
        this.productCategories = new Set(
            Array.from(this.productCategories).concat(
                Array.from(this.products.values()).map(product => product.category)
            )
        );
    
        // Periodic snapshot of inventory if needed
        if (this.shouldCreateSnapshot()) {
            this.createInventorySnapshot();
        }
    }
    handleProductAdd(data) {
        const { product } = data;
        this.products.set(product.id, new Product(
            product.id,
            product.name,
            product.category,
            product.unit,
            product.initialQuantity,
            product.price
        ));
        this.productCategories.add(product.category);
        
    }

    handleProductUpdate(data) {
        const product = this.products.get(data.productId);
        if (product) {
            switch (data.updateType) {
                case 'PRICE':
                    product.history.push({
                        type: 'PRICE_CHANGE',
                        oldValue: product.price,
                        newValue: data.newPrice,
                        timestamp: data.timestamp,
                        reason: data.reason
                    });
                    product.price = data.newPrice;
                    break;
            }
        }
    }

    handleInventoryUpdate(data) {
        const product = this.products.get(data.productId);
        if (product) {
            const oldQuantity = product.quantity;
            switch (data.movementType) {
                case 'IN':
                    product.quantity += data.quantity;
                    break;
                case 'OUT':
                    product.quantity -= data.quantity;
                    break;
                case 'ADJUST':
                    product.quantity = data.quantity;
                    break;
            }
            
            product.history.push({
                type: 'QUANTITY_CHANGE',
                oldValue: oldQuantity,
                newValue: product.quantity,
                movement: data.movementType,
                reason: data.reason,
                timestamp: data.timestamp
            });
        }
    }

    handleSale(data) {
        const { products: soldProducts } = data;
        for (const item of soldProducts) {
            const product = this.products.get(item.id);
            if (product) {
                product.quantity -= item.quantity;
                product.history.push({
                    type: 'SALE',
                    quantity: item.quantity,
                    price: item.price,
                    timestamp: data.timestamp,
                    orderId: data.orderId
                });
            }
        }
    }

    shouldCreateSnapshot() {
        const lastBlock = this.getLatestBlock();
        return this.chain.length % 100 === 0 || 
               (this.inventorySnapshots.length > 0 && 
                Date.now() - this.inventorySnapshots[this.inventorySnapshots.length - 1].timestamp > 86400000);
    }

    createInventorySnapshot() {
        const snapshot = {
            timestamp: Date.now(),
            blockHeight: this.chain.length,
            products: Array.from(this.products.entries()).map(([id, product]) => ({
                id,
                quantity: product.quantity,
                price: product.price
            }))
        };
        this.inventorySnapshots.push(snapshot);
    }

    getProductStock(productId) {
        return this.products.get(productId)?.quantity || 0;
    }

    getProductHistory(productId) {
        return this.products.get(productId)?.history || [];
    }

    getProductsByCategory(category) {
        return Array.from(this.products.values())
            .filter(product => product.category === category);
    }

    getLowStockProducts(threshold) {
        return Array.from(this.products.values())
            .filter(product => product.quantity <= threshold);
    }

    async saveToFile() {
          try {
            const data = {
              chain: this.chain,
              products: Array.from(this.products.entries()),
              productCategories: Array.from(this.productCategories),
              inventorySnapshots: this.inventorySnapshots
            };
            await fs.writeFile('blockchain_data.json', JSON.stringify(data) + '\n', 'utf8');
          } catch (error) {
            console.error('Error saving blockchain data:', error);
          }
        }
        
    addTransaction(transaction) {
        if (!transaction.signature) {
            throw new Error('Transaction must be signed before adding to the chain');
        }
        this.pendingTransactions.push(transaction);
    }

    async loadFromFile() {
        try {
            const data = JSON.parse(await fs.readFile('blockchain_data.json', 'utf8'));
            this.chain = data.chain;
            this.products = new Map(data.products);
            this.productCategories = new Set(data.productCategories);
            this.inventorySnapshots = data.inventorySnapshots;
        } catch (error) {
            console.error('Error loading blockchain data:', error);
        }
    }
}

export { Block, Product, Transaction,ShopChain};