<#
.SYNOPSIS
    Initialise le pilotage GitHub du Guichet Unique FNPSS a partir de backlog.json.

.DESCRIPTION
    Cree, de maniere idempotente :
      1. les labels (type, area, priority, status)
      2. les jalons (milestones) M1 a M4 avec leurs echeances
      3. le GitHub Project (v2) et ses champs : Track, Priority, Sprint, Estimate, Start date, Target date
      4. les epics et les issues, rattachees au jalon, au projet et a leur epic (sub-issues si disponible)

    Les dates sont calculees a partir de -StartDate (un lundi) : semaine n = StartDate + 7*(n-1) jours.
    Un fichier d'etat (.bootstrap-state.json) permet de relancer le script sans creer de doublons.

.PARAMETER StartDate
    Lundi de la semaine 1 (format yyyy-MM-dd). Defaut : 2026-11-02.

.PARAMETER DryRun
    Simule : n'appelle pas gh, affiche le plan et la synthese (points par sprint, par epic).

.PARAMETER Limit
    Ne cree que les N premieres issues (test de fumee). 0 = toutes.

.PARAMETER SkipProject
    Ne cree pas le GitHub Project (labels, jalons et issues uniquement).

.EXAMPLE
    ./bootstrap-github.ps1 -DryRun
    ./bootstrap-github.ps1 -Limit 3
    ./bootstrap-github.ps1
#>
[CmdletBinding()]
param(
    [string]$StartDate = '2026-11-02',
    [string]$ProjectTitle = 'FNPSS Guichet Unique - Pilotage',
    [string]$Owner,
    [string]$Repo,
    [int]$Limit = 0,
    [switch]$DryRun,
    [switch]$SkipProject
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$culture = [Globalization.CultureInfo]::InvariantCulture
$backlog = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $root 'backlog.json') | ConvertFrom-Json
$statePath = Join-Path $root '.bootstrap-state.json'
$ui = $backlog.ui

# ------------------------------------------------------------------ helpers
$start = [datetime]::ParseExact($StartDate, 'yyyy-MM-dd', $culture)
if ($start.DayOfWeek -ne [DayOfWeek]::Monday) { Write-Warning "StartDate n'est pas un lundi ($($start.DayOfWeek))." }

function Get-WeekStart([int]$w) { return $start.AddDays(7 * ($w - 1)) }
function Get-WeekEnd([int]$w) { return (Get-WeekStart $w).AddDays(4) }
function Format-Day([datetime]$d) { return $d.ToString('dd/MM/yyyy', $culture) }
function Format-Iso([datetime]$d) { return $d.ToString('yyyy-MM-dd', $culture) }

function Get-SprintOf([int]$endWeek) {
    foreach ($s in $backlog.sprints) { if ($endWeek -ge $s.from -and $endWeek -le $s.to) { return $s } }
    return $backlog.sprints[-1]
}
function Get-MilestoneOf([int]$endWeek) {
    foreach ($m in $backlog.milestones) { if ($endWeek -le $m.endWeek) { return $m } }
    return $backlog.milestones[-1]
}
function Get-Track([string]$code) {
    foreach ($t in $backlog.tracks) { if ($t.code -eq $code) { return $t } }
    throw "Track inconnu : $code"
}

function Invoke-Gh {
    param([string[]]$GhArgs)
    if ($DryRun) {
        Write-Host ("    [dry-run] gh " + ($GhArgs -join ' ')) -ForegroundColor DarkGray
        return ''
    }
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $errFile = [System.IO.Path]::GetTempFileName()
    try {
        $out = & gh @GhArgs 2>$errFile
        $code = $LASTEXITCODE
        $err = Get-Content -Raw -Path $errFile -ErrorAction SilentlyContinue
    } finally {
        $ErrorActionPreference = $prev
        Remove-Item $errFile -ErrorAction SilentlyContinue
    }
    if ($code -ne 0) { throw ("gh " + ($GhArgs -join ' ') + " a echoue (code $code) : $err") }
    return (($out | Out-String).Trim())
}

