Option Explicit
Dim shell, baseDir, scriptPath
Set shell = CreateObject("WScript.Shell")
baseDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
scriptPath = baseDir & "\orglist-reminder.py"
shell.Run "pyw -3 """ & scriptPath & """", 0, False
