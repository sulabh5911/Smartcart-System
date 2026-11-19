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
}

export const customerRepository = new CustomerRepository();
