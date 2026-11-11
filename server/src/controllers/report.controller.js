import { reportService } from '../services/report.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export class ReportController {
  // GET /api/reports/dashboard
  getDashboardMetrics = asyncHandler(async (req, res) => {
    const metrics = await reportService.getDashboardMetrics();
    return ApiResponse.success(res, metrics, 'Dashboard overview metrics fetched successfully');
  });

  // GET /api/reports/analytics
  getDetailedAnalytics = asyncHandler(async (req, res) => {
    const analytics = await reportService.getDetailedAnalytics(req.query);
    return ApiResponse.success(res, analytics, `Analytics report for ${analytics.dateRange.formattedLabel} generated successfully`);
  });

  // GET /api/reports/export/csv
  exportCSV = asyncHandler(async (req, res) => {
    const { type = 'sales' } = req.query;
    const { fileName, csvContent } = await reportService.generateCSVReport(type, req.query);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(csvContent);
  });
}

export const reportController = new ReportController();
