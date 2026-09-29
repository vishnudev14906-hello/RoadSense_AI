param(
    [string]$CommitMessage = "chore: update application telemetry and ui enhancements"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Staging all changes..."
git add .

$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "✅ No changes to commit. Working tree is clean."
} else {
    Write-Host "📝 Committing: $CommitMessage"
    git commit -m "$CommitMessage"
}

Write-Host "📤 Pushing to GitHub (origin main)..."
git push origin main
Write-Host "🎉 Successfully pushed to GitHub!"
