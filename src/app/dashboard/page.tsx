import { createClient } from '@supabase/supabase-js';
import { daysUntil } from '@/lib/ist';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardDocument {
  id: string;
  document_type: string;
  expiry_date: string;
  status: string;
  vehicle: {
    vehicle_number: string;
    client: {
      name: string;
    } | null;
  } | null;
}

type BadgeColor = 'green' | 'yellow' | 'red';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the badge colour and human-readable label based on how many days
 * remain until the document expires.
 *
 * Uses dayjs with the `Asia/Kolkata` timezone so the calculation is correct
 * even when the server's clock is UTC but the user is in India.
 */
function computeStatus(expiryDateStr: string): { label: string; color: BadgeColor } {
  const daysLeft = daysUntil(expiryDateStr);

  if (daysLeft <= 0) {
    return { label: 'Expired', color: 'red' };
  }
  if (daysLeft <= 3) {
    return { label: `Expiring in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`, color: 'red' };
  }
  if (daysLeft <= 30) {
    return { label: `${daysLeft} days left`, color: 'yellow' };
  }
  return { label: `${daysLeft} days left`, color: 'green' };
}

// ---------------------------------------------------------------------------
// Badge component
// ---------------------------------------------------------------------------

function StatusBadge({ label, color }: { label: string; color: BadgeColor }) {
  const colorClasses: Record<BadgeColor, string> = {
    green: 'bg-green-100 text-green-800 ring-green-500/20',
    yellow: 'bg-yellow-100 text-yellow-800 ring-yellow-500/20',
    red: 'bg-red-100 text-red-800 ring-red-500/20',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${colorClasses[color]}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Server Component — Dashboard
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  let documents: DashboardDocument[] = [];
  let fetchError: string | null = null;

  if (!supabaseUrl || !supabaseKey) {
    fetchError = 'Supabase credentials not configured.';
  } else {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('Documents')
      .select(
        `
          id,
          document_type,
          expiry_date,
          status,
          vehicle:Vehicles!vehicle_id (
            vehicle_number,
            client:Clients!client_id (
              name
            )
          )
        `,
      )
      .order('expiry_date', { ascending: true });

    if (error) {
      fetchError = error.message;
    } else {
      documents = (data ?? []) as unknown as DashboardDocument[];
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* ---- Header ---- */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Fleet Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Overview of all vehicles and their document expiry status.
          </p>
        </div>

        {/* ---- Error state ---- */}
        {fetchError && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-400">
            Failed to load data: {fetchError}
          </div>
        )}

        {/* ---- Empty state ---- */}
        {!fetchError && documents.length === 0 && (
          <div className="rounded-lg bg-white px-6 py-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-500">
              No documents found. Add a vehicle and document from the{' '}
              <a href="/" className="font-medium text-indigo-600 hover:text-indigo-500">
                admin form
              </a>
              .
            </p>
          </div>
        )}

        {/* ---- Data table ---- */}
        {documents.length > 0 && (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Client Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Vehicle Number
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Document Type
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Expiry Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {documents.map((doc) => {
                    const clientName = doc.vehicle?.client?.name ?? '—';
                    const vehicleNumber = doc.vehicle?.vehicle_number ?? '—';
                    const { label, color } = computeStatus(doc.expiry_date);

                    return (
                      <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {clientName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 font-mono">
                          {vehicleNumber}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                          {doc.document_type}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                          {doc.expiry_date}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <StatusBadge label={label} color={color} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ---- Footer summary ---- */}
            <div className="border-t border-gray-100 px-6 py-3 text-xs text-gray-400">
              Showing {documents.length} document{documents.length === 1 ? '' : 's'} — ordered by expiry date (soonest first).
            </div>
          </div>
        )}
      </div>
    </div>
  );
}