param([Parameter(Mandatory=$true)][string]$BaseDir)
$ErrorActionPreference = 'Stop'
$appId = 'perfectddt.Orglist.Reminder'
$shortcutPath = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\Orglist Reminder.lnk'
$targetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$vbsPath = Join-Path $BaseDir 'orglist-reminder-start.vbs'
$iconPath = (Get-ChildItem -LiteralPath $BaseDir -Filter '*.ico' -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
if (-not $iconPath) { $iconPath = Join-Path $env:WINDIR 'System32\shell32.dll' }

$source = @'
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;

namespace OrglistToastRegistration
{
    [ComImport, Guid("00021401-0000-0000-C000-000000000046")]
    internal class ShellLink { }

    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("000214F9-0000-0000-C000-000000000046")]
    internal interface IShellLinkW
    {
        void GetPath(IntPtr file, int maxPath, IntPtr data, uint flags);
        void GetIDList(out IntPtr idList);
        void SetIDList(IntPtr idList);
        void GetDescription(IntPtr name, int maxName);
        void SetDescription([MarshalAs(UnmanagedType.LPWStr)] string name);
        void GetWorkingDirectory(IntPtr directory, int maxPath);
        void SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string directory);
        void GetArguments(IntPtr arguments, int maxPath);
        void SetArguments([MarshalAs(UnmanagedType.LPWStr)] string arguments);
        void GetHotkey(out short hotkey);
        void SetHotkey(short hotkey);
        void GetShowCmd(out int showCommand);
        void SetShowCmd(int showCommand);
        void GetIconLocation(IntPtr iconPath, int iconPathLength, out int iconIndex);
        void SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string iconPath, int iconIndex);
        void SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string path, uint reserved);
        void Resolve(IntPtr window, uint flags);
        void SetPath([MarshalAs(UnmanagedType.LPWStr)] string path);
    }

    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99")]
    internal interface IPropertyStore
    {
        uint GetCount();
        void GetAt(uint index, out PropertyKey key);
        void GetValue(ref PropertyKey key, out PropVariant value);
        void SetValue(ref PropertyKey key, [In] PropVariant value);
        void Commit();
    }

    [StructLayout(LayoutKind.Sequential, Pack = 4)]
    internal struct PropertyKey
    {
        public Guid FormatId;
        public uint PropertyId;
        public PropertyKey(string formatId, uint propertyId)
        {
            FormatId = new Guid(formatId);
            PropertyId = propertyId;
        }
    }

    [StructLayout(LayoutKind.Explicit)]
    internal sealed class PropVariant : IDisposable
    {
        [FieldOffset(0)] private ushort valueType;
        [FieldOffset(8)] private IntPtr pointerValue;
        public PropVariant(string value)
        {
            valueType = 31;
            pointerValue = Marshal.StringToCoTaskMemUni(value);
        }
        [DllImport("ole32.dll")]
        private static extern int PropVariantClear([In, Out] PropVariant value);
        public void Dispose()
        {
            PropVariantClear(this);
            GC.SuppressFinalize(this);
        }
        ~PropVariant() { Dispose(); }
    }

    public static class ShortcutManager
    {
        public static void Create(string shortcutPath, string targetPath, string arguments, string workingDirectory, string iconPath, string appId)
        {
            object instance = new ShellLink();
            try
            {
                IShellLinkW link = (IShellLinkW)instance;
                link.SetPath(targetPath);
                link.SetArguments(arguments);
                link.SetWorkingDirectory(workingDirectory);
                link.SetDescription("Orglist Windows Reminder");
                link.SetIconLocation(iconPath, 0);
                IPropertyStore store = (IPropertyStore)instance;
                PropertyKey key = new PropertyKey("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3", 5);
                using (PropVariant value = new PropVariant(appId))
                {
                    store.SetValue(ref key, value);
                    store.Commit();
                }
                ((IPersistFile)instance).Save(shortcutPath, true);
            }
            finally
            {
                Marshal.FinalReleaseComObject(instance);
            }
        }
    }
}
'@

Add-Type -TypeDefinition $source -Language CSharp
[OrglistToastRegistration.ShortcutManager]::Create(
    $shortcutPath,
    $targetPath,
    ('"' + $vbsPath + '"'),
    $BaseDir,
    $iconPath,
    $appId
)
$registryPath = 'HKCU:\Software\Classes\AppUserModelId\' + $appId
New-Item -Path $registryPath -Force | Out-Null
New-ItemProperty -Path $registryPath -Name DisplayName -Value 'Orglist Reminder' -PropertyType String -Force | Out-Null
New-ItemProperty -Path $registryPath -Name IconUri -Value $iconPath -PropertyType String -Force | Out-Null
$startupShortcutPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'Orglist Reminder.lnk'
$shell = New-Object -ComObject WScript.Shell
$startupShortcut = $shell.CreateShortcut($startupShortcutPath)
$startupShortcut.TargetPath = $targetPath
$startupShortcut.Arguments = '"' + $vbsPath + '"'
$startupShortcut.WorkingDirectory = $BaseDir
$startupShortcut.IconLocation = $iconPath
$startupShortcut.Save()
Write-Output $shortcutPath
Write-Output $startupShortcutPath
