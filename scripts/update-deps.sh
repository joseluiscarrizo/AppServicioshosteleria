#!/bin/bash

echo "🔒 Running npm audit..."
npm audit

echo "🔧 Attempting automatic fixes..."
npm audit fix

echo "📦 Updating dependencies..."
npm update

echo "🧹 Checking for outdated packages..."
npm outdated

echo "✅ Update complete!"
npm audit
