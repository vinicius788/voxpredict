import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { VolumePoint } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MarketChartProps {
  data: VolumePoint[];
  type?: 'probability' | 'volume';
  isBrandTheme?: boolean;
}

export const MarketChart: React.FC<MarketChartProps> = ({ data, type = 'probability', isBrandTheme = false }) => {
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM', { locale: ptBR });
  };

  const formatVolume = (value: number) => {
    return `$${(value / 1000).toFixed(0)}k`;
  };

  const chartColors = {
    grid: isBrandTheme ? '#374151' : '#f0f0f0',
    text: isBrandTheme ? '#9CA3AF' : '#666',
    background: isBrandTheme ? '#1F2937' : 'white',
    border: isBrandTheme ? '#374151' : '#e5e7eb'
  };

  if (type === 'volume') {
    return (
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke={chartColors.text}
              fontSize={12}
            />
            <YAxis 
              tickFormatter={formatVolume}
              stroke={chartColors.text}
              fontSize={12}
            />
            <Tooltip 
              labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Volume']}
              contentStyle={{
                backgroundColor: chartColors.background,
                border: `1px solid ${chartColors.border}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                color: chartColors.text
              }}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="#3b82f6"
              fill="url(#volumeGradient)"
              strokeWidth={2}
            />
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke={chartColors.text}
            fontSize={12}
          />
          <YAxis 
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            stroke={chartColors.text}
            fontSize={12}
          />
          <Tooltip 
            labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy', { locale: ptBR })}
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}%`, 
              name === 'simProbability' ? 'SIM' : 'NÃO'
            ]}
            contentStyle={{
              backgroundColor: chartColors.background,
              border: `1px solid ${chartColors.border}`,
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              color: chartColors.text
            }}
          />
          <Line
            type="monotone"
            dataKey="simProbability"
            stroke="#10b981"
            strokeWidth={3}
            dot={false}
            name="SIM"
          />
          <Line
            type="monotone"
            dataKey="naoProbability"
            stroke="#ef4444"
            strokeWidth={3}
            dot={false}
            name="NÃO"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};