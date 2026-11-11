import { saleService } from '../services/sale.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export class SaleController {
  checkout = asyncHandler(async (req, res) => {
    const checkoutData = {
      ...req.body,
      cashier: req.user?._id || req.body.cashier
    };
    const result = await saleService.checkout(checkoutData);
    const payload = {
      sale: result.sale,
      isDuplicate: !!result.isDuplicate
    };
    if (result.isDuplicate) {
      return ApiResponse.success(res, payload, result.message, 200);
    }
    return ApiResponse.created(res, payload, result.message);
  });

  getSales = asyncHandler(async (req, res) => {
    const { sales, pagination } = await saleService.getAllSales(req.query);
    return ApiResponse.success(
      res,
      sales,
      `Sales history fetched successfully (${sales.length} invoices)`,
      200,
      pagination
    );
  });

  getSaleById = asyncHandler(async (req, res) => {
    const sale = await saleService.getSaleById(req.params.id);
    return ApiResponse.success(res, sale, 'Invoice details fetched successfully');
  });

  getSaleByInvoiceNumber = asyncHandler(async (req, res) => {
    const sale = await saleService.getSaleByInvoiceNumber(req.params.invoiceNumber);
    return ApiResponse.success(res, sale, `Invoice ${sale.invoiceNumber} fetched successfully`);
  });
}

export const saleController = new SaleController();
