const { z } = require('zod');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');

exports.statusSchema = z.object({
  status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled']),
});

// Checkout: builds the order from the server-side cart.
// Prices and totals come from the DB, never from the client.
exports.create = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.id });
  if (!cart || cart.items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  const reserved = []; // items whose stock we already decremented
  const orderItems = [];
  let total = 0;

  for (const item of cart.items) {
    // Atomic: decrement only if enough stock remains
    const product = await Product.findOneAndUpdate(
      { _id: item.productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { new: true }
    );

    if (!product) {
      // Roll back anything already reserved
      await Promise.all(
        reserved.map((r) => Product.updateOne({ _id: r.productId }, { $inc: { stock: r.quantity } }))
      );
      return res.status(400).json({ error: 'An item is out of stock or no longer available' });
    }

    reserved.push({ productId: item.productId, quantity: item.quantity });
    orderItems.push({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    });
    total += product.price * item.quantity;
  }

  const order = await Order.create({ userId: req.user.id, items: orderItems, total });
  cart.items = [];
  await cart.save();

  res.status(201).json(order);
});

exports.list = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { userId: req.user.id };
  const orders = await Order.find(filter).sort({ createdAt: -1 });
  res.json(orders);
});

// Ownership check: owner or admin
exports.get = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const isOwner = order.userId.toString() === req.user.id;
  if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  res.json(order);
});

// Customer can cancel own order while it's still pending; stock is restored
exports.cancel = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const isOwner = order.userId.toString() === req.user.id;
  if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  if (order.status !== 'pending') return res.status(400).json({ error: 'Only pending orders can be cancelled' });

  await Promise.all(
    order.items.map((i) => Product.updateOne({ _id: i.productId }, { $inc: { stock: i.quantity } }))
  );
  order.status = 'cancelled';
  await order.save();
  res.json(order);
});

// Admin only (route-level authorize)
exports.updateStatus = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});
