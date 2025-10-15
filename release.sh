#!/bin/bash

# Exit on error
set -e

# Get version from package.json
VERSION=$(grep -m 1 '"version"' package.json | cut -d '"' -f 4)

if [ -z "$VERSION" ]; then
  echo "Error: Could not find version in package.json"
  exit 1
fi

TAG="v$VERSION"

echo "Creating release for version $TAG..."

# Check if the tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: Tag $TAG already exists."
  exit 1
fi

# Create git tag
git tag -a "$TAG" -m "Release $TAG"

# Push commit and tag
echo "Pushing commit and tag to remote..."
git push
git push origin "$TAG"

echo "Release $TAG created successfully."
echo "To create a GitHub release, you can now go to the tags page on GitHub and create a release from the new tag."
