import { useState } from 'react';
import { SearchInput } from './SearchInput';
import { StatusBadge } from './StatusBadge';
import type { Database } from '../lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];

type BaseRecord = {
  id: string;
  created_at?: string;
};

type Props<T extends BaseRecord> = {
  title: string;
  data: T[];
  columns: {
    header: string;
    key: keyof T | ((item: T) => React.ReactNode);
    width?: string;
  }[];
  onRowClick?: (item: T) => void;
  searchPlaceholder?: string;
  getSearchString?: (item: T) => string;
};

export function HistoryTable<T extends BaseRecord>({
  title,
  data,
  columns,
  onRowClick,
  searchPlaceholder = 'Search...',
  getSearchString = () => '',
}: Props<T>) {
  const [search, setSearch] = useState('');

  const filteredData = data.filter(item =>
    getSearchString(item).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.width ? `w-${column.width}` : ''
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((item) => (
              <tr
                key={item.id}
                className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column, index) => (
                  <td key={index} className="px-6 py-4 whitespace-nowrap">
                    {typeof column.key === 'function'
                      ? column.key(item)
                      : String(item[column.key] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}