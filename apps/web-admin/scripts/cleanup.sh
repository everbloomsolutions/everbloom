#!/bin/bash

echo "Cleaning up build artifacts..."

rm -rf dist
rm -rf node_modules/.cache
rm -rf .vite

echo "Cleanup complete!"
