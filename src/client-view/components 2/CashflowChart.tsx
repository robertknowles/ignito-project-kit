import React from 'react';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';

export function CashflowChart() {
  const data = [{
    year: 2025,
    cashflow: -32497
  }, {
    year: 2026,
    cashflow: -28000
  }, {
    year: 2027,
    cashflow: -22000
  }, {
    year: 2028,
    cashflow: -15000
  }, {
    year: 2029,
    cashflow: -8000
  }, {
    year: 2030,
    cashflow: 2000
  }, {
    year: 2031,
    cashflow: 12000
  }, {
    year: 2032,
    cashflow: 18000
  }, {
    year: 2033,
    cashflow: 25000
  }, {
    year: 2034,
    cashflow: 32000
  }, {
    year: 2035,
    cashflow: 38000
  }, {
    year: 2036,
    cashflow: 45000
  }, {
    year: 2037,
    cashflow: 52000
  }, {
    year: 2038,
    cashflow: 60000
  }, {
    year: 2039,
    cashflow: 70000
  }, {
    year: 2040,
    cashflow: 80000
  }];

  return <div>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900" style={{
        fontFamily: 'Figtree, sans-serif'
      }}>
          Cashflow Analysis
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="0" stroke="#F3F4F6" strokeOpacity={0.7} vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={value => `$${(value / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} contentStyle={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }} />
          <ReferenceLine y={0} stroke="#E5E7EB" />
          <Bar dataKey="cashflow" fill="#2563EB" radius={[4, 4, 0, 0]} opacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex justify-end text-sm">
        <div>
          <span className="text-gray-500">Income: </span>
          <span className="font-semibold text-gray-900">$80k/year</span>
        </div>
      </div>
    </div>;
}

