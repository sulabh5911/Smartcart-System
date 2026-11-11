import { supplierService } from '../services/supplier.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export class SupplierController {
  getSuppliers = asyncHandler(async (req, res) => {
    const suppliers = await supplierService.getAllSuppliers(req.query);
    return ApiResponse.success(res, suppliers, 'Suppliers fetched successfully');
  });

  getSupplierById = asyncHandler(async (req, res) => {
    const data = await supplierService.getSupplierById(req.params.id);
    return ApiResponse.success(res, data, `Supplier profile and purchase history fetched for "${data.supplier.companyName}"`);
  });

  createSupplier = asyncHandler(async (req, res) => {
    const supplier = await supplierService.createSupplier(req.body);
    return ApiResponse.created(res, supplier, `Supplier "${supplier.companyName}" created successfully`);
  });

  updateSupplier = asyncHandler(async (req, res) => {
    const updated = await supplierService.updateSupplier(req.params.id, req.body);
    return ApiResponse.success(res, updated, `Supplier "${updated.companyName}" updated successfully`);
  });
}

export const supplierController = new SupplierController();