function Write-Utf8File([string]$path, [string]$text) {
    [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
}

# ------------------------------------------------------------------ state
$state = @{ project = $null; issues = @{}; milestones = @{} }
if (Test-Path $statePath) {
    $raw = Get-Content -Raw -Encoding UTF8 -Path $statePath | ConvertFrom-Json
    if ($raw.project) { $state.project = @{ number = $raw.project.number; id = $raw.project.id; url = $raw.project.url } }
    if ($raw.issues) { foreach ($p in $raw.issues.PSObject.Properties) { $state.issues[$p.Name] = @{ number = $p.Value.number; url = $p.Value.url; itemId = $p.Value.itemId } } }
}
function Save-State {
    if ($DryRun) { return }
    Write-Utf8File $statePath ($state | ConvertTo-Json -Depth 6)
}

# ------------------------------------------------------------------ owner / repo
if (-not $Owner -or -not $Repo) {
    $remote = (& git remote get-url origin 2>$null)
    if ($remote -match 'github\.com[:/]+([^/]+)/([^/]+?)(\.git)?$') {
        if (-not $Owner) { $Owner = $Matches[1] }
        if (-not $Repo) { $Repo = $Matches[2] }
    } else { throw "Impossible de deduire owner/repo : utilisez -Owner et -Repo." }
}
Write-Host "Depot cible : $Owner/$Repo | Debut S1 : $(Format-Day $start) | DryRun : $DryRun" -ForegroundColor Cyan

# ------------------------------------------------------------------ validation du backlog
$items = @($backlog.issues)
$epics = @($backlog.epics)
$seen = @{}
foreach ($i in $items) {
    foreach ($d in @($i.dep)) { if ($d -and -not $seen.ContainsKey($d)) { Write-Warning "Dependance non anterieure : $($i.id) -> $d" } }
    if ($seen.ContainsKey($i.id)) { throw "Identifiant en double : $($i.id)" }
    $seen[$i.id] = $true
    if ($i.b -lt $i.a) { throw "Semaines incoherentes pour $($i.id)" }
}
$epicInfo = @{}
foreach ($e in $epics) {
    $kids = @($items | Where-Object { $_.e -eq $e.id })
    if ($kids.Count -eq 0) { throw "Epic sans enfant : $($e.id)" }
    $epicInfo[$e.id] = @{
        a = [int](($kids | Measure-Object -Property a -Minimum).Minimum)
        b = [int](($kids | Measure-Object -Property b -Maximum).Maximum)
        pts = [int](($kids | Measure-Object -Property pt -Sum).Sum)
        count = $kids.Count
        kids = $kids
    }
}

# ------------------------------------------------------------------ synthese (toujours affichee)
Write-Host "`n== Synthese du backlog ==" -ForegroundColor Cyan
Write-Host ("Epics : {0} | Issues : {1} | Points : {2}" -f $epics.Count, $items.Count, (($items | Measure-Object -Property pt -Sum).Sum))
Write-Host "`nPar sprint :"
foreach ($s in $backlog.sprints) {
    $its = @($items | Where-Object { $_.b -ge $s.from -and $_.b -le $s.to })
    $pts = ($its | Measure-Object -Property pt -Sum).Sum
    Write-Host ("  {0,-9} S{1}-S{2} {3} -> {4} | {5,3} issues | {6,3} pts | {7}" -f $s.name, $s.from, $s.to, (Format-Day (Get-WeekStart $s.from)), (Format-Day (Get-WeekEnd $s.to)), $its.Count, [int]$pts, $s.goal)
}
Write-Host "`nPar jalon :"
foreach ($m in $backlog.milestones) {
    $prev = 0
    foreach ($x in $backlog.milestones) { if ($x.endWeek -lt $m.endWeek) { $prev = [Math]::Max($prev, $x.endWeek) } }
    $its = @($items | Where-Object { $_.b -gt $prev -and $_.b -le $m.endWeek })
    $pts = ($its | Measure-Object -Property pt -Sum).Sum
    Write-Host ("  {0,-40} echeance {1} | {2,3} issues | {3,3} pts" -f $m.title, (Format-Day (Get-WeekEnd $m.endWeek)), $its.Count, [int]$pts)
}
Write-Host "`nPar epic :"
foreach ($e in $epics) {
    $inf = $epicInfo[$e.id]
    Write-Host ("  {0,-4} {1,-55} S{2}-S{3} | {4,2} issues | {5,3} pts" -f $e.id, $e.t, $inf.a, $inf.b, $inf.count, $inf.pts)
}
Write-Host "`nPriorites :"
foreach ($p in 'Must', 'Should', 'Could') {
    $its = @($items | Where-Object { $_.p -eq $p })
    Write-Host ("  {0,-7} {1,3} issues | {2,3} pts" -f $p, $its.Count, [int](($its | Measure-Object -Property pt -Sum).Sum))
}

# ------------------------------------------------------------------ prerequis gh
if (-not $DryRun) {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "GitHub CLI (gh) introuvable. Installez-le : winget install --id GitHub.cli" }
    if (-not $SkipProject) {
        $status = Invoke-Gh -GhArgs @('auth', 'status')
        if ($status -notmatch 'project') {
            throw "Le jeton gh n'a pas la portee 'project'. Executez : gh auth refresh -s project"
        }
    }
}

