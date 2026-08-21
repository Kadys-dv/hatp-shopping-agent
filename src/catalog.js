export const catalog = Object.freeze([
  { id: "cable-001", name: "USB-C Cable", price: 39.90, currency: "BRL" },
  { id: "kbd-001", name: "Mechanical Keyboard", price: 249.90, currency: "BRL" },
  { id: "mouse-001", name: "Wireless Mouse", price: 119.90, currency: "BRL" },
  { id: "headset-001", name: "USB Headset", price: 189.90, currency: "BRL" },
  { id: "monitor-001", name: "24-inch Monitor", price: 899.90, currency: "BRL" },
  { id: "laptop-001", name: "Developer Laptop", price: 4599.00, currency: "BRL" }
]);

export function findProduct(productId) {
  return catalog.find((item) => item.id === productId) ?? null;
}
