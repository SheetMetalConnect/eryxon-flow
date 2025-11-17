import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import {
  People as PeopleIcon,
  AccountTree as AccountTreeIcon,
  Build as BuildIcon,
  IntegrationInstructions as IntegrationIcon,
  CardMembership as CardMembershipIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';

// Import existing config components
import ConfigUsers from './ConfigUsers';
import ConfigStages from './ConfigStages';
import ConfigMaterials from './ConfigMaterials';
import ConfigResources from './ConfigResources';
import ConfigApiKeys from './ConfigApiKeys';
import ConfigWebhooks from './ConfigWebhooks';
import DataExport from './DataExport';
import { MyPlan } from '@/pages/MyPlan';

interface TabPanelProps {
  children?: React.Node;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index} id={`settings-tabpanel-${index}`}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const tabs = [
  { label: 'Team', icon: <PeopleIcon />, value: 'team' },
  { label: 'Workflow', icon: <AccountTreeIcon />, value: 'workflow' },
  { label: 'Resources', icon: <BuildIcon />, value: 'resources' },
  { label: 'Integration', icon: <IntegrationIcon />, value: 'integration' },
  { label: 'Subscription', icon: <CardMembershipIcon />, value: 'subscription' },
  { label: 'Data', icon: <StorageIcon />, value: 'data' },
];

export const Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'team';
  const currentIndex = tabs.findIndex((t) => t.value === currentTab);
  const [value, setValue] = useState(currentIndex >= 0 ? currentIndex : 0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    setSearchParams({ tab: tabs[newValue].value });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Settings
      </Typography>

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.value}
              icon={tab.icon}
              label={tab.label}
              iconPosition="start"
              sx={{
                minHeight: 64,
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
              }}
            />
          ))}
        </Tabs>

        <Box sx={{ px: 3 }}>
          {/* Team Tab */}
          <TabPanel value={value} index={0}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Team Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Manage users, operators, admins, and machine accounts for your organization.
            </Typography>
            <ConfigUsers />
          </TabPanel>

          {/* Workflow Tab */}
          <TabPanel value={value} index={1}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Workflow Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure production stages and materials for your manufacturing workflow.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Production Stages
            </Typography>
            <ConfigStages />

            <Box sx={{ my: 4 }} />

            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Materials Catalog
            </Typography>
            <ConfigMaterials />
          </TabPanel>

          {/* Resources Tab */}
          <TabPanel value={value} index={2}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Resources & Equipment
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Manage tools, fixtures, molds, and equipment used in production.
            </Typography>
            <ConfigResources />
          </TabPanel>

          {/* Integration Tab */}
          <TabPanel value={value} index={3}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Integration Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure API keys and webhooks for third-party integrations.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              API Keys
            </Typography>
            <ConfigApiKeys />

            <Box sx={{ my: 4 }} />

            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Webhooks
            </Typography>
            <ConfigWebhooks />
          </TabPanel>

          {/* Subscription Tab */}
          <TabPanel value={value} index={4}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Subscription & Billing
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              View your current plan, usage statistics, and upgrade options.
            </Typography>
            <MyPlan />
          </TabPanel>

          {/* Data Tab */}
          <TabPanel value={value} index={5}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Data Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Export your data in CSV or JSON format for backup or analysis.
            </Typography>
            <DataExport />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
};
