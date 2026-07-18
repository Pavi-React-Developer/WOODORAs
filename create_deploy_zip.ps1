$src = "c:\Users\DELL\Desktop\MEKHA\NEW\NEW\WoodenToy\backend"
$dest = "c:\Users\DELL\Desktop\MEKHA\NEW\NEW\WoodenToy\refund_fix_deploy.zip"
$tmp = "c:\Users\DELL\Desktop\MEKHA\NEW\NEW\WoodenToy\_refund_tmp"

if (Test-Path $dest) { Remove-Item $dest }
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }

New-Item -ItemType Directory -Path "$tmp\controllers" -Force | Out-Null
New-Item -ItemType Directory -Path "$tmp\routes" -Force | Out-Null
New-Item -ItemType Directory -Path "$tmp\models" -Force | Out-Null

Copy-Item "$src\controllers\refundController.js" "$tmp\controllers\"
Copy-Item "$src\routes\refundRoutes.js" "$tmp\routes\"
Copy-Item "$src\models\Refund.js" "$tmp\models\"

Compress-Archive -Path "$tmp\*" -DestinationPath $dest -Force
Remove-Item $tmp -Recurse -Force
Write-Host "Done: refund_fix_deploy.zip created at $dest"
