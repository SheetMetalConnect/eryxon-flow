---
title: "Deployment Guide"
description: "Application deployment guide for Eryxon Flow."
---

# Deployment Guide

> **Want to try it first?** Open the <a href="https://app.eryxon.eu" data-cta-id="docs_deployment_hosted_try_first_en" data-cta-surface="deployment" data-cta-kind="hosted_app" data-cta-locale="en">hosted version at app.eryxon.eu</a> before deploying your own instance. It's a free 30-day trial.

This page is the shortest setup route. For the full production checklist, see the [Self-Hosting Guide](/guides/self-hosting/).

Self-hosting runs the free **Community** edition, source-available under the Business Source License 1.1 — free to self-host for a single workshop. Multi-site use needs a commercial licence; see [Editions & Pricing](/pricing/).

## Production deployment

Follow the [Self-Hosting Guide](/guides/self-hosting/) for backend preparation,
public frontend settings, released Docker images, HTTPS, verification, and recovery.
That guide is the maintained setup sequence; the frontend image does not include
the Supabase backend.

Use the reviewed release's image digest and matching migrations and Edge Functions.
A merge to `main` does not deploy production. Maintainers with repository access
should use [RELEASING.md](https://github.com/SheetMetalConnect/eryxon-flow/blob/main/RELEASING.md)
for release publication, rollout inputs, and rollback.

## Local development and custom builds

The [Quick Start](/guides/quick-start/) covers local development with Node.js 22.12
or newer and a prepared backend. Use `npm ci` to install locked dependencies.

For a custom Docker image, follow
[Build a custom image](/guides/self-hosting/#build-a-custom-image). The default build
is a regular responsive website. Optional PWA support requires
`VITE_ENABLE_PWA=true` at build time; setting it on an existing container does not
change the build.

## Verify the deployment

Check sign-in, PIN operator switching, queue selection, an operation's time tracking,
issue reporting, and activity against the intended backend. Include phone, tablet,
and desktop screens. Container health confirms HTTP readiness; these checks verify
the authenticated workflows.

For a PWA-enabled build, also follow
[PWA verification](/guides/self-hosting/#optional-pwa-verification). For deployment
problems, see the [Troubleshooting Guide](/guides/troubleshooting/).
