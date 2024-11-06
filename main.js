import { createInterface } from 'readline';
import { ShopChain } from './BlockChain.js';

// Helper function for user input
async function getInput(prompt) {
 const rl = createInterface({
  input: process.stdin,
  output: process.stdout
 });
 return new Promise(resolve => rl.question(prompt, answer => {
  rl.close();
  resolve(answer);
 }));
}

async function main() {
 const shopChain = new ShopChain();

 // Load blockchain data if it exists
 await shopChain.loadFromFile();

 let continueRunning = true;

 while (continueRunning) {
  console.log("\n--- Inventory Management Menu ---");
  console.log("1. Add New Product");
  console.log("2. Update Product Price");
  console.log("3. Record Inventory Movement");
  console.log("4. View Product Stock");
  console.log("5. View Product History");
  console.log("6. Get Products by Category");
  console.log("7. Get Low Stock Products");
  console.log("8. Mine Transactions");
  console.log("9. View Blockchain State");
  console.log("10. Exit");

  const choice = await getInput("Enter your choice: ");

  switch (choice) {
   case '1': {
    // Add new product
    const productId = await getInput("Enter Product ID: ");
    const productName = await getInput("Enter Product Name: ");
    const category = await getInput("Enter Category: ");
    const unit = await getInput("Enter Unit (e.g., kg): ");
    const initialQuantity = parseInt(await getInput("Enter Initial Quantity: "), 10);
    const price = parseFloat(await getInput("Enter Price: "));

    const productData = { id: productId, name: productName, category, unit, initialQuantity, price };
    shopChain.addProduct(productData);
    console.log("Product added successfully.");
    break;
   }

   case '2': {
    // Update product price
    const productId = await getInput("Enter Product ID: ");
    const newPrice = parseFloat(await getInput("Enter New Price: "));
    const reason = await getInput("Enter Reason for Price Update: ");

    shopChain.updateProductPrice(productId, newPrice, reason);
    console.log("Product price updated successfully.");
    break;
   }

   case '3': {
    // Record inventory movement
    const productId = await getInput("Enter Product ID: ");
    const quantity = parseInt(await getInput("Enter Quantity: "), 10);
    const type = await getInput("Enter Movement Type (IN/OUT/ADJUST): ");
    const reason = await getInput("Enter Reason for Movement: ");

    shopChain.recordInventoryMovement(productId, quantity, type, reason);
    console.log("Inventory movement recorded successfully.");
    break;
   }

   case '4': {
    // View product stock
    const productId = await getInput("Enter Product ID: ");
    const stock = shopChain.getProductStock(productId);
    console.log(`Current stock for product ${productId}: ${stock}`);
    break;
   }

   case '5': {
    // View product history
    const productId = await getInput("Enter Product ID: ");
    const history = shopChain.getProductHistory(productId);
    console.log(`Product History for ${productId}:`);
    console.table(history);
    break;
   }

   case '6': {
    // Get products by category
    const category = await getInput("Enter Category: ");
    const products = shopChain.getProductsByCategory(category);
    console.log(`Products in category ${category}:`);
    console.table(products);
    break;
   }

   case '7': {
    // Get low stock products
    const threshold = parseInt(await getInput("Enter Stock Threshold: "), 10);
    const lowStockProducts = shopChain.getLowStockProducts(threshold);
    console.log("Low stock products:");
    console.table(lowStockProducts);
    break;
   }

   case '8': {
    // Mine transactions
    shopChain.minePendingTransactions('shop-address');
    console.log("Pending transactions mined and added to the blockchain.");
    break;
   }

   case '9': {
    // View blockchain state
    console.log("\n--- Blockchain State ---");
    shopChain.chain.forEach((block, index) => {
     console.log(`Block ${index} (Hash: ${block.hash})`);
     console.table(block.transactions.map(tx => ({
      Type: tx.type,
      Details: JSON.stringify(tx.data),
      Timestamp: new Date(tx.timestamp).toLocaleString(),
      Signature: tx.signature
     })));
    });
    break;
   }

   case '10': {
    continueRunning = false;
    break;
   }

   default:
    console.log("Invalid choice. Please try again.");
  }

  // Save blockchain state to file after each operation
  await shopChain.saveToFile();
 }

 console.log("Exiting the program.");
}

main().catch(error => console.error("Error:", error));
