$p1 = 'components\CMS\administration\modals\AdministrationAddUserModal.tsx'
$p2 = 'components\CMS\administration\modals\AdministrationUserModal.tsx'

function UpdateFile($path) {
    if (-not (Test-Path $path)) { Write-Host "File not found: $path"; return }
    $c = [System.IO.File]::ReadAllText($path)
    $original = $c

    # Add Owner to ROLE_OPTIONS
    if ($c -notlike "*'owner'*") {
        $c = $c.Replace("const ROLE_OPTIONS = [", "const ROLE_OPTIONS = [`r`n  { label: 'Owner', value: 'owner' },")
    }

    # Add isOwner check and isDeveloper, isAdmin flags
    if ($c -notlike "*const isOwner =*") {
        $c = $c.Replace("const isDeveloper = currentUserRoles.includes('developer');", "const isOwner = currentUserRoles.includes('owner');`r`n  const isDeveloper = currentUserRoles.includes('developer');")
    }
    
    $c = $c.Replace("isAdmin = currentUserRoles.includes('admin') && !isDeveloper;", "isAdmin = currentUserRoles.includes('admin') && !isDeveloper && !isOwner;")
    $c = $c.Replace("if (isDeveloper) {`r`n      return ROLE_OPTIONS;`r`n    } else if (isAdmin) {", "if (isDeveloper) {`r`n      return ROLE_OPTIONS;`r`n    } else if (isAdmin || isOwner) {")
    $c = $c.Replace("return ROLE_OPTIONS.filter(role => role.value !== 'developer');", "return ROLE_OPTIONS.filter(role => role.value !== 'developer' && role.value !== 'owner');")

    if ($path -like "*AddUserModal*") {
        $c = $c.Replace("const isAssignmentsEnabled = roles.length > 0;", "const isAssignmentsEnabled = roles.length > 0 || isOwner;")
    } else {
        # UserModal
        $c = $c.Replace("const isAssignmentsEnabled = roles.length > 0;", "const isAssignmentsEnabled = (roles.length > 0 || isOwner) && isEditMode;")
        $c = $c.Replace("['admin', 'developer', 'manager', 'location admin'].includes(role)", "['owner', 'admin', 'developer', 'manager', 'location admin'].includes(role)")
        $c = $c.Replace("const canEditLicencees = isDeveloper || isAdmin;", "const canEditLicencees = isDeveloper || isAdmin || isOwner;")
    }

    if ($c -ne $original) {
        [System.IO.File]::WriteAllText($path, $c)
        Write-Host "Updated: $path"
    } else {
        Write-Host "No changes: $path"
    }
}

UpdateFile $p1
UpdateFile $p2
