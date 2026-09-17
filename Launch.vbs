Set taskShell = CreateObject("WScript.Shell")
Set taskFiles = CreateObject("Scripting.FileSystemObject")
taskFolder = taskFiles.GetParentFolderName(WScript.ScriptFullName)
taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File " & Chr(34) & taskFolder & "\Start-FlightLab.ps1" & Chr(34)
taskShell.Run taskCommand, 0, False
