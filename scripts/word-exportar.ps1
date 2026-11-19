# Abre el .docx con Word, actualiza la tabla de contenido y los campos, lo guarda y exporta a PDF.
# Uso: powershell -File scripts/word-exportar.ps1 <archivo.docx> <salida.pdf>
param([string]$Docx, [string]$Pdf)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open((Resolve-Path $Docx).Path, $false, $false)
  foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
  $doc.Fields.Update() | Out-Null
  foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
  $doc.Save()
  $doc.ExportAsFixedFormat($Pdf, 17)   # 17 = wdExportFormatPDF
  Write-Output ("paginas: " + $doc.ComputeStatistics(2))
  $doc.Close($false)
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
