
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface KPIChartProps {
  data: any[];
  visibleMetrics: string[];
}

const KPIChart: React.FC<KPIChartProps> = ({ data, visibleMetrics }) => {
  const metricConfigs: Record<string, { color: string }> = {
    revenue: { color: '#10B981' },      // Vibrant Green
    calls: { color: '#EC4899' },        // Pink
    appointments: { color: '#818CF8' },   // Indigo
    followUps: { color: '#60A5FA' },      // Blue
    noShows: { color: '#F43F5E' },        // Rose
    closedDeals: { color: '#D4AF37' }     // Gold
  };

  return (
    <div className="h-[250px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            {visibleMetrics.map(m => (
              <linearGradient key={`grad-${m}`} id={`color-${m}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metricConfigs[m]?.color || '#D4AF37'} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={metricConfigs[m]?.color || '#D4AF37'} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#444" 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#444" 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px' }}
            itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
          />
          {visibleMetrics.map(m => (
            <Area 
              key={m}
              type="monotone" 
              dataKey={m} 
              stroke={metricConfigs[m]?.color || '#D4AF37'} 
              fillOpacity={1} 
              fill={`url(#color-${m})`} 
              strokeWidth={3}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default KPIChart;
