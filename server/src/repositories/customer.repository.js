import { Customer } from '../models/Customer.js';

export class CustomerRepository {
  async findAll({ search = '', limit = 50 } = {}) {
    const filter = {};
    if (search && search.trim() !== '') {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ];
    }
    return await Customer.find(filter).sort({ totalSpent: -1, name: 1 }).limit(limit).lean();
  }

  async findById(id) {
    return await Customer.findById(id).lean();
  }

  async create(customerData) {
    return await Customer.create(customerData);
  }

  async update(id, data) {
    return await Customer.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async updateSpent(id, amount) {
    return await Customer.findByIdAndUpdate(
      id,
      {
        $inc: { totalSpent: amount, loyaltyPoints: Math.floor(amount / 100) }
      },
      { new: true }
    );
  }

  async ensureDefaultCustomers() {
    const count = await Customer.countDocuments();
    if (count === 0) {
      await Customer.create([
        { name: 'Walk-in Customer', phone: '---', email: '---', loyaltyPoints: 0, tier: 'General', totalSpent: 0 },
        { name: 'Rahul Sharma', phone: '+91 98765 43210', email: 'rahul.s@example.com', loyaltyPoints: 340, tier: 'Gold', totalSpent: 12450 },
        { name: 'Priya Singh', phone: '+91 98111 22334', email: 'priya.s@example.com', loyaltyPoints: 780, tier: 'Platinum', totalSpent: 28900 },
        { name: 'Amit Verma', phone: '+91 97222 33445', email: 'amit.v@example.com', loyaltyPoints: 120, tier: 'Silver', totalSpent: 4500 }
      ]);
    } else {
      const hasWalkIn = await Customer.findOne({ name: 'Walk-in Customer' });
      if (!hasWalkIn) {
        await Customer.create({ name: 'Walk-in Customer', phone: '---', email: '---', loyaltyPoints: 0, tier: 'General', totalSpent: 0 });
      }
      const hasRahul = await Customer.findOne({ name: 'Rahul Sharma' });
      if (!hasRahul) {
        await Customer.create({ name: 'Rahul Sharma', phone: '+91 98765 43210', email: 'rahul.s@example.com', loyaltyPoints: 340, tier: 'Gold', totalSpent: 12450 });
      }
    }
  }
}

export const customerRepository = new CustomerRepository();
