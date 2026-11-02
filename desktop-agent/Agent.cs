using System;
using System.Collections.Generic;
using System.Drawing;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;

public partial class WorkAgent : Form {
    const string AppVersion = "0.5.3";
    [StructLayout(LayoutKind.Sequential)] struct LASTINPUTINFO { public uint size; public uint time; }
    [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref LASTINPUTINFO info);
    readonly TextBox url = new TextBox(), token = new TextBox();
    readonly CheckBox consent = new CheckBox(), autoResume = new CheckBox();
    readonly Label state = new Label();
    readonly Button start = new Button(), pause = new Button();
    readonly NotifyIcon tray = new NotifyIcon();
    readonly Timer timer = new Timer();
    readonly HttpClient client = new HttpClient();
    readonly JavaScriptSerializer json = new JavaScriptSerializer();
    readonly string config = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "APTechWorkAgent", "settings.dat");
    bool tracking, sending, exitRequested;
    string pendingPayload, syncRequestId;
    static System.Threading.EventWaitHandle reopenEvent;
    Timer reopenTimer;

    [STAThread] public static void Main() {
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
        bool first;
        using (var mutex = new System.Threading.Mutex(true, "Local\\APTechWorkStation-" + Environment.UserName, out first)) {
            reopenEvent = new System.Threading.EventWaitHandle(false, System.Threading.EventResetMode.AutoReset, "Local\\APTechWorkStationOpen-" + Environment.UserName);
            if (!first) { reopenEvent.Set(); reopenEvent.Dispose(); return; }
            try { Application.Run(new WorkAgent()); } finally { reopenEvent.Dispose(); mutex.ReleaseMutex(); }
        }
    }
    public WorkAgent() {
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath) ?? SystemIcons.Application;
        Text = "AP Tech Work Tracker " + AppVersion; ClientSize = new Size(560, 540); MinimumSize = new Size(576, 579);
        BackColor = Color.FromArgb(16, 22, 32); ForeColor = Color.White; Font = new Font("Segoe UI", 10);
        AddLabel("AP TECH  /  WORK TRACKER", 24, 20, 510, 26, 15);
        AddLabel("PC: " + Environment.MachineName, 24, 57, 510, 24, 10);
        url.Text = "https://www.aptechagency.com";
        AddLabel("Connected to AP Tech Hub automatically", 24, 95, 510, 22, 10);
        autoResume.Text = "Remember consent and start tracking when this app opens"; autoResume.SetBounds(24, 121, 510, 30); Controls.Add(autoResume);
        AddLabel("First setup only: paste the pairing credential from your admin", 24, 160, 510, 22, 10); token.SetBounds(24, 185, 510, 28); token.UseSystemPasswordChar = true; Controls.Add(token);
        consent.Text = "I have read the notice and agree to start this work session."; consent.SetBounds(24, 227, 510, 40); Controls.Add(consent);
        AddLabel("Sends PC status and work-site interaction counts. Attendance saves\nyour submitted login and work notes. No background keystroke text,\nclipboard contents, screenshots or private messages are collected.", 24, 276, 510, 64, 9);
        start.Text = "Start work session"; start.SetBounds(24, 349, 240, 34); start.ForeColor = Color.Black; start.BackColor = Color.White; start.Click += async (s,e) => await StartTracking(); Controls.Add(start);
        pause.Text = "Pause tracking"; pause.SetBounds(280, 349, 254, 34); pause.ForeColor = Color.Black; pause.BackColor = Color.White; pause.Click += (s,e) => Pause(); Controls.Add(pause);
        state.SetBounds(24, 393, 510, 24); state.Text = "Paused. Nothing is being collected."; Controls.Add(state);
        var attendance = new Button(); attendance.Text = "Employee attendance / Login / Logout"; attendance.SetBounds(24, 433, 510, 32); attendance.ForeColor = Color.Black; attendance.BackColor = Color.White;
        attendance.Click += (s,e) => { if (!System.Text.RegularExpressions.Regex.IsMatch(token.Text.Trim(), "^[a-f0-9]{64}$")) { MessageBox.Show("Pair this PC with its device credential first."); return; } using (var form = new AttendanceForm(token.Text.Trim())) form.ShowDialog(this); }; Controls.Add(attendance);
        var update = new Button(); update.Text = "Check for software updates"; update.SetBounds(24, 483, 510, 32); update.ForeColor = Color.Black; update.BackColor = Color.White;
        checkUpdates = async () => {
            update.Enabled = false;
            try {
                var text = await client.GetStringAsync("https://www.aptechagency.com/downloads/work-tracker/release.json?check=" + DateTime.UtcNow.Ticks);
                var release = json.Deserialize<Dictionary<string, object>>(text);
                Version latest; if (!release.ContainsKey("version") || !Version.TryParse(Convert.ToString(release["version"]), out latest)) throw new Exception();
                if (latest <= new Version(AppVersion)) { MessageBox.Show("You have the current version: " + AppVersion); return; }
                string notes = release.ContainsKey("releaseNotes") ? Convert.ToString(release["releaseNotes"]) : "Improvements and fixes. See the official download page for details.";
                if (notes.Length > 4000) notes = notes.Substring(0, 4000);
                if (!ConfirmUpdate(latest.ToString(), notes)) return;
                string expected = release.ContainsKey("installerSha256") ? Convert.ToString(release["installerSha256"]) : "";
                if (!System.Text.RegularExpressions.Regex.IsMatch(expected, "^[a-fA-F0-9]{64}$")) throw new Exception("Release is missing its installer verification hash.");
                update.Text = "Downloading update...";
                byte[] binary;
                using (var downloader = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false })) {
                    downloader.Timeout = TimeSpan.FromMinutes(2); downloader.MaxResponseContentBufferSize = 16 * 1024 * 1024;
                    using (var response = await downloader.GetAsync("https://www.aptechagency.com/downloads/work-tracker/APTechWorkTrackerSetup.exe?version=" + latest)) {
                        response.EnsureSuccessStatusCode(); binary = await response.Content.ReadAsByteArrayAsync();
                    }
                }
                VerifyInstaller(binary, expected);
                if (IsDisposed || Disposing) return;
                string updateFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "APTechWorkAgent", "Updates", Guid.NewGuid().ToString("N"));
                Directory.CreateDirectory(updateFolder);
                string installer = Path.Combine(updateFolder, "APTechWorkTrackerSetup.exe"); File.WriteAllBytes(installer, binary);
                // Keep the installer visible: the employee reviews its notice and clicks Install.
                Process.Start(new ProcessStartInfo(installer) { UseShellExecute = true });
                exitRequested = true; Close();
            } catch (Exception ex) { if (!IsDisposed) MessageBox.Show("Update was not installed: " + ex.Message + "\nYou can retry or visit https://www.aptechagency.com/work-tracker"); }
            finally { if (!update.IsDisposed) { update.Enabled = true; update.Text = "Check for software updates"; } }
        }; update.Click += async (s,e) => await checkUpdates(); Controls.Add(update);
        tray.Icon = Icon; tray.Text = "AP Tech Work Tracker - paused"; tray.Visible = true;
        var menu = new ContextMenuStrip(); menu.Items.Add("Open tracker", null, (s,e) => { Show(); WindowState = FormWindowState.Normal; Activate(); }); menu.Items.Add("Pause tracking", null, (s,e) => Pause()); menu.Items.Add("Exit", null, (s,e) => { exitRequested = true; Close(); }); tray.ContextMenuStrip = menu;
        tray.DoubleClick += (s,e) => { Show(); WindowState = FormWindowState.Normal; Activate(); };
        timer.Interval = 30000; timer.Tick += async (s,e) => { if (tracking) await Send(false); };
        client.Timeout = TimeSpan.FromSeconds(15);
        FormClosing += (s,e) => {
            if (e.CloseReason == CloseReason.UserClosing && !exitRequested) {
                e.Cancel = true; Hide();
                tray.ShowBalloonTip(4000, "AP Tech Work Tracker", tracking ? "Work tracking continues. Use the tray icon to open, pause or exit." : "Tracker is paused in the tray. Use its icon to open or exit.", ToolTipIcon.Info);
                return;
            }
            tracking = false; timer.Stop(); if (reopenTimer != null) reopenTimer.Dispose(); DisposeWorkspace(); tray.Visible = false; tray.Dispose(); client.Dispose();
        };
        LoadConfig();
        ClientSize = new Size(1180, 800); MinimumSize = new Size(940, 640);
        reopenTimer = new Timer { Interval = 500 }; reopenTimer.Tick += (s,e) => { if (reopenEvent != null && reopenEvent.WaitOne(0)) { Show(); WindowState = FormWindowState.Normal; Activate(); } }; reopenTimer.Start();
        Shown += async (s,e) => { var interfaceTask = InitializeWorkspace(); if (autoResume.Checked && consent.Checked) await StartTracking(); await interfaceTask; };
    }
    async System.Threading.Tasks.Task StartTracking() {
        if (sending || !ValidateSettings()) return;
        try { SaveConfig(); } catch { MessageBox.Show("Could not save settings for this Windows user."); return; }
        tracking = true; url.Enabled = token.Enabled = false; start.Enabled = false; timer.Start(); await Send(false);
    }
    static void VerifyInstaller(byte[] binary, string expected) {
        string actual; using (var sha = SHA256.Create()) actual = BitConverter.ToString(sha.ComputeHash(binary)).Replace("-", "");
        if (!String.Equals(actual, expected, StringComparison.OrdinalIgnoreCase)) throw new Exception("Installer verification failed. The release may still be deploying. Try again later.");
    }
    bool ConfirmUpdate(string latest, string notes) {
        using (var dialog = new Form()) {
            dialog.Text = "New update available"; dialog.ClientSize = new Size(520, 370); dialog.StartPosition = FormStartPosition.CenterParent;
            dialog.FormBorderStyle = FormBorderStyle.FixedDialog; dialog.MaximizeBox = false; dialog.MinimizeBox = false; dialog.Font = Font;
            var versions = new Label { Text = "Current version: " + AppVersion + "    New version: " + latest, Left = 20, Top = 20, Width = 480, Height = 30 };
            var changes = new TextBox { Text = notes, Multiline = true, ReadOnly = true, ScrollBars = ScrollBars.Vertical, Left = 20, Top = 60, Width = 480, Height = 180 };
            var notice = new Label { Text = "Downloads and verifies the official installer, then closes this app.\nReview the installer and click Install. Windows may request approval.", Left = 20, Top = 252, Width = 480, Height = 55 };
            var now = new Button { Text = "Update now", DialogResult = DialogResult.OK, Left = 20, Top = 320, Width = 230, Height = 32 };
            var later = new Button { Text = "Later", DialogResult = DialogResult.Cancel, Left = 270, Top = 320, Width = 230, Height = 32 };
            dialog.Controls.AddRange(new Control[] { versions, changes, notice, now, later }); dialog.AcceptButton = now; dialog.CancelButton = later;
            return dialog.ShowDialog(this) == DialogResult.OK;
        }
    }
    void AddLabel(string text, int x, int y, int w, int h, int size) { var l = new Label(); l.Text = text; l.SetBounds(x,y,w,h); l.Font = new Font("Segoe UI", size); Controls.Add(l); }
    bool ValidateSettings() {
        Uri parsed; if (!Uri.TryCreate(url.Text.Trim(), UriKind.Absolute, out parsed) || parsed.Scheme != "https" || parsed.AbsolutePath != "/" || !String.IsNullOrEmpty(parsed.Query) || !String.IsNullOrEmpty(parsed.UserInfo)) { MessageBox.Show("Enter the HTTPS origin of your Hub, without a path."); return false; }
        if (!System.Text.RegularExpressions.Regex.IsMatch(token.Text.Trim(), "^[a-f0-9]{64}$")) { MessageBox.Show("Paste the 64-character device credential from Hub."); return false; }
        if (!consent.Checked) { MessageBox.Show("Read the notice and enable the consent checkbox to start."); return false; }
        return true;
    }
    void Pause() { tracking = false; timer.Stop(); pendingPayload = null; url.Enabled = token.Enabled = true; start.Enabled = !sending; consent.Checked = false; autoResume.Checked = false; try { SaveConfig(); } catch {} state.Text = "Paused locally. Browser extension must also be paused separately."; tray.Text = "AP Tech Work Tracker - paused"; }
    async System.Threading.Tasks.Task Send(bool unused) {
        if (sending || !tracking) return; sending = true;
        bool followUp = false;
        try {
            if (pendingPayload == null) {
                var info = new LASTINPUTINFO(); info.size = (uint)Marshal.SizeOf(info);
                if (!GetLastInputInfo(ref info)) throw new Exception("Cannot read idle status");
                uint elapsed = unchecked((uint)Environment.TickCount - info.time); int idle = (int)Math.Min(elapsed / 1000, 86400u);
                var evt = new { id = Guid.NewGuid().ToString(), type = idle >= 300 ? "IDLE" : "ACTIVE", platform = "Windows", idleSeconds = idle, observedAt = (long)(DateTime.UtcNow - new DateTime(1970,1,1,0,0,0,DateTimeKind.Utc)).TotalMilliseconds };
                pendingPayload = json.Serialize(new { source = "WINDOWS", pcName = Environment.MachineName, consent = true, appVersion = AppVersion, syncRequestId = syncRequestId, events = new [] { evt } });
            }
            var request = new HttpRequestMessage(HttpMethod.Post, url.Text.Trim().TrimEnd('/') + "/api/device-agent"); request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.Text.Trim()); request.Content = new StringContent(pendingPayload, Encoding.UTF8, "application/json");
            using (request) using (var response = await client.SendAsync(request)) {
                if (response.StatusCode == HttpStatusCode.Unauthorized || response.StatusCode == HttpStatusCode.Forbidden) { Pause(); state.Text = "Credential rejected. Ask your admin to reconnect this PC."; return; }
                response.EnsureSuccessStatusCode(); pendingPayload = null;
                var reply = json.Deserialize<Dictionary<string, object>>(await response.Content.ReadAsStringAsync());
                string requested = reply.ContainsKey("syncRequestId") ? Convert.ToString(reply["syncRequestId"]) : null;
                Guid parsedRequest;
                followUp = Guid.TryParse(requested, out parsedRequest) && requested != syncRequestId;
                syncRequestId = followUp ? requested : null;
            }
            if (tracking) { state.Text = "Tracking visible - synced " + DateTime.Now.ToString("HH:mm:ss"); tray.Text = "AP Tech Work Tracker - running"; }
        } catch { if (tracking) state.Text = "Not synced. Retrying in 30 seconds. No offline history is saved."; }
        finally { sending = false; if (!tracking) start.Enabled = true; }
        if (followUp && tracking) await Send(false);
    }
    void SaveConfig() { Directory.CreateDirectory(Path.GetDirectoryName(config)); var bytes = Encoding.UTF8.GetBytes("https://www.aptechagency.com\n" + token.Text.Trim() + "\n" + (autoResume.Checked && consent.Checked ? "yes" : "no")); File.WriteAllBytes(config, ProtectedData.Protect(bytes, null, DataProtectionScope.CurrentUser)); }
    void LoadConfig() { try { var parts = Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(config), null, DataProtectionScope.CurrentUser)).Split('\n'); url.Text = "https://www.aptechagency.com"; token.Text = parts[1]; autoResume.Checked = consent.Checked = parts.Length > 2 && parts[2] == "yes"; } catch {} }
}
