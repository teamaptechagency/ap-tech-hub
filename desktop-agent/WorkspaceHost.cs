using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

public partial class WorkAgent {
    const string WorkspaceUrl = "https://www.aptechagency.com/workstation-app";
    WebView2 workspace;
    Timer workspaceTimer;
    Timer chatAlertTimer;
    bool checkingChat;
    string lastGuestAlert;
    Func<System.Threading.Tasks.Task> checkUpdates;
    bool adminSignInPending;
    string AttendancePath { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "APTechWorkAgent", "attendance.dat"); } }
    static bool IsWorkspacePage(string value) {
        Uri uri;
        return Uri.TryCreate(value, UriKind.Absolute, out uri) && uri.Scheme == "https" && uri.Host == "www.aptechagency.com" && uri.Port == 443 && String.IsNullOrEmpty(uri.UserInfo) && uri.AbsolutePath == "/workstation-app";
    }
    static bool IsHubPage(string value) {
        Uri uri; return Uri.TryCreate(value, UriKind.Absolute, out uri) && uri.Scheme == "https" && uri.Host == "www.aptechagency.com" && uri.Port == 443 && String.IsNullOrEmpty(uri.UserInfo);
    }
    string ReadAttendanceToken() {
        try { return Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(AttendancePath), null, DataProtectionScope.CurrentUser)); } catch { return null; }
    }
    void SaveAttendanceToken(string value) {
        if (String.IsNullOrEmpty(value)) { if (File.Exists(AttendancePath)) File.Delete(AttendancePath); return; }
        if (!System.Text.RegularExpressions.Regex.IsMatch(value, "^[a-f0-9]{64}$")) throw new Exception("Invalid attendance session");
        Directory.CreateDirectory(Path.GetDirectoryName(AttendancePath));
        File.WriteAllBytes(AttendancePath, ProtectedData.Protect(Encoding.UTF8.GetBytes(value), null, DataProtectionScope.CurrentUser));
    }
    void PushWorkspaceState() {
        if (workspace == null || workspace.CoreWebView2 == null || !IsWorkspacePage(workspace.CoreWebView2.Source)) return;
        workspace.CoreWebView2.PostWebMessageAsJson(json.Serialize(new { kind = "native-state", pcName = Environment.MachineName, credential = token.Text.Trim(), attendanceToken = ReadAttendanceToken(), appVersion = AppVersion, tracking = tracking, rememberConsent = autoResume.Checked, syncStatus = state.Text }));
    }
    async System.Threading.Tasks.Task InitializeWorkspace() {
        try {
            CoreWebView2Environment.GetAvailableBrowserVersionString();
            workspace = new WebView2 { Dock = DockStyle.Fill };
            Controls.Add(workspace); workspace.BringToFront();
            var profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "APTechWorkAgent", "WebView2");
            var environment = await CoreWebView2Environment.CreateAsync(null, profile);
            await workspace.EnsureCoreWebView2Async(environment);
            workspace.CoreWebView2.Settings.AreDevToolsEnabled = false;
            workspace.CoreWebView2.Settings.IsStatusBarEnabled = false;
            workspace.CoreWebView2.Settings.IsPasswordAutosaveEnabled = false;
            // A shared work PC must never inherit a previous app run's administrator login.
            workspace.CoreWebView2.CookieManager.DeleteAllCookies();
            workspace.CoreWebView2.NavigationStarting += (s,e) => { if (!IsHubPage(e.Uri)) e.Cancel = true; };
            workspace.CoreWebView2.NewWindowRequested += (s,e) => {
                e.Handled = true; Uri uri;
                if (e.IsUserInitiated && Uri.TryCreate(e.Uri, UriKind.Absolute, out uri) && (uri.Scheme == "https" || uri.Scheme == "http")) Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
            };
            workspace.CoreWebView2.PermissionRequested += (s,e) => { e.State = CoreWebView2PermissionState.Deny; };
            workspace.CoreWebView2.WebMessageReceived += async (s,e) => {
                if (!IsWorkspacePage(e.Source) || !IsWorkspacePage(workspace.CoreWebView2.Source)) return;
                try {
                    if (e.WebMessageAsJson.Length > 12000) return;
                    var message = json.Deserialize<Dictionary<string, object>>(e.WebMessageAsJson);
                    string action = message.ContainsKey("action") ? Convert.ToString(message["action"]) : "";
                    if (action == "ready") PushWorkspaceState();
                    else if (action == "pair") {
                        var value = message.ContainsKey("credential") ? Convert.ToString(message["credential"]) : "";
                        if (!System.Text.RegularExpressions.Regex.IsMatch(value, "^[a-f0-9]{64}$")) throw new Exception("Paste the PC credential from Work Station.");
                        if (tracking) Pause(); token.Text = value; SaveConfig(); PushWorkspaceState();
                    } else if (action == "start-tracking") {
                        if (!message.ContainsKey("consent") || !(message["consent"] is bool) || !(bool)message["consent"]) return;
                        consent.Checked = true; autoResume.Checked = message.ContainsKey("remember") && message["remember"] is bool && (bool)message["remember"];
                        await StartTracking(); PushWorkspaceState();
                    } else if (action == "pause-tracking") { Pause(); PushWorkspaceState(); }
                    else if (action == "attendance-token") { SaveAttendanceToken(message.ContainsKey("token") ? Convert.ToString(message["token"]) : null); PushWorkspaceState(); }
                    else if (action == "check-updates" && checkUpdates != null) await checkUpdates();
                    else if (action == "admin-login") { adminSignInPending = true; workspace.CoreWebView2.Navigate("https://www.aptechagency.com/login"); }
                    else if (action == "chat-sound") { System.Media.SystemSounds.Asterisk.Play(); }
                    else if (action == "notify") {
                        tray.ShowBalloonTip(5000, "Work Station visitor chat", "A website customer message is waiting. Open Work Station to reply.", ToolTipIcon.Info);
                    }
                } catch (Exception ex) { MessageBox.Show(ex.Message, "Work Station"); }
            };
            workspace.CoreWebView2.NavigationCompleted += (s,e) => {
                Uri current;
                if (adminSignInPending && Uri.TryCreate(workspace.CoreWebView2.Source, UriKind.Absolute, out current) && IsHubPage(current.AbsoluteUri) && (current.AbsolutePath == "/dashboard" || current.AbsolutePath == "/profile")) {
                    adminSignInPending = false; workspace.CoreWebView2.Navigate(WorkspaceUrl); return;
                }
                PushWorkspaceState();
            };
            workspace.CoreWebView2.Navigate(WorkspaceUrl);
            workspaceTimer = new Timer { Interval = 10000 }; workspaceTimer.Tick += (s,e) => PushWorkspaceState(); workspaceTimer.Start();
            chatAlertTimer = new Timer { Interval = 15000 }; chatAlertTimer.Tick += async (s,e) => await CheckChatAlerts(); chatAlertTimer.Start();
        } catch (Exception ex) {
            if (workspace != null) { Controls.Remove(workspace); workspace.Dispose(); workspace = null; }
            var message = new Label { Text = "The modern interface needs Microsoft Edge WebView2 Runtime.\nYour existing tracker controls remain available below.\n" + ex.Message, Dock = DockStyle.Bottom, Height = 80, ForeColor = Color.White, BackColor = Color.FromArgb(16,22,32) }; Controls.Add(message);
            var help = new LinkLabel { Text = "Open Microsoft's official WebView2 Runtime download", Dock = DockStyle.Bottom, Height = 35 };
            help.LinkClicked += (s,e) => Process.Start(new ProcessStartInfo("https://developer.microsoft.com/microsoft-edge/webview2/") { UseShellExecute = true }); Controls.Add(help);
        }
    }
    async System.Threading.Tasks.Task CheckChatAlerts() {
        if (checkingChat || String.IsNullOrEmpty(ReadAttendanceToken()) || String.IsNullOrEmpty(token.Text)) return;
        checkingChat = true;
        try {
            using (var request = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Get, "https://www.aptechagency.com/api/workstation-chat?view=alerts")) {
                request.Headers.TryAddWithoutValidation("Authorization", "Bearer " + token.Text.Trim());
                request.Headers.TryAddWithoutValidation("X-PC-Name", Environment.MachineName);
                request.Headers.TryAddWithoutValidation("X-Attendance-Token", ReadAttendanceToken());
                using (var response = await client.SendAsync(request)) {
                    if (!response.IsSuccessStatusCode) return;
                    var result = json.Deserialize<Dictionary<string, object>>(await response.Content.ReadAsStringAsync());
                    var latest = result.ContainsKey("latestGuestId") ? Convert.ToString(result["latestGuestId"]) : "";
                    if (!String.IsNullOrEmpty(latest) && latest != lastGuestAlert) {
                        if (lastGuestAlert != null) System.Media.SystemSounds.Asterisk.Play();
                        lastGuestAlert = latest;
                        tray.ShowBalloonTip(5000, "Work Station visitor chat", "A website customer message is waiting. Open Work Station to reply.", ToolTipIcon.Info);
                    }
                }
            }
        } catch { /* Offline: retry without interrupting the worker. */ }
        finally { checkingChat = false; }
    }
    void DisposeWorkspace() {
        if (chatAlertTimer != null) { chatAlertTimer.Stop(); chatAlertTimer.Dispose(); }
        if (workspaceTimer != null) { workspaceTimer.Stop(); workspaceTimer.Dispose(); }
        if (workspace != null) workspace.Dispose();
    }
}
