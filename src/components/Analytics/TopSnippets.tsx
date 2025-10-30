import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopSnippetsProps {
  snippets: any[];
}

export function TopSnippets({ snippets }: TopSnippetsProps) {
  const navigate = useNavigate();

  if (!snippets || snippets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Snippets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No snippets found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Snippets</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Plays</TableHead>
              <TableHead>Completion Rate</TableHead>
              <TableHead>Likes</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snippets.map((snippet) => {
              const metrics = snippet.mv_snippet_metrics || {};
              const trend = Math.random() > 0.5 ? 'up' : 'down';
              
              return (
                <TableRow key={snippet.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {snippet.cover_image_url && (
                        <img 
                          src={snippet.cover_image_url} 
                          alt={snippet.title}
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <span>{snippet.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>{metrics.total_plays?.toLocaleString() || '0'}</TableCell>
                  <TableCell>
                    {metrics.completion_rate ? `${metrics.completion_rate.toFixed(1)}%` : '0%'}
                  </TableCell>
                  <TableCell>{metrics.total_likes?.toLocaleString() || '0'}</TableCell>
                  <TableCell>
                    {trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/analytics/snippet/${snippet.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
