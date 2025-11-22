import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Paper,
  LinearProgress,
  Stack,
  alpha,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  Euro as EuroIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  AccountBalance as AccountBalanceIcon,
  CreditCard as CreditCardIcon,
  Receipt as ReceiptIcon,
  Info as InfoIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// EU Country Codes
const EU_COUNTRIES = [
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
];

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501+', label: '500+ employees' },
];

const PAYMENT_METHODS = [
  {
    id: 'invoice',
    name: 'Invoice by Email',
    description: 'Net 30 payment terms, best for enterprises',
    icon: ReceiptIcon,
    recommended: true,
  },
  {
    id: 'stripe',
    name: 'Stripe (iDEAL)',
    description: 'Instant activation with iDEAL and SEPA',
    icon: CreditCardIcon,
    recommended: false,
  },
  {
    id: 'sumup',
    name: 'SumUp',
    description: 'Lower fees for small businesses',
    icon: AccountBalanceIcon,
    recommended: false,
  },
];

// Validation schema
const waitlistSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  vatNumber: z.string()
    .min(8, 'VAT number must be at least 8 characters')
    .regex(/^[A-Z]{2}/, 'VAT number must start with country code (e.g., NL123456789)'),
  companyRegistrationNumber: z.string().optional(),
  contactName: z.string().min(2, 'Contact name is required'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().optional(),
  countryCode: z.string().length(2, 'Please select a country'),
  industry: z.string().optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '501+']),
  preferredPaymentMethod: z.enum(['invoice', 'stripe', 'sumup']),
  interestedPlan: z.enum(['pro', 'premium']),
  notes: z.string().optional(),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

