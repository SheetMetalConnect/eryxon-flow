import React from 'react';
import { Box, Container } from '@mui/material';
import { AppHeader } from './AppHeader';

interface MuiLayoutProps {
  children: React.ReactNode;
}

export const MuiLayout: React.FC<MuiLayoutProps> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppHeader />
      <Container
        maxWidth="xl"
        sx={{
          flexGrow: 1,
          py: { xs: 2, md: 4 },
          px: { xs: 2, md: 3 },
        }}
      >
        {children}
      </Container>
    </Box>
  );
};