# ------------------------------------------------------------------ 1. labels
Write-Host "`n[1/4] Labels" -ForegroundColor Cyan
$labelDefs = @()
$labelDefs += @($backlog.labels)
foreach ($t in $backlog.tracks) { $labelDefs += [pscustomobject]@{ name = $t.label; color = $t.color; description = "Domaine : $($t.option)" } }
foreach ($l in $labelDefs) {
    Invoke-Gh -GhArgs @('label', 'create', $l.name, '--color', $l.color, '--description', $l.description, '--force', '--repo', "$Owner/$Repo") | Out-Null
}
Write-Host "  $($labelDefs.Count) labels traites."

# ------------------------------------------------------------------ 2. milestones
Write-Host "`n[2/4] Jalons" -ForegroundColor Cyan
$existingMs = @{}
if (-not $DryRun) {
    $json = Invoke-Gh -GhArgs @('api', "repos/$Owner/$Repo/milestones?state=all&per_page=100")
    if ($json) { foreach ($m in ($json | ConvertFrom-Json)) { $existingMs[$m.title] = $m.number } }
}
foreach ($m in $backlog.milestones) {
    if ($existingMs.ContainsKey($m.title)) { Write-Host "  existe deja : $($m.title)"; continue }
    $due = (Get-WeekEnd $m.endWeek).ToString('yyyy-MM-dd', $culture) + 'T23:00:00Z'
    Invoke-Gh -GhArgs @('api', "repos/$Owner/$Repo/milestones", '-f', "title=$($m.title)", '-f', 'state=open', '-f', "description=$($m.description)", '-f', "due_on=$due") | Out-Null
    Write-Host "  cree : $($m.title) (echeance $(Format-Day (Get-WeekEnd $m.endWeek)))"
}

