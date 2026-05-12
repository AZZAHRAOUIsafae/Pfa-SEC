Param(
    [int]$CommitsPerAuthor = 20
)

$authors = @("AZZAHRAOUIsafae","alafhel","Manaldahmouni")
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path
Set-Location $repoRoot

$branch = "generated-commits"
git rev-parse --verify $branch 2>$null
if ($LASTEXITCODE -eq 0) {
    git checkout $branch
} else {
    git checkout -b $branch
}

$target = Join-Path $repoRoot "Pfa-SEC\src\commit_log.txt"
if (-not (Test-Path $target)) { New-Item -Path $target -ItemType File -Force | Out-Null }

$global = 1
foreach ($author in $authors) {
    for ($i=1; $i -le $CommitsPerAuthor; $i++) {
        $line = "{0} - {1} - generated commit {2}" -f (Get-Date -Format o), $author, $i
        Add-Content -Path $target -Value $line
        git add -- "$target"
        git commit --author="$author <$author@users.noreply.github.com>" -m "chore: generated commit $global by $author"
        if ($LASTEXITCODE -ne 0) { Write-Host "Commit failed for $author #$i" }
        $global++
        Start-Sleep -Milliseconds 100
    }
}

Write-Host "Created $($global - 1) commits on branch $branch"
