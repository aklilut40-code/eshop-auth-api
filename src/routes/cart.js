const { z } = require('zod');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

exports.addItemSchema = z.object({
  productId: z.string().length(24),
  quantity: z.number().int().min(1).max(99),
});

exports.get = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId', 'name price stock');
  res.json(cart || { items: [] });
});

exports.addItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const cart = (await Cart.findOne({ userId: req.user.id })) || new Cart({ userId: req.user.id, items: [] });
  const existing = cart.items.find((i) => i.productId.toString() === productId);
  const newQty = (existing?.quantity || 0) + quantity;

  if (newQty > product.stock) return res.status(400).json({ error: 'Not enough stock' });

  if (existing) existing.quantity = newQty;
  else cart.items.push({ productId, quantity });

  await cart.save();
  res.json(cart);
});

exports.removeItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.id });
  if (!cart) return res.json({ items: [] });
  cart.items = cart.items.filter((i) => i.productId.toString() !== req.params.productId);
  await cart.save();
  res.json(cart);
});