# ------------------------------------------------------------------ 3. project
$fields = @{}
if (-not $SkipProject) {
    Write-Host "`n[3/4] GitHub Project" -ForegroundColor Cyan
    if (-not $state.project) {
        $out = Invoke-Gh -GhArgs @('project', 'create', '--owner', $Owner, '--title', $ProjectTitle, '--format', 'json')
        if ($DryRun) { $state.project = @{ number = 0; id = 'PVT_dryrun'; url = '(dry-run)' } }
        else {
            $p = $out | ConvertFrom-Json
            $state.project = @{ number = $p.number; id = $p.id; url = $p.url }
        }
        Save-State
        $trackOptions = ($backlog.tracks | ForEach-Object { $_.option }) -join ','
        $sprintOptions = ($backlog.sprints | ForEach-Object { $_.name }) -join ','
        $n = "$($state.project.number)"
        Invoke-Gh -GhArgs @('project', 'field-create', $n, '--owner', $Owner, '--name', 'Track', '--data-type', 'SINGLE_SELECT', '--single-select-options', $trackOptions) | Out-Null
        Invoke-Gh -GhArgs @('project', 'field-create', $n, '--owner', $Owner, '--name', 'Priority', '--data-type', 'SINGLE_SELECT', '--single-select-options', 'Must,Should,Could') | Out-Null
        Invoke-Gh -GhArgs @('project', 'field-create', $n, '--owner', $Owner, '--name', 'Sprint', '--data-type', 'SINGLE_SELECT', '--single-select-options', $sprintOptions) | Out-Null
        Invoke-Gh -GhArgs @('project', 'field-create', $n, '--owner', $Owner, '--name', 'Estimate', '--data-type', 'NUMBER') | Out-Null
        Invoke-Gh -GhArgs @('project', 'field-create', $n, '--owner', $Owner, '--name', 'Start date', '--data-type', 'DATE') | Out-Null
        Invoke-Gh -GhArgs @('project', 'field-create', $n, '--owner', $Owner, '--name', 'Target date', '--data-type', 'DATE') | Out-Null
        try { Invoke-Gh -GhArgs @('project', 'edit', $n, '--owner', $Owner, '--description', $backlog.project.description, '--readme', $backlog.project.readme) | Out-Null } catch { Write-Warning "Description du projet non definie : $_" }
        try { Invoke-Gh -GhArgs @('project', 'link', $n, '--owner', $Owner, '--repo', "$Owner/$Repo") | Out-Null } catch { Write-Warning "Lien projet/depot a faire manuellement : $_" }
    } else { Write-Host "  projet existant : $($state.project.url)" }

    if (-not $DryRun) {
        $fl = Invoke-Gh -GhArgs @('project', 'field-list', "$($state.project.number)", '--owner', $Owner, '--format', 'json') | ConvertFrom-Json
        foreach ($f in $fl.fields) { $fields[$f.name] = $f }
    }
    Write-Host "  projet : $($state.project.url)"
}

function Set-ItemField {
    param([string]$ItemId, [string]$Field, [string]$Kind, [string]$Value)
    if ($DryRun -or $SkipProject) { return }
    $f = $fields[$Field]
    if (-not $f) { Write-Warning "Champ introuvable : $Field"; return }
    $a = @('project', 'item-edit', '--id', $ItemId, '--project-id', $state.project.id, '--field-id', $f.id)
    switch ($Kind) {
        'select' {
            $opt = $f.options | Where-Object { $_.name -eq $Value } | Select-Object -First 1
            if (-not $opt) { Write-Warning "Option introuvable : $Field = $Value"; return }
            $a += @('--single-select-option-id', $opt.id)
        }
        'number' { $a += @('--number', $Value) }
        'date' { $a += @('--date', $Value) }
    }
    Invoke-Gh -GhArgs $a | Out-Null
}

# ------------------------------------------------------------------ 4. issues
function Get-Ref([string]$id) {
    if ($state.issues.ContainsKey($id)) { return "#$($state.issues[$id].number) ($id)" }
    return $id
}

