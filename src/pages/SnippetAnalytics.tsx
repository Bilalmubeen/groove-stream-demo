import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AnalyticsOverview } from '@/components/Analytics/AnalyticsOverview';
import { AnalyticsCharts } from '@/components/Analytics/AnalyticsCharts';

export default function SnippetAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [snippetData, setSnippetData] = useState<any>(null);

  useEffect(() => {
    loadSnippetAnalytics();
  }, [id]);

  const loadSnippetAnalytics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('analytics/snippet', {
        body: { snippet_id: id }
      });

      if (error) throw error;

      setSnippetData(data);
    } catch (error) {
      console.error('Error loading snippet analytics:', error);
      toast({
        title: 'Error loading analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!snippetData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/analytics')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{snippetData.snippet?.title}</h1>
            <p className="text-muted-foreground">Detailed analytics</p>
          </div>
        </div>

        {/* Snippet Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Unique Listeners</p>
                <p className="text-2xl font-bold">{snippetData.unique_listeners?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Watch Time</p>
                <p className="text-2xl font-bold">{Math.round(snippetData.avg_watch_time / 1000)}s</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">
                  {snippetData.funnel.play_starts > 0 
                    ? ((snippetData.funnel.completions / snippetData.funnel.play_starts) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Engagement Rate</p>
                <p className="text-2xl font-bold">
                  {snippetData.funnel.play_starts > 0 
                    ? ((snippetData.funnel.likes / snippetData.funnel.play_starts) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Funnel</CardTitle>
            <CardDescription>User journey from impression to engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(snippetData.funnel).map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-center gap-4">
                  <span className="w-32 text-sm capitalize">{key.replace('_', ' ')}</span>
                  <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                    <div 
                      className="bg-primary h-full flex items-center justify-end px-2 text-xs font-medium text-primary-foreground"
                      style={{ width: `${Math.min((value / snippetData.funnel.play_starts) * 100, 100)}%` }}
                    >
                      {value > 0 && value.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline Charts */}
        <AnalyticsCharts data={snippetData.timeline} />

        {/* A/B Test Results */}
        {snippetData.ab_test && (
          <Card>
            <CardHeader>
              <CardTitle>A/B Test Results</CardTitle>
              <CardDescription>Comparing variant performance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Test is {snippetData.ab_test.concluded_at ? 'completed' : 'in progress'}
              </p>
              {snippetData.ab_test.winner_id && (
                <p className="text-sm mt-2">
                  Winner: Variant {snippetData.ab_test.winner_id === snippetData.ab_test.variant_a_id ? 'A' : 'B'}
                  {' '}with {snippetData.ab_test.confidence_score}% confidence
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
