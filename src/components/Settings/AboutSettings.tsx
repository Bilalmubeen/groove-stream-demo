import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, FileText, Shield, HelpCircle, Mail } from 'lucide-react';

export default function AboutSettings() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>About BeatSeek</CardTitle>
          <CardDescription>Music discovery platform for the next generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Build:</strong> {new Date().getFullYear()}.1</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legal & Support</CardTitle>
          <CardDescription>Important information and help resources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate('/terms')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Terms of Service
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate('/privacy')}
          >
            <Shield className="w-4 h-4 mr-2" />
            Privacy Policy
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            asChild
          >
            <a href="mailto:support@beatseek.com">
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
            </a>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            asChild
          >
            <a href="https://help.beatseek.com" target="_blank" rel="noopener noreferrer">
              <HelpCircle className="w-4 h-4 mr-2" />
              Help Center
              <ExternalLink className="w-3 h-3 ml-auto" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open Source</CardTitle>
          <CardDescription>BeatSeek is built with open source technology</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" asChild>
            <a href="https://github.com/beatseek" target="_blank" rel="noopener noreferrer">
              View on GitHub
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