function Build-IssueBody($it, [bool]$isEpic) {
    $sb = New-Object System.Text.StringBuilder
    $w1 = $it.a; $w2 = $it.b
    $sprint = Get-SprintOf $w2
    $ms = Get-MilestoneOf $w2
    if (-not $isEpic) {
        $epic = $epics | Where-Object { $_.id -eq $it.e } | Select-Object -First 1
        [void]$sb.AppendLine("> **$($ui.epic) :** $(Get-Ref $it.e) - $($epic.t)")
        [void]$sb.AppendLine('')
    }
    [void]$sb.AppendLine("## $($ui.description)")
    [void]$sb.AppendLine($it.d)
    [void]$sb.AppendLine('')
    if (-not $isEpic) {
        [void]$sb.AppendLine("## $($ui.acceptance)")
        foreach ($c in @($it.ac)) { [void]$sb.AppendLine("- [ ] $c") }
        [void]$sb.AppendLine('')
    }
    [void]$sb.AppendLine("## $($ui.planning)")
    [void]$sb.AppendLine('| | |')
    [void]$sb.AppendLine('|---|---|')
    [void]$sb.AppendLine("| $($ui.ref) | ``$($it.id)`` |")
    [void]$sb.AppendLine("| $($ui.weeks) | S$w1 -> S$w2 ($(Format-Day (Get-WeekStart $w1)) -> $(Format-Day (Get-WeekEnd $w2))) |")
    if (-not $isEpic) {
        [void]$sb.AppendLine("| $($ui.sprint) | $($sprint.name) - $($sprint.goal) |")
        [void]$sb.AppendLine("| $($ui.priority) | $($it.p) |")
        [void]$sb.AppendLine("| $($ui.estimate) | $($it.pt) |")
    }
    [void]$sb.AppendLine("| $($ui.milestone) | $($ms.title) |")
    [void]$sb.AppendLine('')
    if (-not $isEpic -and @($it.dep).Count -gt 0 -and $it.dep) {
        [void]$sb.AppendLine("## $($ui.dependencies)")
        foreach ($d in @($it.dep)) { [void]$sb.AppendLine("- $(Get-Ref $d)") }
        [void]$sb.AppendLine('')
    }
    if (-not $isEpic) {
        [void]$sb.AppendLine("## $($ui.dod)")
        $dod = if ($it.ty -in @('story', 'task')) { $ui.dodCode } else { $ui.dodDoc }
        foreach ($x in $dod) { [void]$sb.AppendLine("- [ ] $x") }
        [void]$sb.AppendLine('')
    }
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("_$($ui.source)_")
    return $sb.ToString()
}

function Build-EpicBody($e) {
    $inf = $epicInfo[$e.id]
    $text = Build-IssueBody $e $true
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine("## $($ui.children) ($($inf.count) - $($inf.pts) $($ui.points))")
    foreach ($k in $inf.kids) { [void]$sb.AppendLine("- [ ] $(Get-Ref $k.id) $($k.t)") }
    [void]$sb.AppendLine('')
    return $sb.ToString() + $text
}

$script:subIssuesOk = $true
function New-PlanIssue($it, [bool]$isEpic) {
    if ($state.issues.ContainsKey($it.id)) { return }
    $track = Get-Track $it.k
    $w2 = $it.b
    $ms = Get-MilestoneOf $w2
    $title = "[$($it.id)] $($it.t)"
    $type = if ($isEpic) { 'epic' } else { $it.ty }
    $prio = if ($isEpic) { 'Must' } else { $it.p }
    $labels = @("type: $type", $track.label, "priority: $($prio.ToLower())") -join ','
    $body = if ($isEpic) { Build-EpicBody $it } else { Build-IssueBody $it $false }
    $tmp = [System.IO.Path]::GetTempFileName()
    Write-Utf8File $tmp $body
    try {
        $out = Invoke-Gh -GhArgs @('issue', 'create', '--repo', "$Owner/$Repo", '--title', $title, '--body-file', $tmp, '--label', $labels, '--milestone', $ms.title)
    } finally { Remove-Item $tmp -ErrorAction SilentlyContinue }
    $number = 0; $url = ''
    if ($DryRun) { $script:fake++; $number = $script:fake; $url = "(dry-run)#$number" }
    else {
        if ($out -match 'https://github\.com/[^\s]+/issues/(\d+)') { $url = $Matches[0]; $number = [int]$Matches[1] } else { throw "URL d'issue introuvable : $out" }
    }
    $entry = @{ number = $number; url = $url; itemId = $null }
    $state.issues[$it.id] = $entry
    Write-Host ("  #{0,-4} {1}" -f $number, $title)

    if (-not $SkipProject) {
        $add = Invoke-Gh -GhArgs @('project', 'item-add', "$($state.project.number)", '--owner', $Owner, '--url', $url, '--format', 'json')
        if (-not $DryRun) { $entry.itemId = ($add | ConvertFrom-Json).id }
        $a = if ($isEpic) { $epicInfo[$it.id].a } else { $it.a }
        $b = if ($isEpic) { $epicInfo[$it.id].b } else { $it.b }
        $sprint = Get-SprintOf $b
        if ($entry.itemId) {
            Set-ItemField $entry.itemId 'Status' 'select' $script:initialStatus
            Set-ItemField $entry.itemId 'Track' 'select' $track.option
            Set-ItemField $entry.itemId 'Priority' 'select' $prio
            Set-ItemField $entry.itemId 'Sprint' 'select' $sprint.name
            if (-not $isEpic) { Set-ItemField $entry.itemId 'Estimate' 'number' "$($it.pt)" }
            Set-ItemField $entry.itemId 'Start date' 'date' (Format-Iso (Get-WeekStart $a))
            Set-ItemField $entry.itemId 'Target date' 'date' (Format-Iso (Get-WeekEnd $b))
        }
    }
    Save-State
    if (-not $DryRun) { Start-Sleep -Milliseconds 800 }
}
$script:fake = 100
$script:initialStatus = 'Todo'
if ($fields.ContainsKey('Status') -and ($fields['Status'].options | Where-Object { $_.name -eq 'Backlog' })) { $script:initialStatus = 'Backlog' }

