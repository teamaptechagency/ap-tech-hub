using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

public class Setup : Form {
    readonly CheckBox accept = new CheckBox(), startup = new CheckBox();
    readonly string folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "APTechWorkTracker");
    [STAThread] static void Main() { Application.EnableVisualStyles(); Application.Run(new Setup()); }
    Setup() {
        Text = "Install AP Tech Work Station 0.5.0 (Windows x64)"; ClientSize = new Size(560, 350); FormBorderStyle = FormBorderStyle.FixedDialog; MaximizeBox = false; Font = new Font("Segoe UI", 10);
        var title = new Label { Text = "AP Tech Work Tracker", Left = 24, Top = 24, Width = 510, Height = 35, Font = new Font("Segoe UI", 18, FontStyle.Bold) }; Controls.Add(title);
        var notice = new Label { Text = "Installs for this Windows user, without administrator rights.\nSends PC name and active/idle status to AP Tech Hub. Browser\nrefresh counts require the separate visible extension.\nNo background typed text, passwords, screenshots or clipboard is read.\nThe app and its tray icon remain visible. Pause or exit anytime.", Left = 24, Top = 75, Width = 510, Height = 115 }; Controls.Add(notice);
        startup.Text = "Open the tracker automatically when I sign in to Windows"; startup.SetBounds(24, 203, 510, 32); startup.Checked = true; Controls.Add(startup);
        accept.Text = "I understand the monitoring notice and agree to install."; accept.SetBounds(24, 239, 510, 32); Controls.Add(accept);
        var install = new Button { Text = "Install and open", Left = 24, Top = 290, Width = 250, Height = 36 }; install.Click += (s,e) => Install(); Controls.Add(install);
        var remove = new Button { Text = "Uninstall", Left = 290, Top = 290, Width = 244, Height = 36 }; remove.Click += (s,e) => Uninstall(); Controls.Add(remove);
    }
    string LinkPath(string special) { return Path.Combine(special, "AP Tech Work Tracker.lnk"); }
    void Shortcut(string location, string target) {
        var type = Type.GetTypeFromProgID("WScript.Shell"); var shell = Activator.CreateInstance(type);
        var shortcut = type.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { LinkPath(location) });
        shortcut.GetType().InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { target });
        shortcut.GetType().InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { folder });
        shortcut.GetType().InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
    }
    bool Running() { foreach (var p in Process.GetProcessesByName("APTechWorkTracker")) { p.Dispose(); return true; } return false; }
    void Install() {
        if (!accept.Checked) { MessageBox.Show("Read and accept the monitoring notice first."); return; }
        if (Running()) { MessageBox.Show("Right-click the tracker tray icon and choose Exit, then install again."); return; }
        try {
            Directory.CreateDirectory(folder); string target = Path.Combine(folder, "APTechWorkTracker.exe");
            using (var input = Assembly.GetExecutingAssembly().GetManifestResourceStream("AgentBinary")) using (var output = File.Create(target)) input.CopyTo(output);
            foreach (var file in new[] { "Microsoft.Web.WebView2.Core.dll", "Microsoft.Web.WebView2.WinForms.dll", "WebView2Loader.dll", "WebView2-LICENSE.txt", "WebView2-NOTICE.txt" }) {
                using (var input = Assembly.GetExecutingAssembly().GetManifestResourceStream(file)) using (var output = File.Create(Path.Combine(folder, file))) input.CopyTo(output);
            }
            Shortcut(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), target);
            Shortcut(Environment.GetFolderPath(Environment.SpecialFolder.Programs), target);
            var startupFolder = Environment.GetFolderPath(Environment.SpecialFolder.Startup);
            if (startup.Checked) Shortcut(startupFolder, target); else if (File.Exists(LinkPath(startupFolder))) File.Delete(LinkPath(startupFolder));
            Process.Start(new ProcessStartInfo(target) { UseShellExecute = true });
            MessageBox.Show("Installed. Paste your device credential once. To resume tracking on later logins, enable Remember consent in the app. Pause disables automatic tracking until you enable it again."); Close();
        } catch (Exception ex) { MessageBox.Show("Installation failed: " + ex.Message); }
    }
    void Uninstall() {
        if (Running()) { MessageBox.Show("Exit the tracker from its tray menu first."); return; }
        if (MessageBox.Show("Remove this user's tracker, shortcuts and saved credential? The browser extension is removed separately in Chrome/Edge.", "Uninstall", MessageBoxButtons.YesNo) != DialogResult.Yes) return;
        try {
            foreach (var location in new[] { Environment.SpecialFolder.DesktopDirectory, Environment.SpecialFolder.Programs, Environment.SpecialFolder.Startup }) { var link = LinkPath(Environment.GetFolderPath(location)); if (File.Exists(link)) File.Delete(link); }
            var exe = Path.Combine(folder, "APTechWorkTracker.exe"); if (File.Exists(exe)) File.Delete(exe);
            foreach (var file in new[] { "Microsoft.Web.WebView2.Core.dll", "Microsoft.Web.WebView2.WinForms.dll", "WebView2Loader.dll", "WebView2-LICENSE.txt", "WebView2-NOTICE.txt" }) { var path = Path.Combine(folder, file); if (File.Exists(path)) File.Delete(path); }
            var attendanceSettings = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "APTechWorkAgent", "attendance.dat"); if (File.Exists(attendanceSettings)) File.Delete(attendanceSettings);
            var settings = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "APTechWorkAgent", "settings.dat"); if (File.Exists(settings)) File.Delete(settings);
            MessageBox.Show("Removed. Revoke the device credential in Hub if this PC will no longer be used."); Close();
        } catch (Exception ex) { MessageBox.Show("Uninstall failed: " + ex.Message); }
    }
}
