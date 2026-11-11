import { customerService } from '../services/customer.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export class CustomerController {
  getCustomers = asyncHandler(async (req, res) => {
    const customers = await customerService.getAllCustomers(req.query);
    return ApiResponse.success(res, customers, 'Customers fetched successfully');
  });

  getCustomerById = asyncHandler(async (req, res) => {
    const customer = await customerService.getCustomerById(req.params.id);
    return ApiResponse.success(res, customer, 'Customer details fetched successfully');
  });

  createCustomer = asyncHandler(async (req, res) => {
    const newCustomer = await customerService.createCustomer(req.body);
    return ApiResponse.created(res, newCustomer, `Customer "${newCustomer.name}" created successfully`);
  });

  updateCustomer = asyncHandler(async (req, res) => {
    const updated = await customerService.updateCustomer(req.params.id, req.body);
    return ApiResponse.success(res, updated, `Customer "${updated.name}" updated successfully`);
  });

  getCustomerInvoices = asyncHandler(async (req, res) => {
    const data = await customerService.getCustomerInvoices(req.params.id);
    return ApiResponse.success(res, data, `Purchase history fetched for customer "${data.customer.name}"`);
  });
}

export const customerController = new CustomerController();
