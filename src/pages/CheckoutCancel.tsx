import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react';

const CheckoutCancel = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">
              {language === 'nl' ? 'Betaling Geannuleerd' : 'Payment Cancelled'}
            </CardTitle>
            <CardDescription className="text-base">
              {language === 'nl' 
                ? 'Je betaling is niet voltooid. Er is geen geld afgeschreven.' 
                : 'Your payment was not completed. No charges were made.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {language === 'nl' ? 'Terug naar bestelling' : 'Back to order'}
            </Button>
            
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => navigate('/contact')}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              {language === 'nl' ? 'Hulp nodig?' : 'Need help?'}
            </Button>

            <p className="text-sm text-muted-foreground pt-4">
              {language === 'nl' 
                ? 'Als je problemen ondervindt met betalen, neem dan contact met ons op.' 
                : 'If you are experiencing issues with payment, please contact us.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CheckoutCancel;
