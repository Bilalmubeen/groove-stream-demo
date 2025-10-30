import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AnalyticsChartsProps {
  data: any[];
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Timeline</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Format data for charts
  const chartData = data.map((item) => ({
    date: new Date(item.metric_date || item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    plays: item.plays || 0,
    completions: item.completions || 0,
    likes: item.likes || 0,
    shares: item.shares || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Plays Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Plays Over Time</CardTitle>
          <CardDescription>Daily play count and completion rate</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))' 
                }} 
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="plays" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary) / 0.2)" 
                name="Plays"
              />
              <Area 
                type="monotone" 
                dataKey="completions" 
                stroke="hsl(var(--chart-2))" 
                fill="hsl(var(--chart-2) / 0.2)" 
                name="Completions"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Breakdown</CardTitle>
          <CardDescription>Likes and shares over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))' 
                }} 
              />
              <Legend />
              <Bar dataKey="likes" fill="hsl(var(--chart-1))" name="Likes" />
              <Bar dataKey="shares" fill="hsl(var(--chart-3))" name="Shares" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Funnel</CardTitle>
          <CardDescription>User journey from play to engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))' 
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey="plays" stroke="hsl(var(--primary))" name="Plays" />
              <Line type="monotone" dataKey="completions" stroke="hsl(var(--chart-2))" name="Completions" />
              <Line type="monotone" dataKey="likes" stroke="hsl(var(--chart-1))" name="Likes" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
