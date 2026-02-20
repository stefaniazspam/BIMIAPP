import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface MacroChartProps {
  protein: number;
  carbs: number;
  fat: number;
  className?: string;
}

export function MacroChart({ protein, carbs, fat, className }: MacroChartProps) {
  const data = [
    { name: 'Protein', value: protein, color: 'hsl(85, 55%, 45%)' }, // Green
    { name: 'Carbs', value: carbs, color: 'hsl(45, 90%, 55%)' }, // Mustard
    { name: 'Fat', value: fat, color: 'hsl(25, 90%, 55%)' }, // Orange
  ];

  const total = protein + carbs + fat;

  if (total === 0) {
    return (
      <div className={`flex items-center justify-center h-48 w-full bg-muted/20 rounded-xl ${className}`}>
        <p className="text-muted-foreground text-sm">Nessun dato</p>
      </div>
    );
  }

  return (
    <div className={`h-48 w-full ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              backgroundColor: 'var(--card)'
            }} 
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
