const productToAdd = { id: 1, isGiftWrapper: false };
const fullProduct = { name: "Toy", price: 100 };
const resolved = { ...productToAdd, ...fullProduct };
console.log(resolved);
