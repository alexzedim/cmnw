param(
    [string]$InputFile,
    [string]$OutputFile
)

$rootDir = Split-Path $PSScriptRoot -Parent

if (-not $InputFile) { $InputFile = Join-Path $rootDir 'files\cmnw-osint.lua' }
if (-not $OutputFile) { $OutputFile = Join-Path $rootDir 'files\cmnw-osint.json' }

$inPath = if ([System.IO.Path]::IsPathRooted($InputFile)) { $InputFile } else { Join-Path $rootDir $InputFile }
$outPath = if ([System.IO.Path]::IsPathRooted($OutputFile)) { $OutputFile } else { Join-Path $rootDir $OutputFile }

$KebabCase = {
    param([string]$s)
    if ([string]::IsNullOrEmpty($s)) { return $s }
    $result = $s -replace '\s+', '-'
    $result = [regex]::Replace($result, '\p{Lu}', { param($m) '-' + $m.Value.ToLower() })
    $result = $result -replace '-+', '-'
    if ($result.StartsWith('-')) { $result = $result.Substring(1) }
    return $result
}

$lines = [System.IO.File]::ReadAllLines($inPath, [System.Text.Encoding]::UTF8)

$characters = [System.Collections.Generic.List[PSObject]]::new()
$currentEntry = $null

$fieldOrder = @(
    'id', 'name', 'realmId', 'realm', 'guild', 'guildRank', 'guildRankName',
    'class', 'race', 'gender', 'faction', 'level', 'status', 'lastModified',
    'createdBy', 'updatedBy'
)

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i].Trim()

    if ($line -match '^\["[^"]+"\]\s*=\s*\{\s*$') {
        $currentEntry = @{}
        continue
    }

    if ($null -ne $currentEntry -and $line -match '^\}\s*,?\s*$') {
        if ($currentEntry.ContainsKey('name') -and $currentEntry.ContainsKey('realm')) {
            $obj = [ordered]@{}
            $nameSlug = & $KebabCase $currentEntry['name']
            $realmSlug = & $KebabCase $currentEntry['realm']
            $obj['guid'] = "$nameSlug@$realmSlug"

            foreach ($field in $fieldOrder) {
                if ($currentEntry.ContainsKey($field)) {
                    $obj[$field] = $currentEntry[$field]
                }
            }

            $characters.Add([PSCustomObject]$obj)
        }

        $currentEntry = $null
        continue
    }

    if ($null -ne $currentEntry) {
        if ($line -match '^\["(\w+)"\]\s*=\s*"(.*)"\s*,?\s*$') {
            $currentEntry[$Matches[1]] = $Matches[2]
        } elseif ($line -match '^\["(\w+)"\]\s*=\s*(\d+)\s*,?\s*$') {
            $currentEntry[$Matches[1]] = [long]$Matches[2]
        }
    }
}

$json = $characters | ConvertTo-Json -Depth 5

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outPath, $json, $utf8NoBom)

Write-Host "Converted $($characters.Count) characters to $OutputFile"
