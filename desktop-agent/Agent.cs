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

public class WorkAgent : Form {
    const string AppVersion = "0.3.1";
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
    string pendingPayload;

    [STAThread] public static void Main() {
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new WorkAgent());
    }
    public WorkAgent() {
        Text = "AP Tech Work Tracker " + AppVersion; ClientSize = new Size(560, 490); MinimumSize = new Size(576, 529);
        BackColor = Color.FromArgb(16, 22, 32); ForeColor = Color.White; Font = new Font("Segoe UI", 10);
        AddLabel("AP TECH  /  WORK TRACKER", 24, 20, 510, 26, 15);
        AddLabel("PC: " + Environment.MachineName, 24, 57, 510, 24, 10);
        url.Text = "https://www.aptechagency.com";
        AddLabel("Connected to AP Tech Hub automatically", 24, 95, 510, 22, 10);
        autoResume.Text = "Remember consent and start tracking when this app opens"; autoResume.SetBounds(24, 121, 510, 30); Controls.Add(autoResume);
        AddLabel("First setup only: paste the pairing credential from your admin", 24, 160, 510, 22, 10); token.SetBounds(24, 185, 510, 28); token.UseSystemPasswordChar = true; Controls.Add(token);
        consent.Text = "I have read the notice and agree to start this work session."; consent.SetBounds(24, 227, 510, 40); Controls.Add(consent);
        AddLabel("Sends PC name and active/idle status every 30 seconds. Browser extension\nrecords work-site refreshes and interaction counts only. No typed text,\nclipboard contents, screenshots, passwords or private messages are read.", 24, 276, 510, 64, 9);
        start.Text = "Start work session"; start.SetBounds(24, 349, 240, 34); start.ForeColor = Color.Black; start.BackColor = Color.White; start.Click += async (s,e) => { if (sending || !ValidateSettings()) return; try { SaveConfig(); } catch { MessageBox.Show("Could not save settings for this Windows user."); return; } tracking = true; url.Enabled = token.Enabled = false; start.Enabled = false; timer.Start(); await Send(false); }; Controls.Add(start);
        pause.Text = "Pause tracking"; pause.SetBounds(280, 349, 254, 34); pause.ForeColor = Color.Black; pause.BackColor = Color.White; pause.Click += (s,e) => Pause(); Controls.Add(pause);
        state.SetBounds(24, 393, 510, 24); state.Text = "Paused. Nothing is being collected."; Controls.Add(state);
        var update = new Button(); update.Text = "Check for software updates"; update.SetBounds(24, 433, 510, 32); update.ForeColor = Color.Black; update.BackColor = Color.White;
        update.Click += async (s,e) => {
            update.Enabled = false;
            try {
                var text = await client.GetStringAsync("https://www.aptechagency.com/downloads/work-tracker/release.json");
                var release = json.Deserialize<Dictionary<string, object>>(text);
                Version latest; if (!release.ContainsKey("version") || !Version.TryParse(Convert.ToString(release["version"]), out latest)) throw new Exception();
                if (latest <= new Version(AppVersion)) { MessageBox.Show("You have the current version: " + AppVersion); return; }
                if (MessageBox.Show("Version " + latest + " is available. Open the official download page? Close this app before replacing the EXE. No update will run automatically.", "Software update", MessageBoxButtons.YesNo) == DialogResult.Yes) {
                    Process.Start(new ProcessStartInfo("https://www.aptechagency.com/work-tracker") { UseShellExecute = true });
                }
            } catch { MessageBox.Show("Could not check updates. Visit https://www.aptechagency.com/work-tracker"); }
            finally { update.Enabled = true; }
        }; Controls.Add(update);
        tray.Icon = SystemIcons.Application; tray.Text = "AP Tech Work Tracker - paused"; tray.Visible = true;
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
            tracking = false; timer.Stop(); tray.Visible = false; tray.Dispose(); client.Dispose();
        };
        LoadConfig();
        Shown += (s,e) => { if (autoResume.Checked && consent.Checked) start.PerformClick(); };
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
        try {
            if (pendingPayload == null) {
                var info = new LASTINPUTINFO(); info.size = (uint)Marshal.SizeOf(info);
                if (!GetLastInputInfo(ref info)) throw new Exception("Cannot read idle status");
                uint elapsed = unchecked((uint)Environment.TickCount - info.time); int idle = (int)Math.Min(elapsed / 1000, 86400u);
                var evt = new { id = Guid.NewGuid().ToString(), type = idle >= 300 ? "IDLE" : "ACTIVE", platform = "Windows", idleSeconds = idle };
                pendingPayload = json.Serialize(new { source = "WINDOWS", pcName = Environment.MachineName, consent = true, events = new [] { evt } });
            }
            var request = new HttpRequestMessage(HttpMethod.Post, url.Text.Trim().TrimEnd('/') + "/api/device-agent"); request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.Text.Trim()); request.Content = new StringContent(pendingPayload, Encoding.UTF8, "application/json");
            using (request) using (var response = await client.SendAsync(request)) {
                if (response.StatusCode == HttpStatusCode.Unauthorized || response.StatusCode == HttpStatusCode.Forbidden) { Pause(); state.Text = "Credential rejected. Ask your admin to reconnect this PC."; return; }
                response.EnsureSuccessStatusCode(); pendingPayload = null;
            }
            if (tracking) { state.Text = "Tracking visible - synced " + DateTime.Now.ToString("HH:mm:ss"); tray.Text = "AP Tech Work Tracker - running"; }
        } catch { if (tracking) state.Text = "Not synced. Retrying in 30 seconds. No offline history is saved."; }
        finally { sending = false; if (!tracking) start.Enabled = true; }
    }
    void SaveConfig() { Directory.CreateDirectory(Path.GetDirectoryName(config)); var bytes = Encoding.UTF8.GetBytes("https://www.aptechagency.com\n" + token.Text.Trim() + "\n" + (autoResume.Checked && consent.Checked ? "yes" : "no")); File.WriteAllBytes(config, ProtectedData.Protect(bytes, null, DataProtectionScope.CurrentUser)); }
    void LoadConfig() { try { var parts = Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(config), null, DataProtectionScope.CurrentUser)).Split('\n'); url.Text = "https://www.aptechagency.com"; token.Text = parts[1]; autoResume.Checked = consent.Checked = parts.Length > 2 && parts[2] == "yes"; } catch {} }
}
