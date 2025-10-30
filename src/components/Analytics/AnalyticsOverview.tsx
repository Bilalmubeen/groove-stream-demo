import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayCircle, Heart, Share2, Save, Users, TrendingUp } from 'lucide-react';

interface AnalyticsOverviewProps {
  data: any;
}

export function AnalyticsOverview({ data }: AnalyticsOverviewProps) {
  if (!data) return null;

  const metrics = [
    {
      title: 'Total Plays',
      value: data.plays?.toLocaleString() || '0',
      icon: PlayCircle,
      change: '+12.5%',
    },
    {
      title: 'Unique Listeners',
      value: data.unique_listeners?.toLocaleString() || '0',
      icon: Users,
      change: '+8.2%',
    },
    {
      title: 'Completion Rate',
      value: `${data.completion_rate || 0}%`,
      icon: TrendingUp,
      change: '+3.1%',
    },
    {
      title: 'Total Likes',
      value: data.likes?.toLocaleString() || '0',
      icon: Heart,
      change: '+15.3%',
    },
    {
      title: 'Shares',
      value: data.shares?.toLocaleString() || '0',
      icon: Share2,
      change: '+9.7%',
    },
    {
      title: 'Saves',
      value: data.saves?.toLocaleString() || '0',
      icon: Save,
      change: '+11.2%',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {metric.title}
            </CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">{metric.change}</span> from last period
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
