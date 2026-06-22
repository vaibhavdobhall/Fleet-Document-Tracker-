'use client';

import { useState, FormEvent } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastType = 'success' | 'error';

interface Toast {
  message: string;
  type: ToastType;
}

// ---------------------------------------------------------------------------
// Document type options
// ---------------------------------------------------------------------------

const DOCUMENT_TYPES = ['Fitness', 'PUC', 'National Permit', 'Insurance', 'Road Tax'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  // ---- Client fields ----
  const [clientName, setClientName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // ---- Vehicle fields ----
  const [vehicleNumber, setVehicleNumber] = useState('');

  // ---- Document fields ----
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [expiryDate, setExpiryDate] = useState('');

  // ---- UI state ----
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const resetForm = () => {
    setClientName('');
    setWhatsappNumber('');
    setVehicleNumber('');
    setDocumentType(DOCUMENT_TYPES[0]);
    setExpiryDate('');
  };

  // -----------------------------------------------------------------------
  // Submit handler
  // -----------------------------------------------------------------------

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setToast(null);

    // --- Basic client-side validation ---
    if (!clientName.trim()) {
      showToast('Client name is required.', 'error');
      setSubmitting(false);
      return;
    }
    if (!vehicleNumber.trim()) {
      showToast('Vehicle number is required.', 'error');
      setSubmitting(false);
      return;
    }
    if (!expiryDate) {
      showToast('Document expiry date is required.', 'error');
      setSubmitting(false);
      return;
    }

    try {
      // Call the server-side API which handles Supabase inserts + WhatsApp confirmation
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          whatsappNumber: whatsappNumber.trim() || undefined,
          vehicleNumber: vehicleNumber.trim(),
          documentType,
          expiryDate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to save. Please try again.', 'error');
        setSubmitting(false);
        return;
      }

      // --- Success ---
      showToast(
        `Client "${clientName}", vehicle "${vehicleNumber}", and document "${documentType}" added successfully!`,
        'success'
      );
      resetForm();
    } catch (err) {
      showToast(`Unexpected error: ${(err as Error).message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* ---- Header ---- */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Fleet Document Tracker
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Admin Dashboard — Add a new client, vehicle, and document in one go.
          </p>
        </div>

        {/* ---- Toast notification ---- */}
        {toast && (
          <div
            className={`mb-6 rounded-lg px-4 py-3 text-sm font-medium shadow-md transition-all ${
              toast.type === 'success'
                ? 'bg-green-50 text-green-800 ring-1 ring-green-400'
                : 'bg-red-50 text-red-800 ring-1 ring-red-400'
            }`}
          >
            {toast.type === 'success' ? '✓ ' : '✗ '}
            {toast.message}
          </div>
        )}

        {/* ---- Form ---- */}
        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-8"
        >
          {/* ============================================================= */}
          {/* Section 1 — Client Details                                    */}
          {/* ============================================================= */}
          <fieldset>
            <legend className="text-base font-semibold text-gray-900">
              1. Client Details
            </legend>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Client Name */}
              <div>
                <label
                  htmlFor="clientName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="clientName"
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Vaibhav Transport"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* WhatsApp Number */}
              <div>
                <label
                  htmlFor="whatsappNumber"
                  className="block text-sm font-medium text-gray-700"
                >
                  WhatsApp Number
                </label>
                <input
                  id="whatsappNumber"
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </fieldset>

          {/* ============================================================= */}
          {/* Section 2 — Vehicle Details                                   */}
          {/* ============================================================= */}
          <fieldset>
            <legend className="text-base font-semibold text-gray-900">
              2. Vehicle Details
            </legend>
            <div className="mt-4">
              <label
                htmlFor="vehicleNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Vehicle Number <span className="text-red-500">*</span>
              </label>
              <input
                id="vehicleNumber"
                type="text"
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. UP16 XX 1234"
                className="mt-1 block w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </fieldset>

          {/* ============================================================= */}
          {/* Section 3 — Document Details                                  */}
          {/* ============================================================= */}
          <fieldset>
            <legend className="text-base font-semibold text-gray-900">
              3. Document Details
            </legend>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Document Type */}
              <div>
                <label
                  htmlFor="documentType"
                  className="block text-sm font-medium text-gray-700"
                >
                  Document Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="documentType"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt} value={dt}>
                      {dt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiry Date */}
              <div>
                <label
                  htmlFor="expiryDate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="expiryDate"
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </fieldset>

          {/* ---- Submit button ---- */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Save Client, Vehicle & Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
