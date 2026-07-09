#!/bin/bash

# Local build only. Production deploy is via CI (GitHub Actions) + Argo CD or Vercel.
echo "Starting deployment..."

pnpm install

pnpm turbo build

echo "Build completed successfully!"

echo "Deployment complete!"
