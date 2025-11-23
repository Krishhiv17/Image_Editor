# Git Workflow Guide

## Current Setup

**Main Branch**: `main`
- Production-ready code
- Always deployable
- Protected (should require PR reviews in team settings)

## Recommended Branch Structure

### For Solo Development:
```
main (protected, production)
  └── dev (active development)
```

### For Team/Assignment Submission:
```
main (protected, final submission)
  ├── dev (integration branch)
  │   ├── feature/auth-ui
  │   ├── feature/photo-upload
  │   ├── feature/image-editor
  │   └── bugfix/some-issue
  └── hotfix/critical-bug
```

## Quick Commands

### Starting New Work

```bash
# Always start from latest main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/auth-ui

# Work on your feature...
# Make commits frequently
git add .
git commit -m "Add login page component"

# Push to remote
git push origin feature/auth-ui
```

### Daily Workflow

```bash
# See what changed
git status

# Stage specific files
git add backend/app/routers/auth.py frontend/app/login/page.tsx

# Or stage everything
git add .

# Commit with descriptive message
git commit -m "Implement JWT authentication and login UI"

# Push to current branch
git push
```

### Merging Feature to Dev

```bash
# Switch to dev
git checkout dev

# Merge feature
git merge feature/auth-ui

# Push updated dev
git push origin dev
```

### Merging Dev to Main (Final)

```bash
# Switch to main
git checkout main

# Merge dev
git merge dev

# Push to main
git push origin main
```

## Commit Message Guidelines

### Format:
```
<type>: <short description>

<optional detailed description>
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no logic change)
- `refactor`: Code restructuring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

### Examples:
```bash
git commit -m "feat: Add user registration endpoint with email validation"
git commit -m "fix: Handle special characters in database connection string"
git commit -m "docs: Update Azure setup guide with troubleshooting steps"
git commit -m "refactor: Extract image processing logic into separate service"
```

## Useful Git Commands

### Viewing History
```bash
# See commit history
git log --oneline --graph --all

# See changes in last commit
git show

# See changes not yet committed
git diff
```

### Undoing Changes

```bash
# Discard changes in working directory
git checkout -- <file>

# Unstage file (keep changes)
git reset HEAD <file>

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes) - DANGER!
git reset --hard HEAD~1
```

### Branch Management

```bash
# List all branches
git branch -a

# Delete local branch
git branch -d feature/old-feature

# Delete remote branch
git push origin --delete feature/old-feature

# Rename current branch
git branch -m new-branch-name
```

## Current Project Status

As of 2025-11-23:

**Completed**: 
- ✅ Project structure (frontend + backend)
- ✅ Database schema with migrations
- ✅ Authentication system (backend)
- ✅ Azure PostgreSQL integration
- ✅ Azure Blob Storage setup

**Next**:
- Frontend authentication UI
- Photo upload endpoints
- Image editor

## Setup Remote Repository (GitHub)

### Option 1: Create on GitHub First

1. Go to GitHub and create new repository
2. Don't initialize with README (we already have code)
3. Copy the repository URL
4. Add remote:

```bash
git remote add origin https://github.com/yourusername/photo-editor.git
git branch -M main
git push -u origin main
```

### Option 2: GitHub CLI

```bash
# Install GitHub CLI if not installed
brew install gh

# Login
gh auth login

# Create repository and push
gh repo create photo-editor --private --source=. --remote=origin --push
```

## Best Practices

1. **Commit Often**: Make small, focused commits
2. **Descriptive Messages**: Write clear commit messages
3. **Pull Before Push**: Always pull latest changes before pushing
4. **Branch for Features**: Don't work directly on main
5. **Test Before Merge**: Ensure code works before merging
6. **Keep .env Out**: Never commit `.env` files with secrets
7. **Review Changes**: Use `git diff` before committing

## Emergency Commands

### Accidentally committed .env file?

```bash
# Remove from git but keep locally
git rm --cached backend/.env
git commit -m "Remove .env from tracking"
git push

# Add to .gitignore if not already there
echo "backend/.env" >> .gitignore
git add .gitignore
git commit -m "Update .gitignore to exclude .env"
git push
```

### Need to undo a pushed commit?

```bash
# Create new commit that reverses changes
git revert <commit-hash>
git push
```

---

**Happy Coding!** 🚀
