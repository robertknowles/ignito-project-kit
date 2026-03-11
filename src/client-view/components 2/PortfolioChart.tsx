import React from 'react';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Home } from 'lucide-react';

export function PortfolioChart() {
  const data = [{
    year: 2025,
    portfolio: 1050000,
    equity: 158000
  }, {
    year: 2026,
    portfolio: 1100000,
    equity: 200000
  }, {
    year: 2027,
    portfolio: 1200000,
    equity: 280000
  }, {
    year: 2028,
    portfolio: 1350000,
    equity: 380000
  }, {
    year: 2029,
    portfolio: 1500000,
    equity: 500000
  }, {
    year: 2030,
    portfolio: 1700000,
    equity: 650000
  }, {
    year: 2031,
    portfolio: 2000000,
    equity: 800000
  }, {
    year: 2032,
    portfolio: 2300000,
    equity: 950000
  }, {
    year: 2033,
    portfolio: 2650000,
    equity: 1100000
  }, {
    year: 2034,
    portfolio: 3050000,
    equity: 1280000
  }, {
    year: 2035,
    portfolio: 3500000,
    equity: 1500000
  }, {
    year: 2036,
    portfolio: 4000000,
    equity: 1750000
  }, {
    year: 2037,
    portfolio: 4550000,
    equity: 2050000
  }, {
    year: 2038,
    portfolio: 5150000,
    equity: 2400000
  }, {
    year: 2039,
    portfolio: 5800000,
    equity: 2800000
  }, {
    year: 2040,
    portfolio: 6500000,
    equity: 3250000
  }];

  return <div>
      <div className="flex items-center gap-2 mb-4">
        <Home className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900" style={{
        fontFamily: 'Figtree, sans-serif'
      }}>
          Portfolio Value & Equity Growth
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="0" stroke="#F3F4F6" strokeOpacity={0.7} vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={value => `$${(value / 1000000).toFixed(1)}M`} />
          <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} contentStyle={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }} />
          <Legend wrapperStyle={{ fontSize: '13px' }} />
          <Line type="monotone" dataKey="portfolio" stroke="#2563EB" strokeWidth={2} name="Portfolio Value" dot={false} />
          <Line type="monotone" dataKey="equity" stroke="#CBD5E1" strokeWidth={1.5} name="Equity" dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-4 flex justify-end gap-8 text-sm">
        <div>
          <span className="text-gray-500">Portfolio: </span>
          <span className="font-semibold text-gray-900">$6.2M</span>
        </div>
        <div>
          <span className="text-gray-500">Equity: </span>
          <span className="font-semibold text-gray-900">$3.3M</span>
        </div>
      </div>
    </div>;
}

