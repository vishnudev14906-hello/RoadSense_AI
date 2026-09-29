<#
.SYNOPSIS
    Automated Git Commit and Push Watcher for RoadSense_AI.

.DESCRIPTION
    Monitors the repository for file changes, stages them with a stabilization debounce,
    generates concise and informative commit messages, and pushes to GitHub automatically.

.PARAMETER Interval
    Polling interval in seconds between change checks (default: 20).

.PARAMETER Debounce
    Delay in seconds after detecting changes to let in-progress file edits settle (default: 5).

.PARAMETER NoPush
    If specified, commits changes locally without pushing to the remote repository.

.PARAMETER Once
    Runs a single check, commits and pushes any pending changes, and immediately exits.

.PARAMETER Message
    Custom commit message. If not provided, a smart message summarizing changed files is generated.

.PARAMETER Remote
    The remote repository name (default: "origin").

.PARAMETER Branch
    The target branch. If not specified, the currently checked-out branch is used.

.EXAMPLE
    .\autocommit.ps1
    Starts continuous auto-commit and push with default settings (checks every 20s).

.EXAMPLE
    .\autocommit.ps1 -Interval 10 -Debounce 3
    Checks every 10 seconds with a 3-second debounce.

.EXAMPLE
    .\autocommit.ps1 -Once -Message "Update documentation"
    Performs a one-time commit and push with a custom message.
#>

[CmdletBinding()]
param (
    [int]$Interval = 20,
    [int]$Debounce = 5,
    [switch]$NoPush,
    [switch]$Once,
    [string]$Message,
    [string]$Remote = "origin",
    [string]$Branch = ""
)

# Set error preferences
$ErrorActionPreference = "Continue"

# Navigate to script directory if needed
$RepoRoot = $PSScriptRoot
if (-not (Test-Path "$RepoRoot\.git")) {
    $RepoRoot = (Get-Location).Path
    if (-not (Test-Path "$RepoRoot\.git")) {
        Write-Host " [ERROR] Not inside a Git repository. Please run this inside the RoadSense_AI folder." -ForegroundColor Red
        exit 1
    }
}
Set-Location $RepoRoot

function Get-GitBranch {
    $current = git branch --show-current 2>$null
    if (-not $current) {
        $current = git rev-parse --abbrev-ref HEAD 2>$null
    }
    if (-not $current) {
        $current = "main"
    }
    return $current.Trim()
}

function Generate-CommitMessage {
    param ([string[]]$StatusLines, [string]$UserMessage)

    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

    if ($UserMessage) {
        return "$UserMessage [$timestamp]"
    }

    $fileNames = @()
    $folders = @{}

    foreach ($line in $StatusLines) {
        if ($line.Length -gt 3) {
            # Extract file path after status code (e.g. ' M path/to/file')
            $filePath = $line.Substring(3).Trim()
            # If renamed, take target name
            if ($filePath -match '->\s*(.+)$') {
                $filePath = $matches[1].Trim()
            }
            $baseName = Split-Path $filePath -Leaf
            $firstFolder = ($filePath -split '[\\/]', 2)[0]
            if ($firstFolder -and $firstFolder -ne $baseName) {
                $folders[$firstFolder] = $true
            }
            $fileNames += $baseName
        }
    }

    if ($fileNames.Count -eq 0) {
        return "auto: routine repository update [$timestamp]"
    }

    if ($fileNames.Count -le 3) {
        $filesStr = $fileNames -join ", "
        return "auto: update $filesStr [$timestamp]"
    } else {
        $topFolders = ($folders.Keys | Select-Object -First 3) -join ", "
        if ($topFolders) {
            return "auto: update $($fileNames.Count) files in $topFolders [$timestamp]"
        } else {
            return "auto: update $($fileNames.Count) files [$timestamp]"
        }
    }
}

