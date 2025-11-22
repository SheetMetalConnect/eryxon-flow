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
  Grid,
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
import { useSubscription } from '../hooks/useSubscription';
import { useTranslation } from 'react-i18next';

// Pricing tiers are now loaded from translation keys to ensure consistency

export const MyPlan: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { subscription, usageStats, loading, error, getPlanDisplayName, getUsagePercentage, isAtLimit } = useSubscription();

  const handleUpgradeRequest = (planName: string) => {
    const subject = encodeURIComponent(t('myPlan.upgradeRequest.subject', { planName }));
    const body = encodeURIComponent(
      t('myPlan.upgradeRequest.body', {
        planName,
        currentPlan: subscription ? getPlanDisplayName(subscription.plan) : t('myPlan.unknown'),
        tenantId: subscription?.tenant_id || 'N/A'
      })
    );
    window.location.href = `mailto:office@sheetmetalconnect.com?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  const currentPlan = subscription?.plan || 'free';

  // Get tier info from translations
  const getTierName = (plan: string) => t(`pricing.${plan}.name`);
  const getTierPrice = (plan: string) => t(`pricing.${plan}.price`);
  const getTierDescription = (plan: string) => t(`pricing.${plan}.description`);
  const getTierFeatures = (plan: string) => t(`pricing.${plan}.features`, { returnObjects: true }) as string[];

  return (
    <Box>
      <Box sx={{ pb: 8 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {t('myPlan.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('myPlan.subtitle')}
          </Typography>
        </Box>

        {/* Current Plan Overview */}
        <Card
          sx={{
            mb: 4,
            background: currentPlan === 'premium'
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : currentPlan === 'pro'
                ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(theme.palette.primary.dark, 0.9)} 100%)`
                : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: theme.palette.primary.contrastText,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid size={{ xs: 12, md: 8 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="h5" fontWeight={700}>
                    {getTierName(currentPlan)} {t('myPlan.plan')}
                  </Typography>
                  {currentPlan === 'pro' && (
                    <Chip
                      label={t('myPlan.mostPopular')}
                      size="small"
                      sx={{
                        backgroundColor: alpha(theme.palette.background.paper, 0.2),
                        color: theme.palette.primary.contrastText,
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>
                <Typography variant="body1" sx={{ mb: 2, opacity: 0.95 }}>
                  {getTierDescription(currentPlan)}
                </Typography>
                <Typography variant="h3" fontWeight={700}>
                  {getTierPrice(currentPlan)}
                  <Typography component="span" variant="h6" sx={{ opacity: 0.8, ml: 1 }}>
                    {currentPlan !== 'premium' ? t('myPlan.perMonth') : ''}
                  </Typography>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                {currentPlan !== 'premium' && (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<UpgradeIcon />}
                    onClick={() => handleUpgradeRequest(currentPlan === 'free' ? 'Pro' : 'Premium')}
                    sx={{
                      backgroundColor: theme.palette.background.paper,
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      px: 4,
                      py: 1.5,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.background.paper, 0.9),
                      },
                    }}
                  >
                    {t('myPlan.upgradePlan')}
                  </Button>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          {/* Usage Statistics */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <TrendingUpIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    {t('myPlan.usageThisMonth')}
                  </Typography>
                </Box>

                {/* Parts Usage */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InventoryIcon fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight={600}>
                        {t('myPlan.parts')}
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
                      {t('myPlan.partsLimitReached')}
                    </Alert>
                  )}
                </Box>

                {/* Jobs Usage */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WorkIcon fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight={600}>
                        {t('myPlan.totalJobs')}
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
                        {t('myPlan.storage')}
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
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {usageStats?.active_jobs || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('myPlan.activeJobs')}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {usageStats?.completed_jobs || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('myPlan.completedJobs')}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="info.main">
                    {usageStats?.total_operators || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('myPlan.operators')}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="secondary.main">
                    {usageStats?.total_admins || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('myPlan.admins')}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Plan Features & Upgrade Options */}
          <Grid size={{ xs: 12, lg: 4 }}>
            {/* Current Plan Features */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {t('myPlan.planFeatures')}
                </Typography>
                <List dense>
                  {getTierFeatures(currentPlan).map((feature, index) => (
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
                      {t('myPlan.readyToUpgrade')}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {currentPlan === 'free'
                      ? t('myPlan.upgradeFromFree')
                      : t('myPlan.upgradeFromPro')}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    {t('myPlan.contactToUpgrade')}
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
                    {t('myPlan.requestUpgrade')}
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                    {t('myPlan.noSalesCalls')}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>

        {/* EU Hosting Notice */}
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
            {t('pricing.euHosting.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('pricing.euHosting.description')}
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};
