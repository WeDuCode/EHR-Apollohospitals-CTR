import type { PatientStatus } from '../lib/database.types';

const statusColors: Record<PatientStatus, { bg: string; text: string }> = {
  registered: { bg: 'bg-gray-100', text: 'text-gray-800' },
  checked: { bg: 'bg-blue-100', text: 'text-blue-800' },
  diagnosed: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  prescribed: { bg: 'bg-green-100', text: 'text-green-800' },
};

type Props = {
  status: PatientStatus;
};

export function StatusBadge({ status }: Props) {
  const { bg, text } = statusColors[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}