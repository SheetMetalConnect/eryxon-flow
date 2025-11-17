import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Language as LanguageIcon, Check as CheckIcon } from '@mui/icons-material';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = async (languageCode: string) => {
    await i18n.changeLanguage(languageCode);
    handleClose();
  };

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  return (
    <>
      <IconButton
        onClick={handleOpen}
        color="inherit"
        sx={{
          borderRadius: 2,
          px: 1.5,
          py: 0.75,
          gap: 0.75,
          '&:hover': {
            backgroundColor: alpha(theme.palette.action.hover, 0.08),
          },
        }}
      >
        <Box
          sx={{
            fontSize: '1.25rem',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {currentLanguage.flag}
        </Box>
        <LanguageIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1.5,
            minWidth: 240,
            borderRadius: 2,
            overflow: 'hidden',
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', color: 'text.secondary' }}>
            Select Language
          </Typography>
        </Box>
        {languages.map((language) => {
          const isSelected = i18n.language === language.code;
          return (
            <MenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              selected={isSelected}
              sx={{
                py: 1.5,
                px: 2,
                gap: 2,
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.12),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.18),
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 'auto', fontSize: '1.5rem' }}>
                {language.flag}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 500 }}>
                      {language.nativeName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {language.name}
                    </Typography>
                  </Box>
                }
              />
              {isSelected && (
                <CheckIcon
                  fontSize="small"
                  sx={{ color: theme.palette.primary.main, ml: 'auto' }}
                />
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};
