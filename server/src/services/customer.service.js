import { customerRepository } from '../repositories/customer.repository.js';
import { ApiError } from '../utils/ApiError.js';

export class CustomerService {
  async getAllCustomers(query) {
    return await customerRepository.findAll(query);
  }

  async getCustomerById(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw ApiError.notFound(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async createCustomer(data) {
    if (!data.name || data.name.trim().length < 2) {
      throw ApiError.badRequest('Customer name must be at least 2 characters');
    }
    return await customerRepository.create({
      name: data.name.trim(),
      phone: data.phone?.trim() || '---',
      email: data.email?.trim() || '---'
    });
  }

  async updateCustomer(id, data) {
    const existing = await customerRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Customer with ID ${id} not found`);
    }
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.phone !== undefined) updateData.phone = data.phone.trim();
    if (data.email !== undefined) updateData.email = data.email.trim();
    if (data.tier !== undefined) updateData.tier = data.tier;

    return await customerRepository.update(id, updateData);
  }

  async getCustomerInvoices(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw ApiError.notFound(`Customer with ID ${id} not found`);
    }
    const { Sale } = await import('../models/Sale.js');
    const invoices = await Sale.find({ customer: id }).sort({ createdAt: -1 }).lean();
    return {
      customer,
      invoices,
      totalPurchasesCount: invoices.length,
      totalSpent: customer.totalSpent
    };
  }
}

export const customerService = new CustomerService();
