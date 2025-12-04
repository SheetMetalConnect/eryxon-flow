#!/usr/bin/env node
/**
 * Script to split monolithic translation.json into multiple namespace files.
 * This enables better AI agent collaboration and reduces context window usage.
 *
 * Usage: node scripts/split-translations.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define namespace mappings - which keys go into which namespace file
const namespaceMapping = {
  // common.json - Shared strings, forms, notifications, modals, time
  common: [
    'Actions', 'Blocked', 'Cancel', 'Cell', 'Complete', 'Completed', 'Create',
    'Description', 'Details', 'Fullscreen', 'Job', 'Material', 'Notes',
    'Operation', 'Operations', 'Part', 'Quantity', 'Search', 'Seq', 'Showing',
    'Status', 'Steps', 'Stop', 'Templates', 'Update', 'substeps',
    'app', 'common', 'forms', 'notifications', 'modals', 'time', 'languageSwitcher'
  ],

  // auth.json - Authentication, legal, onboarding
  auth: ['auth', 'legal', 'onboarding', 'subscription'],

  // navigation.json - Sidebar and navigation
  navigation: ['navigation'],

  // admin.json - Admin pages: dashboard, settings, users, activity
  admin: [
    'dashboard', 'organizationSettings', 'settings', 'users', 'activityMonitor',
    'myActivity', 'myIssues', 'pricing', 'myPlan'
  ],

  // operator.json - Operator terminal, workQueue, session tracking
  operator: ['workQueue', 'terminal', 'sessionTracking', 'production'],

  // jobs.json - Jobs, parts, operations
  jobs: ['jobs', 'parts', 'operations', 'issues', 'jobCreate'],

  // config.json - Configuration: stages, materials, resources, assignments
  config: ['stages', 'materials', 'resources', 'assignments'],

  // integrations.json - API, webhooks, MQTT, data import/export
  integrations: [
    'apiKeys', 'webhooks', 'apiDocsPage', 'dataImport', 'dataExport',
    'mqtt', 'integrations', 'apiDocumentation', 'myPlan', 'help', 'about', 'templates'
  ],

  // analytics.json - Analytics: QRM, OEE, quality, reliability
  analytics: ['qrm', 'analytics', 'oee', 'reliability', 'quality', 'capacity', 'calendar'],

  // shipping.json - Shipping module
  shipping: ['shipping']
};

// Languages to process
const languages = ['en', 'nl', 'de'];

function splitTranslations(lang) {
  const inputPath = path.join(__dirname, `../src/i18n/locales/${lang}/translation.json`);
  const outputDir = path.join(__dirname, `../src/i18n/locales/${lang}`);

  console.log(`\nProcessing ${lang}...`);

  // Read the original translation file
  const original = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  // Track which keys have been assigned
  const assignedKeys = new Set();

  // Create namespace files
  for (const [namespace, keys] of Object.entries(namespaceMapping)) {
    const namespaceData = {};

    for (const key of keys) {
      if (original[key] !== undefined) {
        namespaceData[key] = original[key];
        assignedKeys.add(key);
      }
    }

    // Only write if there's content
    if (Object.keys(namespaceData).length > 0) {
      const outputPath = path.join(outputDir, `${namespace}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(namespaceData, null, 2) + '\n', 'utf8');
      console.log(`  ✓ Created ${namespace}.json (${Object.keys(namespaceData).length} keys)`);
    }
  }

  // Check for any unassigned keys
  const unassignedKeys = Object.keys(original).filter(k => !assignedKeys.has(k));
  if (unassignedKeys.length > 0) {
    console.log(`  ⚠ Unassigned keys: ${unassignedKeys.join(', ')}`);

    // Add unassigned keys to common.json
    const commonPath = path.join(outputDir, 'common.json');
    const commonData = JSON.parse(fs.readFileSync(commonPath, 'utf8'));

    for (const key of unassignedKeys) {
      commonData[key] = original[key];
    }

    fs.writeFileSync(commonPath, JSON.stringify(commonData, null, 2) + '\n', 'utf8');
    console.log(`  ✓ Added unassigned keys to common.json`);
  }
}

function main() {
  console.log('Splitting translation files into namespaces...');

  for (const lang of languages) {
    try {
      splitTranslations(lang);
    } catch (error) {
      console.error(`Error processing ${lang}: ${error.message}`);
    }
  }

  console.log('\n✅ Done! Remember to update src/i18n/index.ts to load namespaces.');
}

main();