function Invoke-GitCommitPush {
    param (
        [string]$TargetBranch,
        [switch]$SkipPush,
        [string]$CustomMsg
    )

    $statusOutput = @(git status --porcelain 2>$null)
    if (-not $statusOutput -or $statusOutput.Count -eq 0) {
        return $false
    }

    Write-Host "`n------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host " [DETECTED] $($statusOutput.Count) changed file(s) at $((Get-Date).ToString('HH:mm:ss'))" -ForegroundColor Yellow
    foreach ($line in ($statusOutput | Select-Object -First 5)) {
        Write-Host "   $line" -ForegroundColor Gray
    }
    if ($statusOutput.Count -gt 5) {
        Write-Host "   ... and $($statusOutput.Count - 5) more file(s)" -ForegroundColor DarkGray
    }

    # Debounce delay to let ongoing writes / multi-file saves finish
    if ($Debounce -gt 0 -and -not $Once) {
        Write-Host " [WAIT] Debouncing for $Debounce seconds to let edits settle..." -ForegroundColor DarkYellow
        Start-Sleep -Seconds $Debounce
        # Re-check status after debounce
        $statusOutput = @(git status --porcelain 2>$null)
        if (-not $statusOutput -or $statusOutput.Count -eq 0) {
            Write-Host " [INFO] Changes reverted or clean after debounce." -ForegroundColor Gray
            return $false
        }
    }

    # Stage all changes
    Write-Host " [STAGE] Staging all tracked & untracked changes (git add -A)..." -ForegroundColor Cyan
    git add -A

    # Re-verify something is staged
    $stagedOutput = @(git status --porcelain 2>$null)
    if (-not $stagedOutput -or $stagedOutput.Count -eq 0) {
        Write-Host " [INFO] No changes to commit after staging." -ForegroundColor Gray
        return $false
    }

    # Build commit message
    $commitMsg = Generate-CommitMessage -StatusLines $stagedOutput -UserMessage $CustomMsg
    Write-Host " [COMMIT] Creating commit: `"$commitMsg`"" -ForegroundColor Green
    $commitResult = git commit -m "$commitMsg" 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host " [WARNING] Commit failed or nothing to commit: $commitResult" -ForegroundColor Red
        return $false
    }

    # Push to remote
    if ($SkipPush) {
        Write-Host " [INFO] SkipPush enabled. Changes committed locally." -ForegroundColor Cyan
        return $true
    }

    Write-Host " [PUSH] Pushing to $Remote/$TargetBranch..." -ForegroundColor Cyan
    $pushOutput = git push $Remote $TargetBranch 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host " [SUCCESS] Pushed successfully to GitHub ($Remote/$TargetBranch)!" -ForegroundColor Green
        return $true
    } else {
        Write-Host " [WARNING] Push failed (offline or remote rejected). Will retry on next cycle." -ForegroundColor Yellow
        Write-Host "           Details: $pushOutput" -ForegroundColor DarkGray
        return $false
    }
}

# --- Initialization ---
$activeBranch = if ($Branch) { $Branch } else { Get-GitBranch }
$remoteUrl = git remote get-url $Remote 2>$null

try { Clear-Host } catch {}
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         RoadSense_AI - Git Auto-Commit & Push              " -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Repository : $RepoRoot" -ForegroundColor Gray
Write-Host "  Remote     : $Remote ($remoteUrl)" -ForegroundColor Gray
Write-Host "  Branch     : $activeBranch" -ForegroundColor Yellow
Write-Host "  Interval   : Every $Interval seconds" -ForegroundColor Gray
Write-Host "  Debounce   : $Debounce seconds" -ForegroundColor Gray
Write-Host "  Auto-Push  : $(if ($NoPush) { 'Disabled (Local only)' } else { 'Enabled (GitHub)' })" -ForegroundColor $(if ($NoPush) { 'Yellow' } else { 'Green' })
Write-Host "  Press Ctrl+C anytime to stop." -ForegroundColor DarkGray
Write-Host "============================================================`n" -ForegroundColor Cyan

# If Once mode, perform one pass and exit
if ($Once) {
    Write-Host " [MODE] Single-shot run requested (-Once)..." -ForegroundColor Cyan
    $committed = Invoke-GitCommitPush -TargetBranch $activeBranch -SkipPush:$NoPush -CustomMsg $Message
    if (-not $committed) {
        Write-Host " [INFO] Repository working tree is already clean. Nothing to commit." -ForegroundColor Green
    }
    exit 0
}

# Continuous Watcher Loop
try {
    $cycle = 0
    while ($true) {
        $cycle++
        $status = @(git status --porcelain 2>$null)

        if ($status -and $status.Count -gt 0) {
            Invoke-GitCommitPush -TargetBranch $activeBranch -SkipPush:$NoPush -CustomMsg $Message
        } else {
            $now = (Get-Date).ToString("HH:mm:ss")
            # Clear line and print quiet heartbeat
            Write-Host -NoNewline "`r [WATCHING] [$now] Repository clean. Checking again in ${Interval}s...   " -ForegroundColor DarkGray
        }

        Start-Sleep -Seconds $Interval
    }
}
finally {
    Write-Host "`n`n [STOPPED] Auto-commit watcher stopped. Have a great day!`n" -ForegroundColor Yellow
}
