import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  LinearProgress,
  Button,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Divider,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Email as EmailIcon,
  Info as InfoIcon,
  Upgrade as UpgradeIcon,
  CloudUpload as CloudUploadIcon,
  Work as WorkIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useSubscription } from '../hooks/useSubscription';

const pricingTiers = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for small shops getting started',
    features: [
      '100 jobs per month',
      '1,000 parts per month',
      '5 GB file storage',
      'Multi-tenant architecture',
      'Community support (docs only)',
      'Basic workflow tracking',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 499,
    popular: true,
    description: 'For growing shops with higher volume',
    features: [
      'Unlimited jobs',
      'Unlimited parts',
      '50 GB file storage',
      'Multi-tenant architecture',
      'Priority email support',
      'Advanced analytics',
      'API access',
      'Webhook integrations',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 1999,
    description: 'Enterprise-grade security and control',
    features: [
      'Everything in Pro',
      'Unlimited storage',
      'Single-tenant architecture',
      'Self-hosted option available',
      'SSO/SAML authentication',
      'Dedicated support channel',
      'Custom SLA',
      'White-label options',
      'Advanced security controls',
    ],
  },
];

export const MyPlan: React.FC = () => {
  const theme = useTheme();
  const { subscription, usageStats, loading, error, getPlanDisplayName, getUsagePercentage, isAtLimit } = useSubscription();

  const handleUpgradeRequest = (planName: string) => {
    const subject = encodeURIComponent(`Upgrade Request - ${planName} Plan`);
    const body = encodeURIComponent(
      `Hi Sheet Metal Connect Team,\n\nI would like to upgrade my account to the ${planName} plan.\n\nCurrent Plan: ${subscription ? getPlanDisplayName(subscription.plan) : 'Unknown'}\nTenant ID: ${subscription?.tenant_id || 'N/A'}\n\nPlease let me know the next steps.\n\nThank you!`
    );
    window.location.href = `mailto:office@sheetmetalconnect.com?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Layout>
    );
  }

  const currentPlan = subscription?.plan || 'free';
  const currentTier = pricingTiers.find(tier => tier.id === currentPlan);

  return (
    <Layout>
      <Box sx={{ pb: 8 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            My Plan & Usage
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your subscription and monitor your usage
          </Typography>
        </Box>

        {/* Current Plan Overview */}
        <Card
          sx={{
            mb: 4,
            background: currentPlan === 'premium'
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : currentPlan === 'pro'
              ? `linear-gradient(135deg, ${alpha('#8b5cf6', 0.9)} 0%, ${alpha('#6366f1', 0.9)} 100%)`
              : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="h5" fontWeight={700}>
                    {currentTier?.name || 'Unknown'} Plan
                  </Typography>
                  {currentTier?.popular && (
                    <Chip
                      label="Most Popular"
                      size="small"
                      sx={{
                        backgroundColor: alpha('#fff', 0.2),
                        color: '#fff',
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>
                <Typography variant="body1" sx={{ mb: 2, opacity: 0.95 }}>
                  {currentTier?.description}
                </Typography>
                <Typography variant="h3" fontWeight={700}>
                  ${currentTier?.price || 0}
                  <Typography component="span" variant="h6" sx={{ opacity: 0.8, ml: 1 }}>
                    / month
                  </Typography>
                </Typography>
              </Grid>
              <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                {currentPlan !== 'premium' && (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<UpgradeIcon />}
                    onClick={() => handleUpgradeRequest(currentPlan === 'free' ? 'Pro' : 'Premium')}
                    sx={{
                      backgroundColor: '#fff',
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      px: 4,
                      py: 1.5,
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.9),
                      },
                    }}
                  >
                    Upgrade Plan
                  </Button>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Usage Statistics */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <TrendingUpIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Usage This Month
                  </Typography>
                </Box>

                {/* Parts Usage */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InventoryIcon fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight={600}>
                        Parts
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {usageStats?.parts_this_month || 0} / {subscription?.max_parts_per_month || '∞'}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage(usageStats?.parts_this_month || 0, subscription?.max_parts_per_month || null)}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: isAtLimit(usageStats?.parts_this_month || 0, subscription?.max_parts_per_month || null)
                          ? theme.palette.error.main
                          : theme.palette.primary.main,
                      },
                    }}
                  />
                  {isAtLimit(usageStats?.parts_this_month || 0, subscription?.max_parts_per_month || null) && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      You've reached your monthly parts limit. Consider upgrading to continue.
                    </Alert>
                  )}
                </Box>

                {/* Jobs Usage */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WorkIcon fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight={600}>
                        Total Jobs
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {usageStats?.total_jobs || 0} {subscription?.max_jobs && `/ ${subscription.max_jobs}`}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage(usageStats?.total_jobs || 0, subscription?.max_jobs || null)}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: isAtLimit(usageStats?.total_jobs || 0, subscription?.max_jobs || null)
                          ? theme.palette.error.main
                          : theme.palette.success.main,
                      },
                    }}
                  />
                </Box>

                {/* Storage Usage */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CloudUploadIcon fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight={600}>
                        Storage
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {(subscription?.current_storage_gb || 0).toFixed(2)} GB / {subscription?.max_storage_gb || '∞'} GB
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage(subscription?.current_storage_gb || 0, subscription?.max_storage_gb || null)}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: isAtLimit(subscription?.current_storage_gb || 0, subscription?.max_storage_gb || null)
                          ? theme.palette.error.main
                          : theme.palette.info.main,
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {usageStats?.active_jobs || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active Jobs
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {usageStats?.completed_jobs || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Completed Jobs
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="info.main">
                    {usageStats?.total_operators || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Operators
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="secondary.main">
                    {usageStats?.total_admins || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Admins
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Plan Features & Upgrade Options */}
          <Grid item xs={12} lg={4}>
            {/* Current Plan Features */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Plan Features
                </Typography>
                <List dense>
                  {currentTier?.features.map((feature, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircleIcon fontSize="small" color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={feature}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: 500,
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            {/* Upgrade Info */}
            {currentPlan !== 'premium' && (
              <Card
                sx={{
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <InfoIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Ready to Upgrade?
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {currentPlan === 'free'
                      ? 'Unlock unlimited jobs, parts, and advanced features with Pro or Premium.'
                      : 'Get enterprise-grade security, SSO, and self-hosting with Premium.'}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Contact us to upgrade:
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<EmailIcon />}
                    onClick={() => handleUpgradeRequest(currentPlan === 'free' ? 'Pro' : 'Premium')}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Request Upgrade
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                    No sales calls. Simple email-based upgrades.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>

        {/* Security & Architecture Notice */}
        <Alert
          severity="info"
          icon={<InfoIcon />}
          sx={{
            mt: 4,
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <Typography variant="body2" fontWeight={600} gutterBottom>
            {currentPlan === 'premium' ? 'Single-Tenant Architecture' : 'Multi-Tenant Architecture'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {currentPlan === 'premium'
              ? 'Your data is isolated in a dedicated environment with enterprise-grade security controls. You have the option for self-hosted deployment.'
              : 'Your data is securely isolated in a shared infrastructure. Upgrade to Premium for single-tenant architecture and self-hosting options.'}
          </Typography>
        </Alert>
      </Box>
    </Layout>
  );
};