export const BillingComingSoon: React.FC = () => {
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [vatValidation, setVatValidation] = useState<{
    valid?: boolean;
    companyName?: string;
  } | null>(null);

  const { control, handleSubmit, formState: { errors }, watch } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      preferredPaymentMethod: 'invoice',
      interestedPlan: 'pro',
      companySize: '11-50',
    },
  });

  const selectedPaymentMethod = watch('preferredPaymentMethod');

  const onSubmit = async (data: WaitlistFormData) => {
    setIsSubmitting(true);
    try {
      // Insert waitlist entry
      const { data: waitlistEntry, error } = await supabase
        .from('billing_waitlist')
        .insert({
          company_name: data.companyName,
          vat_number: data.vatNumber,
          company_registration_number: data.companyRegistrationNumber,
          contact_name: data.contactName,
          contact_email: data.contactEmail,
          contact_phone: data.contactPhone,
          country_code: data.countryCode,
          industry: data.industry,
          company_size: data.companySize,
          preferred_payment_method: data.preferredPaymentMethod,
          interested_plan: data.interestedPlan,
          notes: data.notes,
          vat_valid: vatValidation?.valid || false,
          vat_company_name: vatValidation?.companyName,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Successfully joined the waitlist!');
      setIsSuccess(true);

      // TODO: Send confirmation email via edge function
      // await supabase.functions.invoke('send-waitlist-confirmation', {
      //   body: { waitlistId: waitlistEntry.id }
      // });
    } catch (error) {
      console.error('Waitlist submission error:', error);
      toast.error('Failed to join waitlist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateVAT = async (vatNumber: string, countryCode: string) => {
    try {
      // TODO: Implement VAT validation via edge function
      // const { data } = await supabase.functions.invoke('validate-vat', {
      //   body: { vatNumber, countryCode }
      // });
      // setVatValidation(data);

      // Mock validation for now
      setVatValidation({
        valid: true,
        companyName: 'Mock Company B.V.',
      });
    } catch (error) {
      console.error('VAT validation error:', error);
    }
  };

  if (isSuccess) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', py: 8, px: 3 }}>
        <Card sx={{ textAlign: 'center', p: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" fontWeight={700} gutterBottom>
            You're on the List!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Thank you for your interest in Eryxon Flow's professional billing system.
            We've sent a confirmation email with next steps.
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>What happens next?</strong>
              <br />
              1. Our team will review your application within 2-3 business days
              <br />
              2. We'll validate your VAT number via EU VIES
              <br />
              3. You'll receive an email with approval status and setup instructions
            </Typography>
          </Alert>
          <Button
            variant="outlined"
            size="large"
            href="/"
            sx={{ mt: 2 }}
          >
            Return to Home
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 6, px: 3 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Chip
          label="Coming Soon"
          color="primary"
          sx={{ mb: 2, fontWeight: 600 }}
        />
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Professional Billing for EU Businesses
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Multiple payment options • Euro currency only • B2B focused
        </Typography>

        {/* Key Features */}
        <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ mb: 4 }}>
          <Chip icon={<EuroIcon />} label="EUR Currency Only" variant="outlined" />
          <Chip icon={<BusinessIcon />} label="B2B Accounts" variant="outlined" />
          <Chip icon={<CheckCircleIcon />} label="EU Only" variant="outlined" />
        </Stack>
      </Box>

      <Grid container spacing={4}>
        {/* Payment Methods Overview */}
        <Grid item xs={12}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Choose Your Payment Method
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              return (
                <Grid item xs={12} md={4} key={method.id}>
                  <Paper
                    sx={{
                      p: 3,
                      height: '100%',
                      border: method.recommended ? `2px solid ${theme.palette.primary.main}` : '1px solid',
                      borderColor: method.recommended ? 'primary.main' : 'divider',
                      position: 'relative',
                    }}
                  >
                    {method.recommended && (
                      <Chip
                        label="Recommended"
                        size="small"
                        color="primary"
                        sx={{ position: 'absolute', top: 16, right: 16 }}
                      />
                    )}
                    <Icon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {method.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {method.description}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Grid>

        {/* Waitlist Form */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Join the Waitlist
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Fill out the form below to be notified when professional billing launches.
                We'll validate your business details and contact you with next steps.
              </Typography>

              {isSubmitting && <LinearProgress sx={{ mb: 3 }} />}

              <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                  {/* Company Information */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Company Information
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="companyName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Company Name"
                          fullWidth
                          required
                          error={!!errors.companyName}
                          helperText={errors.companyName?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="countryCode"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth required error={!!errors.countryCode}>
                          <InputLabel>Country</InputLabel>
                          <Select {...field} label="Country">
                            {EU_COUNTRIES.map((country) => (
                              <MenuItem key={country.code} value={country.code}>
                                {country.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.countryCode && (
                            <Typography variant="caption" color="error">
                              {errors.countryCode.message}
                            </Typography>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="vatNumber"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="EU VAT Number"
                          fullWidth
                          required
                          placeholder="NL123456789B01"
                          error={!!errors.vatNumber}
                          helperText={errors.vatNumber?.message || 'Format: Country code + number (e.g., NL123456789B01)'}
                        />
                      )}
                    />
                    {vatValidation?.valid && (
                      <Alert severity="success" sx={{ mt: 1 }}>
                        VAT Number Valid: {vatValidation.companyName}
                      </Alert>
                    )}
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="companyRegistrationNumber"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Company Registration Number"
                          fullWidth
                          helperText="Optional: Chamber of Commerce number, etc."
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="companySize"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth required>
                          <InputLabel>Company Size</InputLabel>
                          <Select {...field} label="Company Size">
                            {COMPANY_SIZES.map((size) => (
                              <MenuItem key={size.value} value={size.value}>
                                {size.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="industry"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Industry"
                          fullWidth
                          placeholder="e.g., Manufacturing, Engineering"
                        />
                      )}
                    />
                  </Grid>

                  {/* Contact Information */}
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Contact Information
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="contactName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Contact Name"
                          fullWidth
                          required
                          error={!!errors.contactName}
                          helperText={errors.contactName?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="contactEmail"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Business Email"
                          type="email"
                          fullWidth
                          required
                          error={!!errors.contactEmail}
                          helperText={errors.contactEmail?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="contactPhone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Phone Number"
                          fullWidth
                          placeholder="+31 20 123 4567"
                        />
                      )}
                    />
                  </Grid>

                  {/* Preferences */}
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Preferences
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="preferredPaymentMethod"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth required>
                          <InputLabel>Preferred Payment Method</InputLabel>
                          <Select {...field} label="Preferred Payment Method">
                            {PAYMENT_METHODS.map((method) => (
                              <MenuItem key={method.id} value={method.id}>
                                {method.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="interestedPlan"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth required>
                          <InputLabel>Interested Plan</InputLabel>
                          <Select {...field} label="Interested Plan">
                            <MenuItem value="pro">Pro - €97/month</MenuItem>
                            <MenuItem value="premium">Premium - €497/month</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="notes"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Additional Notes"
                          fullWidth
                          multiline
                          rows={3}
                          placeholder="Any specific requirements or questions?"
                        />
                      )}
                    />
                  </Grid>

                  {/* Submit */}
                  <Grid item xs={12}>
                    <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
                      By submitting this form, you agree that we will validate your VAT number
                      via the EU VIES system and contact you regarding your application.
                    </Alert>

                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={isSubmitting}
                      startIcon={isSubmitting ? <CircularProgress size={20} /> : <SendIcon />}
                    >
                      {isSubmitting ? 'Submitting...' : 'Join Waitlist'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Benefits */}
        <Grid item xs={12}>
          <Card sx={{ background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)` }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                What to Expect
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    1. Quick Review
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    We'll review your application and validate your VAT number within 2-3 business days.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    2. Approval & Setup
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Once approved, you'll receive setup instructions for your chosen payment method.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    3. Go Live
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start using professional billing with automatic invoicing and payment tracking.
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BillingComingSoon;
