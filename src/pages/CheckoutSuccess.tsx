import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle, Loader2, ArrowRight, Server } from 'lucide-react';

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const [countdown, setCountdown] = useState(10);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Auto-redirect to dashboard after countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'nl' ? 'Betaling Geslaagd!' : 'Payment Successful!'}
            </CardTitle>
            <CardDescription className="text-base">
              {language === 'nl' 
                ? 'Bedankt voor je bestelling. Je server wordt nu aangemaakt.' 
                : 'Thank you for your order. Your server is now being created.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">
                  {language === 'nl' ? 'Server Aanmaken...' : 'Creating Server...'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'nl' 
                    ? 'Dit duurt meestal 1-2 minuten' 
                    : 'This usually takes 1-2 minutes'}
                </p>
              </div>
              <Loader2 className="h-5 w-5 animate-spin text-primary ml-auto" />
            </div>

            <div className="space-y-3">
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => navigate('/dashboard')}
              >
                {language === 'nl' ? 'Ga naar Dashboard' : 'Go to Dashboard'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              
              <p className="text-sm text-muted-foreground">
                {language === 'nl' 
                  ? `Automatische doorverwijzing in ${countdown} seconden...` 
                  : `Auto-redirecting in ${countdown} seconds...`}
              </p>
            </div>

            {sessionId && (
              <p className="text-xs text-muted-foreground pt-4 border-t">
                Session ID: {sessionId.slice(0, 20)}...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CheckoutSuccess;
