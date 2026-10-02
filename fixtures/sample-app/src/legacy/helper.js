const math = require("../utils/math");

function calculateTotal(items) {
  return items.reduce((acc, item) => math.add(acc, item.price), 0);
}

module.exports = { calculateTotal };
