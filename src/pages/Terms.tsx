import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
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
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using BeatSeek, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account and password. You agree to accept
                responsibility for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. Content Guidelines</h2>
              <h3 className="text-xl font-medium mb-2">Artists may upload:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Original music content or content they have rights to share</li>
                <li>Audio snippets up to 30 seconds in duration</li>
                <li>Cover art and profile images they own or have license to use</li>
              </ul>

              <h3 className="text-xl font-medium mb-2 mt-4">Prohibited content includes:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Copyrighted material without proper authorization</li>
                <li>Hate speech, harassment, or discriminatory content</li>
                <li>Explicit content without appropriate warnings</li>
                <li>Spam or misleading information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Intellectual Property</h2>
              <p>
                Artists retain all rights to their uploaded content. By uploading content to BeatSeek, you grant us a
                non-exclusive, worldwide license to host, distribute, and display your content on the platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Content Moderation</h2>
              <p>
                BeatSeek reserves the right to review, approve, or remove any content that violates these terms.
                Repeated violations may result in account suspension or termination.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Privacy</h2>
              <p>
                Your use of BeatSeek is also governed by our Privacy Policy. Please review our Privacy Policy to
                understand our practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Limitation of Liability</h2>
              <p>
                BeatSeek shall not be liable for any indirect, incidental, special, consequential, or punitive damages
                resulting from your use or inability to use the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of any material changes
                via email or through the platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Contact</h2>
              <p>
                For questions about these Terms of Service, please contact us at legal@beatseek.app
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
