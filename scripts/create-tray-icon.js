#!/usr/bin/env node

// Simple script to create a basic tray icon
// This creates a 16x16 PNG with a simple VPN shield icon

const fs = require('fs');
const path = require('path');

// Base64 encoded 16x16 PNG of a simple shield/lock icon (black, transparent background)
// This is a minimal icon suitable for macOS menu bar
const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA' +
  'aElEQVR4nGNgoBAwUqifgYGB4T8DXPwfC0YXZCBFMxNIw38s4D8DA8N/LBgbpghiNEMxTAxFMw5N' +
  'OG0YAEYzEwMDA8N/BmyAqA0MUAMMDAwM/3FgZGBgYGBgwKMZWSMyvRgYpxkAuKAXEfqlF9sAAAAA' +
  'SUVORK5CYII=';

const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Write the icon file
const iconPath = path.join(assetsDir, 'tray-icon.png');
const buffer = Buffer.from(iconBase64, 'base64');
fs.writeFileSync(iconPath, buffer);

console.log('✅ Tray icon created successfully at:', iconPath);
