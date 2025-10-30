import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, Trash2, Play } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function VariantManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [snippet, setSnippet] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [activeTest, setActiveTest] = useState<any>(null);
  
  // Test configuration
  const [trafficSplit, setTrafficSplit] = useState(50);
  const [testDuration, setTestDuration] = useState(7);
  const [successMetric, setSuccessMetric] = useState('completion_rate');

  useEffect(() => {
    loadSnippetAndVariants();
  }, [id]);

  const loadSnippetAndVariants = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Load snippet
      const { data: snippetData, error: snippetError } = await supabase
        .from('snippets')
        .select('*, artist_profiles!inner(user_id)')
        .eq('id', id)
        .single();

      if (snippetError) throw snippetError;

      if (snippetData.artist_profiles.user_id !== user.id) {
        toast({
          title: 'Unauthorized',
          variant: 'destructive',
        });
        navigate('/profile');
        return;
      }

      setSnippet(snippetData);

      // Load variants
      const { data: variantsData } = await supabase
        .from('snippet_variants')
        .select('*')
        .eq('parent_snippet_id', id)
        .order('created_at', { ascending: false });

      setVariants(variantsData || []);

      // Load active test
      const { data: testData } = await supabase
        .from('ab_test_results')
        .select('*')
        .eq('snippet_id', id)
        .is('concluded_at', null)
        .maybeSingle();

      setActiveTest(testData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error loading data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async () => {
    if (variants.length < 2) {
      toast({
        title: 'Need at least 2 variants',
        description: 'Upload another variant to start A/B testing',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('ab_test_results')
        .insert({
          snippet_id: id,
          variant_a_id: variants[0].id,
          variant_b_id: variants[1].id,
          metric_name: successMetric,
          test_duration_days: testDuration,
        });

      if (error) throw error;

      toast({
        title: 'A/B test started',
        description: `Test will run for ${testDuration} days`,
      });

      loadSnippetAndVariants();
    } catch (error) {
      console.error('Error starting test:', error);
      toast({
        title: 'Error starting test',
        variant: 'destructive',
      });
    }
  };

  const handleCalculateResults = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('calculate-ab-results', {
        body: { test_id: activeTest.id }
      });

      if (error) throw error;

      toast({
        title: 'Test results calculated',
        description: data.is_significant 
          ? `Variant ${data.winner_id === activeTest.variant_a_id ? 'A' : 'B'} wins with ${data.confidence}% confidence`
          : 'No significant difference found',
      });

      loadSnippetAndVariants();
    } catch (error) {
      console.error('Error calculating results:', error);
      toast({
        title: 'Error calculating results',
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
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/analytics')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">A/B Test Management</h1>
            <p className="text-muted-foreground">{snippet?.title}</p>
          </div>
        </div>

        {/* Variants List */}
        <Card>
          <CardHeader>
            <CardTitle>Variants ({variants.length})</CardTitle>
            <CardDescription>Manage different versions of your snippet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {variants.map((variant, index) => (
              <div key={variant.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center font-bold">
                    {variant.label || String.fromCharCode(65 + index)}
                  </div>
                  <div>
                    <p className="font-medium">Variant {variant.label || String.fromCharCode(65 + index)}</p>
                    <p className="text-sm text-muted-foreground">
                      {variant.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="outline" className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload New Variant
            </Button>
          </CardContent>
        </Card>

        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>Set up your A/B test parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Traffic Split</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="range"
                  min="0"
                  max="100"
                  value={trafficSplit}
                  onChange={(e) => setTrafficSplit(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-20 text-sm">
                  {trafficSplit}% / {100 - trafficSplit}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Test Duration</Label>
              <Select value={String(testDuration)} onValueChange={(v) => setTestDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Success Metric</Label>
              <Select value={successMetric} onValueChange={setSuccessMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completion_rate">Completion Rate</SelectItem>
                  <SelectItem value="engagement_score">Engagement Score</SelectItem>
                  <SelectItem value="cta_click_rate">CTA Click Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!activeTest ? (
              <Button onClick={handleStartTest} className="w-full">
                Start A/B Test
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Test is currently running</p>
                <Button onClick={handleCalculateResults} variant="outline" className="w-full">
                  Calculate Results
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
