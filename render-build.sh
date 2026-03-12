#!/usr/bin/env bash
# Install tshark for PCAP analysis on Render
apt-get update && apt-get install -y tshark || true
cd backend && npm install
