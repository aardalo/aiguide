# Docker Permission Setup for E2E Tests

## Issue

Docker commands require either `sudo` or the user to be in the `docker` group.

Current status:
- User: `oyvind`
- Groups: `adm cdrom sudo dip plugdev lxd`
- Missing: `docker` group membership

## Solutions

### Option 1: Add User to Docker Group (Recommended for Development)

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply group changes (choose one):
# A) Log out and log back in
# B) Or run: newgrp docker

# Verify
groups
# Should now show: oyvind adm cdrom sudo dip plugdev lxd docker
```

**Pros**: No sudo needed for Docker commands  
**Cons**: Requires logout/login or `newgrp docker` to take effect

### Option 2: Use Sudo (Current Implementation)

The test script (`scripts/test-e2e-docker.sh`) automatically detects if sudo is needed and uses it.

```bash
# Works immediately with sudo
npm run test:e2e:docker
```

**Pros**: Works immediately, no logout required  
**Cons**: Requires entering sudo password

## Current Setup

The E2E test scripts are configured to automatically use `sudo` if needed:

```bash
# These commands work with or without docker group membership
npm run test:e2e:docker        # Auto-detects and uses sudo if needed
npm run test:e2e:docker:build  # May need manual sudo prefix
npm run test:e2e:docker:up     # May need manual sudo prefix
```

## Manual Commands

If using docker-compose directly:

```bash
# With sudo
sudo docker-compose -f docker-compose.e2e.yml build
sudo docker-compose -f docker-compose.e2e.yml up

# After adding to docker group (and logging out/in)
docker-compose -f docker-compose.e2e.yml build
docker-compose -f docker-compose.e2e.yml up
```

## Verification

Test if Docker works without sudo:

```bash
docker ps
```

- **Works**: You're in the docker group ✅
- **Permission denied**: Use sudo or add yourself to docker group ⚠️
