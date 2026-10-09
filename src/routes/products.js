const { z } = require('zod');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

exports.productSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
});

exports.updateProductSchema = exports.productSchema.partial();

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 12, 50);
  const filter = {};
  if (req.query.search) filter.$text = { $search: String(req.query.search) };

  const [items, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({ items, page, pages: Math.ceil(total / limit), total });
});

exports.get = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

exports.create = asyncHandler(async (req, res) => {
  const product = await Product.create({ ...req.body, sellerId: req.user.id });
  res.status(201).json(product);
});

// Ownership check: only the seller who owns it (or an admin)
const loadOwned = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return null;
  }
  if (product.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return product;
};

exports.update = asyncHandler(async (req, res) => {
  const product = await loadOwned(req, res);
  if (!product) return;
  Object.assign(product, req.body);
  await product.save();
  res.json(product);
});

exports.remove = asyncHandler(async (req, res) => {
  const product = await loadOwned(req, res);
  if (!product) return;
  await product.deleteOne();
  res.sendStatus(204);
});
