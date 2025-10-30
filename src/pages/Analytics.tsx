import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, Users, PlayCircle, Target, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AnalyticsOverview } from '@/components/Analytics/AnalyticsOverview';
import { AnalyticsCharts } from '@/components/Analytics/AnalyticsCharts';
import { TopSnippets } from '@/components/Analytics/TopSnippets';

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(30);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    checkArtistAndLoadData();
  }, [dateRange]);

  const checkArtistAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: artistProfile } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!artistProfile) {
        toast({
          title: 'Artist account required',
          description: 'Only artists can access analytics',
          variant: 'destructive',
        });
        navigate('/profile');
        return;
      }

      setArtistId(artistProfile.id);
      await loadAnalytics();
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error loading analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('analytics/overview', {
        body: { days: dateRange }
      });

      if (error) throw error;

      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error fetching analytics',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/profile')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-muted-foreground">Track your performance and insights</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={dateRange === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange(7)}
            >
              7D
            </Button>
            <Button
              variant={dateRange === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange(30)}
            >
              30D
            </Button>
            <Button
              variant={dateRange === 90 ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange(90)}
            >
              90D
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <AnalyticsOverview data={analyticsData?.totals} />

        {/* Charts and Details */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-3 gap-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="snippets">Top Snippets</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AnalyticsCharts data={analyticsData?.timeline} />
          </TabsContent>

          <TabsContent value="snippets">
            <TopSnippets snippets={analyticsData?.top_snippets} />
          </TabsContent>

          <TabsContent value="audience">
            <Card>
              <CardHeader>
                <CardTitle>Audience Insights</CardTitle>
                <CardDescription>Coming soon</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Detailed audience demographics and behavior analytics will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
