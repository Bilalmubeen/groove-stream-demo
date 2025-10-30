import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TestTube, Calendar, FileBarChart } from 'lucide-react';

interface AnalyticsSettingsProps {
  userId: string;
}

export default function AnalyticsSettings({ userId }: AnalyticsSettingsProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analytics & Insights</CardTitle>
          <CardDescription>
            Track your performance and audience engagement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => navigate('/analytics')}
            className="w-full justify-start"
            variant="outline"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            View Analytics Dashboard
          </Button>
          <p className="text-sm text-muted-foreground">
            Access detailed insights about your snippets, engagement metrics, and audience behavior
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Creator Tools</CardTitle>
          <CardDescription>
            Advanced tools to optimize your content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <TestTube className="w-5 h-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <h4 className="font-medium mb-1">A/B Testing</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Test different versions of your snippets to find what resonates best
                </p>
                <Button
                  onClick={() => navigate('/profile')}
                  size="sm"
                  variant="secondary"
                >
                  Manage Variants
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Calendar className="w-5 h-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <h4 className="font-medium mb-1">Scheduled Uploads</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Schedule your uploads for optimal timing
                </p>
                <Button
                  onClick={() => navigate('/upload')}
                  size="sm"
                  variant="secondary"
                >
                  Schedule Upload
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <FileBarChart className="w-5 h-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <h4 className="font-medium mb-1">Snippet Analytics</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Deep dive into individual snippet performance
                </p>
                <Button
                  onClick={() => navigate('/profile')}
                  size="sm"
                  variant="secondary"
                >
                  View Snippets
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