Write-Host "`n[4/4] Epics et issues" -ForegroundColor Cyan
if (-not $DryRun) {
    try {
        $rawIssues = Invoke-Gh -GhArgs @('issue', 'list', '--repo', "$Owner/$Repo", '--state', 'all', '--limit', '200', '--json', 'number,title,url')
        if ($rawIssues) {
            foreach ($ex in ($rawIssues | ConvertFrom-Json)) {
                if ($ex.title -match '^\[([A-Z0-9-]+)\]') {
                    $idKey = $Matches[1]
                    if (-not $state.issues.ContainsKey($idKey)) {
                        $state.issues[$idKey] = @{ number = [int]$ex.number; url = $ex.url; itemId = $null }
                    }
                }
            }
        }
    } catch {
        Write-Warning "Impossible de precharger les issues existantes : $_"
    }
}
foreach ($e in $epics) { New-PlanIssue $e $true }
$created = 0
foreach ($it in $items) {
    if ($Limit -gt 0 -and $created -ge $Limit) { break }
    $before = $state.issues.ContainsKey($it.id)
    New-PlanIssue $it $false
    if (-not $before) { $created++ }
}

# Rattachement sub-issues + mise a jour des epics (liste de taches avec numeros)
Write-Host "`nRattachement des issues a leurs epics..." -ForegroundColor Cyan
foreach ($e in $epics) {
    $epicEntry = $state.issues[$e.id]
    if (-not $epicEntry) { continue }
    if (-not $DryRun) {
        $tmp = [System.IO.Path]::GetTempFileName()
        Write-Utf8File $tmp (Build-EpicBody $e)
        try { Invoke-Gh -GhArgs @('issue', 'edit', "$($epicEntry.number)", '--repo', "$Owner/$Repo", '--body-file', $tmp) | Out-Null } finally { Remove-Item $tmp -ErrorAction SilentlyContinue }
    }
    foreach ($k in $epicInfo[$e.id].kids) {
        $child = $state.issues[$k.id]
        if (-not $child -or -not $script:subIssuesOk -or $DryRun) { continue }
        try {
            $dbId = Invoke-Gh -GhArgs @('api', "repos/$Owner/$Repo/issues/$($child.number)", '--jq', '.id')
            Invoke-Gh -GhArgs @('api', '-X', 'POST', "repos/$Owner/$Repo/issues/$($epicEntry.number)/sub_issues", '-F', "sub_issue_id=$dbId") | Out-Null
        } catch {
            Write-Warning "Sub-issues indisponibles (la liste de taches de l'epic reste utilisable) : $_"
            $script:subIssuesOk = $false
        }
    }
}

Write-Host "`nTermine." -ForegroundColor Green
if (-not $DryRun -and -not $SkipProject) {
    Write-Host "Projet : $($state.project.url)"
    Write-Host "Etapes manuelles restantes : voir .github/planning/README.md (vues, workflows du projet)."
}
