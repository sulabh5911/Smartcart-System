import React, { useState, useEffect, useMemo } from 'react';
import { saleService } from '../services/saleService';
import { returnService } from '../services/returnService';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { FormField, Input, Select, Button } from '../components/Form';
import {
  Search,
  Eye,
  Printer,
  RefreshCw,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  Filter,
  RotateCcw,
  AlertOctagon,
  CheckCircle2,
  Lock,
  ShieldAlert
} from 'lucide-react';

function getReturnRefundAmount(line) {
  const returnedAfterCents = Math.round(
    (line.lineRefundableCents *
      (line.alreadyReturned + (line.returnQuantity || 0))) /
      line.originalQuantity
  );
  const previouslyRefundedCents = Math.round(line.refundedAmount * 100);
  return Math.max(0, returnedAfterCents - previouslyRefundedCents) / 100;
}

function getInvoiceRefundLimit(invoice) {
  return Math.max(
    0,
    (Number(invoice.subtotal) || 0) - (Number(invoice.discountAmount) || 0)
  );
}

function getInvoiceRefundAmount(invoice) {
  const totalRefunded = Math.max(0, Number(invoice.totalRefunded) || 0);
  return Math.min(getInvoiceRefundLimit(invoice), totalRefunded);
}

export default function Sales() {
  const { addToast } = useToast();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Return & Refund Modal states
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [saleForReturn, setSaleForReturn] = useState(null);
  const [returnItemsState, setReturnItemsState] = useState([]);
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Completed Return Receipt Modal
  const [completedReturn, setCompletedReturn] = useState(null);
  const [isReturnReceiptOpen, setIsReturnReceiptOpen] = useState(false);

  const loadSales = async () => {
    try {
      setLoading(true);
      const res = await saleService.getAll({ limit: 100 });
      setSales(res?.data || []);
    } catch (err) {
      addToast('Failed to load sales history from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const openInvoice = (inv) => {
    setSelectedInvoice(inv);
    setIsInvoiceModalOpen(true);
  };

  // Open Return Modal
  const handleOpenReturn = (s) => {
    setSaleForReturn(s);
    const totalRefundableCents = Math.round(getInvoiceRefundLimit(s) * 100);
    const lineWeights = s.items.map((item) =>
      Math.max(
        0,
        Math.round(
          Number(item.itemTotal ?? Number(item.unitPrice) * Number(item.quantity)) * 100
        )
      )
    );
    const totalWeight = lineWeights.reduce((sum, weight) => sum + weight, 0);
    let remainingRefundableCents = totalRefundableCents;
    // Initialize return lines with remaining eligible quantity
    const initialLines = s.items.map((it, index) => {
      const alreadyReturned = it.returnedQuantity || 0;
      const eligible = Math.max(0, it.quantity - alreadyReturned);
      const lineRefundableCents =
        index === s.items.length - 1
          ? remainingRefundableCents
          : totalWeight > 0
          ? Math.round((totalRefundableCents * lineWeights[index]) / totalWeight)
          : 0;
      remainingRefundableCents -= lineRefundableCents;
      return {
        productId: it.product?._id || it.product,
        name: it.name,
        unitPrice: it.unitPrice,
        lineRefundableCents,
        refundedAmount:
          Number(it.refundedAmount) || it.unitPrice * (it.returnedQuantity || 0),
        originalQuantity: it.quantity,
        alreadyReturned,
        eligible,
        returnQuantity: eligible > 0 ? 1 : 0, // default 1 if eligible
        condition: 'Resellable',
        reason: 'Customer return'
      };
    });
    setReturnItemsState(initialLines);
    setIsReturnModalOpen(true);
  };

  const handleReturnItemChange = (idx, field, value) => {
    setReturnItemsState((prev) =>
      prev.map((item, i) => {
        if (i === idx) {
          if (field === 'returnQuantity') {
            const num = Math.max(0, parseInt(value, 10) || 0);
            return { ...item, returnQuantity: Math.min(num, item.eligible) };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Calculated refund total
  const calculatedRefundTotal = useMemo(() => {
    return returnItemsState.reduce((acc, it) => {
      return acc + getReturnRefundAmount(it);
    }, 0);
  }, [returnItemsState]);
  const hasReturnQuantity = returnItemsState.some((item) => item.returnQuantity > 0);

  // Submit Return to Backend
  const handleSubmitReturn = async () => {
    const activeReturnLines = returnItemsState.filter((it) => it.returnQuantity > 0);
    if (activeReturnLines.length === 0) {
      addToast('Please select at least 1 unit to return', 'warning');
      return;
    }

    setIsSubmittingReturn(true);
    const idempotencyKey = `RET-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    try {
      const payload = {
        saleId: saleForReturn._id,
        invoiceNumber: saleForReturn.invoiceNumber,
        items: activeReturnLines.map((it) => ({
          productId: it.productId,
          returnQuantity: it.returnQuantity,
          condition: it.condition,
          reason: it.reason
        })),
        refundMethod,
        processedBy: 'Admin',
        idempotencyKey
      };

      const res = await returnService.processReturn(payload);
      const retRecord = res.data?.saleReturn || res.data;

      setCompletedReturn(retRecord);
      setIsReturnModalOpen(false);
      setIsReturnReceiptOpen(true);
      addToast(`Return ${retRecord.returnNumber} processed! Refund: ₹${retRecord.refundAmount.toFixed(2)}`, 'success');

      // Reload sales to reflect updated status and totalRefunded
      loadSales();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to process return', 'error', 5000);
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        s.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.customerPhone && s.customerPhone.includes(searchTerm));
      const matchMethod = !selectedMethod || s.paymentMethod === selectedMethod;
      return matchSearch && matchMethod;
    });
  }, [sales, searchTerm, selectedMethod]);

  // Aggregate stats
  const totalRevenue = useMemo(() => {
    return sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  }, [sales]);

  const methodBreakdown = useMemo(() => {
    const counts = { Cash: 0, UPI: 0, Card: 0 };
    sales.forEach((s) => {
      if (counts[s.paymentMethod] !== undefined) {
        counts[s.paymentMethod] += s.totalAmount || 0;
      }
    });
    return counts;
  }, [sales]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Sales & Counter Invoices</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Audit Trail
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time ledger of completed transactions, reprint receipts and process customer refunds
          </p>
        </div>

        <button
          onClick={loadSales}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh History</span>
        </button>
      </div>

      {/* Top Ledger Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Total Revenue</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900">₹ {totalRevenue.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{sales.length} Invoices recorded</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Cash Ledger</span>
            <Banknote className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900">₹ {methodBreakdown.Cash.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Physical tender collected</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">UPI Ledger</span>
            <QrCode className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-slate-900">₹ {methodBreakdown.UPI.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">QR / VPA recorded</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Card Ledger</span>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-slate-900">₹ {methodBreakdown.Card.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">POS swipe / chip recorded</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by invoice number or customer name..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Return Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Fetching sales from MongoDB...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No sales matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => {
                  const hasEligibleReturns = s.items.some(
                    (it) => it.quantity > (it.returnedQuantity || 0)
                  );
                  const displayedRefund = getInvoiceRefundAmount(s);
                  return (
                    <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{s.invoiceNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{s.customerName}</div>
                        <div className="text-[10px] text-slate-400">{s.customerPhone || '---'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                        {s.itemsCount}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {s.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        <div>₹ {s.totalAmount?.toFixed(2)}</div>
                        {displayedRefund > 0 && (
                          <div className="text-[10px] text-rose-600 font-semibold">
                            - ₹{displayedRefund.toFixed(2)} refunded
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {s.returnStatus === 'Full' ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Full Return
                          </span>
                        ) : s.returnStatus === 'Partial' ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Partial Return
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Completed
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openInvoice(s)}
                            className="w-7 h-7 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 inline-flex items-center justify-center transition-colors"
                            title="View & Reprint Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenReturn(s)}
                            disabled={!hasEligibleReturns}
                            className={`w-7 h-7 rounded border inline-flex items-center justify-center transition-colors ${
                              hasEligibleReturns
                                ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                                : 'border-slate-200 text-slate-300 cursor-not-allowed'
                            }`}
                            title={hasEligibleReturns ? 'Process Return & Refund' : 'All items already returned'}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal for Viewing & Reprinting */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Supermarket Invoice"
        subtitle={selectedInvoice?.invoiceNumber}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsInvoiceModalOpen(false)}>
              Close
            </Button>
            <Button variant="primary" icon={Printer} onClick={() => window.print()}>
              Reprint Bill
            </Button>
          </>
        }
      >
        {selectedInvoice && (
          <div className="printable-receipt p-5 bg-white border border-slate-200 rounded-lg text-xs font-mono space-y-3 shadow-inner max-w-sm mx-auto">
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <div className="font-black text-base text-slate-900 tracking-tight">SMART MART PRO</div>
              <div className="text-[10px] text-slate-500">Retail Supermarket & Billing Division</div>
              <div className="text-[10px] text-slate-500">GSTIN: 07AAAAA0000A1Z5</div>
            </div>

            {/* Bill Meta */}
            <div className="space-y-0.5 text-[11px] text-slate-700">
              <div className="flex justify-between">
                <span>INVOICE:</span>
                <strong>{selectedInvoice.invoiceNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{new Date(selectedInvoice.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>CUSTOMER:</span>
                <span className="font-semibold">{selectedInvoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>PAYMENT MODE:</span>
                <span className="font-bold uppercase">{selectedInvoice.paymentMethod}</span>
              </div>
            </div>

            {/* Items with FEFO Audit */}
            <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-2">
              <div className="flex justify-between font-bold text-[10.5px] text-slate-500 uppercase">
                <span>Item</span>
                <span>Qty x Rate</span>
                <span>Total</span>
              </div>

              {selectedInvoice.items?.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span className="truncate max-w-[170px]">{it.name}</span>
                    <span className="text-right">₹{it.itemTotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>
                      {it.quantity} {it.unit} @ ₹{it.unitPrice?.toFixed(2)}
                      {it.returnedQuantity > 0 && (
                        <span className="text-rose-600 font-bold ml-1">
                          ({it.returnedQuantity} returned)
                        </span>
                      )}
                    </span>
                    {it.batchesDeducted && it.batchesDeducted.length > 0 && (
                      <span className="font-mono text-[9px] text-emerald-700">
                        Batch: {it.batchesDeducted.map((b) => b.batchNumber).join(', ')} (FEFO)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1 text-[11px] text-slate-700 pt-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{selectedInvoice.subtotal?.toFixed(2)}</span>
              </div>
              {selectedInvoice.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount ({selectedInvoice.discountPercent}%):</span>
                  <span>- ₹{selectedInvoice.discountAmount?.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-900 flex justify-between items-baseline text-slate-900">
                <span className="font-bold text-sm">TOTAL PAID:</span>
                <span className="font-black text-lg">₹{selectedInvoice.totalAmount?.toFixed(2)}</span>
              </div>

              {getInvoiceRefundAmount(selectedInvoice) > 0 && (
                <div className="pt-1 border-t border-dashed border-rose-200 flex justify-between text-rose-600 font-bold">
                  <span>TOTAL REFUNDED:</span>
                  <span>- ₹{getInvoiceRefundAmount(selectedInvoice).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Reprint Stamp */}
            <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-1">
              <div className="font-mono tracking-widest text-[11px] text-slate-800">
                *{selectedInvoice.invoiceNumber}*
              </div>
              <div className="font-semibold text-slate-600 uppercase tracking-wider text-[9px]">
                [DUPLICATE REPRINT BILL]
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Process Return & Refund Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Process Return & Refund"
        subtitle={`Invoice: ${saleForReturn?.invoiceNumber} (${saleForReturn?.customerName})`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitReturn}
              disabled={isSubmittingReturn || !hasReturnQuantity}
            >
              {isSubmittingReturn
                ? 'Processing Return...'
                : calculatedRefundTotal > 0
                ? `Refund ₹${calculatedRefundTotal.toFixed(2)}`
                : 'Process Return (No Refund)'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-tight text-[11px]">
              <strong>Inspection & Shelf-Life Policy:</strong> Items marked as <em>Resellable</em> are restocked into batch inventory ONLY if unexpired. Items marked as <em>Damaged</em> or <em>Expired</em> are quarantined without touching healthy stock.
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-900">Select Items & Return Quantities:</div>
            {returnItemsState.map((line, idx) => (
              <div
                key={idx}
                className="p-3 border border-slate-200 rounded-xl bg-slate-50/60 space-y-2 text-xs"
              >
                <div className="flex justify-between items-baseline font-semibold text-slate-900">
                  <span>{line.name}</span>
                  <span>Rate: ₹{line.unitPrice.toFixed(2)}</span>
                </div>

                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>
                    Purchased: {line.originalQuantity} | Already Returned: {line.alreadyReturned}
                  </span>
                  <span className="font-bold text-blue-600">
                    Max Eligible: {line.eligible} units
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-emerald-700">
                  Refund value after discount (tax excluded): ₹
                  {(line.lineRefundableCents / 100).toFixed(2)}
                  {line.returnQuantity > 0 && (
                    <span className="ml-2">
                      · Refund now: ₹{getReturnRefundAmount(line).toFixed(2)}
                    </span>
                  )}
                </div>

                {line.eligible > 0 ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <FormField label="Qty to Return">
                      <Input
                        type="number"
                        min="0"
                        max={line.eligible}
                        value={line.returnQuantity}
                        onChange={(e) =>
                          handleReturnItemChange(idx, 'returnQuantity', e.target.value)
                        }
                      />
                    </FormField>

                    <FormField label="Inspected Condition">
                      <Select
                        value={line.condition}
                        onChange={(e) =>
                          handleReturnItemChange(idx, 'condition', e.target.value)
                        }
                        options={[
                          { value: 'Resellable', label: 'Resellable (Restock)' },
                          { value: 'Damaged', label: 'Damaged (Quarantine)' },
                          { value: 'Expired', label: 'Expired (Quarantine)' },
                          { value: 'Quarantined', label: 'Quarantined (Defective)' }
                        ]}
                      />
                    </FormField>
                  </div>
                ) : (
                  <div className="text-[11px] text-rose-500 font-semibold pt-1">
                    ✓ All units have already been returned for this line item.
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <FormField label="Refund Tender Method">
              <Select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                options={[
                  { value: 'Cash', label: 'Cash Refund' },
                  { value: 'UPI', label: 'UPI / Bank Transfer' },
                  { value: 'Store Credit', label: 'Store Credit Voucher' }
                ]}
              />
            </FormField>

            <div className="flex flex-col justify-end text-right">
              <span className="text-[11px] text-slate-500">Total Refund Payable:</span>
              <span className="text-xl font-black text-rose-600">
                ₹ {calculatedRefundTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Return Receipt Modal */}
      <Modal
        isOpen={isReturnReceiptOpen}
        onClose={() => setIsReturnReceiptOpen(false)}
        title="Return & Refund Processed"
        subtitle={completedReturn?.returnNumber}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsReturnReceiptOpen(false)}>
              Done
            </Button>
            <Button variant="primary" icon={Printer} onClick={() => window.print()}>
              Print Credit Note
            </Button>
          </>
        }
      >
        {completedReturn && (
          <div className="printable-receipt p-5 bg-white border border-slate-200 rounded-lg text-xs font-mono space-y-3 shadow-inner max-w-sm mx-auto">
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <div className="font-black text-base text-slate-900 tracking-tight">SMART MART PRO</div>
              <div className="text-[10px] text-slate-500">Official Credit Note / Refund Voucher</div>
            </div>

            <div className="space-y-0.5 text-[11px] text-slate-700">
              <div className="flex justify-between">
                <span>RETURN NO:</span>
                <strong>{completedReturn.returnNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span>ORIGINAL INVOICE:</span>
                <strong>{completedReturn.invoiceNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span>CUSTOMER:</span>
                <span>{completedReturn.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>REFUND METHOD:</span>
                <span className="font-bold">{completedReturn.refundMethod}</span>
              </div>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1">
              {completedReturn.items?.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-semibold">
                    <span>{it.name} (x{it.returnQuantity})</span>
                    <span>₹{it.lineRefund?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Condition: {it.condition}</span>
                    <span className={it.restocked ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                      {it.restocked ? 'Restocked to Shelf' : 'Quarantined'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-baseline font-bold text-slate-900 pt-1">
              <span className="text-sm">TOTAL REFUNDED:</span>
              <span className="text-lg font-black text-rose-600">
                ₹{completedReturn.refundAmount?.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
