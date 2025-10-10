import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Information We Collect</h2>
              
              <h3 className="text-xl font-medium mb-2">Account Information</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Email address</li>
                <li>Username</li>
                <li>Profile information (bio, avatar)</li>
              </ul>

              <h3 className="text-xl font-medium mb-2 mt-4">Content</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Audio snippets you upload</li>
                <li>Cover art and images</li>
                <li>Comments and interactions</li>
              </ul>

              <h3 className="text-xl font-medium mb-2 mt-4">Usage Data</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Engagement metrics (plays, likes, shares)</li>
                <li>Search queries and filters</li>
                <li>Device and browser information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To provide and improve our services</li>
                <li>To personalize your experience and recommendations</li>
                <li>To communicate with you about updates and features</li>
                <li>To ensure platform security and prevent fraud</li>
                <li>To analyze usage patterns and optimize performance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. Information Sharing</h2>
              <p>We do not sell your personal information. We may share information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>With your consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
                <li>With service providers who assist in operating our platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your data, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Encrypted data transmission (HTTPS)</li>
                <li>Secure authentication with Supabase</li>
                <li>Row-level security on database access</li>
                <li>Regular security audits</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and data</li>
                <li>Export your data</li>
                <li>Opt-out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Cookies and Tracking</h2>
              <p>
                We use essential cookies for authentication and preferences. We do not use third-party advertising
                cookies. You can control cookie settings through your browser.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Data Retention</h2>
              <p>
                We retain your information as long as your account is active or as needed to provide services.
                Deleted content is removed from our servers within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Children's Privacy</h2>
              <p>
                BeatSeek is not intended for users under 13 years of age. We do not knowingly collect information
                from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes via
                email or platform notification.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Contact Us</h2>
              <p>
                For privacy-related questions or to exercise your rights, contact us at privacy@beatseek.app
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
