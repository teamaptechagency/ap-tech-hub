using System;
using System.Collections.Generic;
using System.Drawing;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;

// Attendance is deliberately independent of the monitoring timer and consent controls.
public class AttendanceForm : Form {
    readonly string credential;
    readonly HttpClient client = new HttpClient();
    readonly JavaScriptSerializer json = new JavaScriptSerializer();
    readonly string config = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "APTechWorkAgent", "attendance.dat");
    readonly TextBox code = new TextBox(), name = new TextBox(), password = new TextBox(), task = new TextBox(), handover = new TextBox();
    readonly Label status = new Label();
    readonly Label timerLabel = new Label();
    readonly Timer clock = new Timer();
    readonly Stopwatch sinceServer = new Stopwatch();
    Dictionary<string, object> activeShift;
    DateTime serverNow = DateTime.UtcNow;
    readonly Button login = new Button(), register = new Button(), pause = new Button(), resume = new Button(), logout = new Button(), save = new Button(), refresh = new Button();
    string sessionToken;
    bool busy;
    string earlyLeaveReason;
    public AttendanceForm(string deviceCredential) {
        credential = deviceCredential;
        Text = "Employee attendance - separate from activity tracking"; ClientSize = new Size(630, 760); Font = new Font("Segoe UI", 10); FormBorderStyle = FormBorderStyle.FixedDialog; MaximizeBox = false; StartPosition = FormStartPosition.CenterParent;
        Label("Login records arrival. End shift / Logout records departure.\nThis does NOT start or stop device activity tracking. No website access needed.\nPC shutdown does not end attendance: always log out before leaving.", 20, 16, 590, 75);
        Label("Employee ID", 20, 98, 270, 24); code.SetBounds(20, 124, 275, 28); Controls.Add(code);
        Label("Name (only for registration)", 320, 98, 290, 24); name.SetBounds(320, 124, 290, 28); Controls.Add(name);
        Label("Password (10+ characters for new accounts)", 20, 163, 590, 24); password.SetBounds(20, 189, 590, 28); password.UseSystemPasswordChar = true; Controls.Add(password);
        Configure(login, "Login / Start attendance", 20, 232, 285, async (s,e) => await Send("login"));
        Configure(register, "Request account (admin approves)", 320, 232, 290, async (s,e) => await Send("register"));
        status.SetBounds(20, 282, 590, 60); status.Text = "Not logged in for attendance. Device activity is unaffected."; Controls.Add(status);
        timerLabel.SetBounds(20, 345, 590, 44); Controls.Add(timerLabel);
        Configure(pause, "Start break", 20, 400, 135, async (s,e) => await Send("break"));
        Configure(resume, "End break", 170, 400, 135, async (s,e) => await Send("resume"));
        Configure(refresh, "Refresh status", 320, 400, 135, async (s,e) => await Send("status"));
        var daily = new Button(); Configure(daily, "Daily checklist", 470, 400, 140, (s,e) => { if (String.IsNullOrEmpty(sessionToken)) { MessageBox.Show("Log in for attendance first."); return; } using (var form = new DailyTasksForm(credential, sessionToken)) form.ShowDialog(this); });
        Label("Current task / completed work (work notes only; no secrets)", 20, 450, 590, 24); task.SetBounds(20, 478, 590, 65); task.Multiline = true; task.MaxLength = 1000; Controls.Add(task);
        Label("Handover for the next shift", 20, 554, 590, 24); handover.SetBounds(20, 580, 590, 65); handover.Multiline = true; handover.MaxLength = 2000; Controls.Add(handover);
        Configure(save, "Save task / handover", 20, 672, 285, async (s,e) => await Send("task"));
        Configure(logout, "End shift / Logout", 320, 672, 290, async (s,e) => {
            if (MessageBox.Show("Record your departure now? Saved task/handover will stay in your employee report. Device activity tracking continues independently.", "End attendance", MessageBoxButtons.YesNo) == DialogResult.Yes) await Send("logout");
        });
        Label("Save notes before logout. Closing this window does not end attendance.", 20, 715, 590, 24);
        client.Timeout = TimeSpan.FromSeconds(15);
        try { sessionToken = Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(config), null, DataProtectionScope.CurrentUser)); } catch { }
        UpdateControls();
        Shown += async (s,e) => { if (!String.IsNullOrEmpty(sessionToken)) await Send("status"); };
        clock.Interval = 1000; clock.Tick += (s,e) => TickClock(); clock.Start();
        FormClosed += (s,e) => { clock.Stop(); clock.Dispose(); client.Dispose(); };
    }
    static DateTime Stamp(object value) { return DateTime.Parse(Convert.ToString(value), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind).ToUniversalTime(); }
    static string Duration(double seconds) { var span = TimeSpan.FromSeconds(Math.Max(0, seconds)); return ((int)span.TotalHours).ToString("00") + ":" + span.Minutes.ToString("00") + ":" + span.Seconds.ToString("00"); }
    void TickClock() {
        if (activeShift == null) return;
        var now = activeShift["endedAt"] != null ? Stamp(activeShift["endedAt"]) : serverNow.Add(sinceServer.Elapsed);
        double seconds = Math.Max(0, (now - Stamp(activeShift["startedAt"])).TotalSeconds - Convert.ToInt32(activeShift["breakSeconds"]));
        if (activeShift["breakStartedAt"] != null) seconds = Math.Max(0, seconds - (now - Stamp(activeShift["breakStartedAt"])).TotalSeconds);
        double remaining = Math.Max(Math.Max(0, 28800 - seconds), (Stamp(activeShift["scheduledEndAt"]) - now).TotalSeconds);
        timerLabel.Text = "Attendance (breaks excluded): " + Duration(Math.Min(28800, seconds)) + "   Remaining: " + Duration(remaining) + "\nExtra beyond 8h: " + Duration(seconds - 28800) + " | Shift end: " + Stamp(activeShift["scheduledEndAt"]).AddHours(6).ToString("dd MMM HH:mm") + " Dhaka";
    }
    string AskEarlyReason() {
        using (var dialog = new Form()) {
            dialog.Text = "Short attendance - reason required"; dialog.ClientSize = new Size(500, 210); dialog.StartPosition = FormStartPosition.CenterParent;
            dialog.Controls.Add(new Label { Text = "Eight hours excluding breaks / scheduled end are incomplete.\nThis will NOT be full attendance. Enter the reason for leaving:", Left = 15, Top = 15, Width = 470, Height = 45 });
            var input = new TextBox { Multiline = true, MaxLength = 500, Left = 15, Top = 65, Width = 470, Height = 80 }; dialog.Controls.Add(input);
            var confirm = new Button { Text = "Record early departure", DialogResult = DialogResult.OK, Left = 15, Top = 160, Width = 270, Height = 32 }; dialog.Controls.Add(confirm);
            var cancel = new Button { Text = "Cancel", DialogResult = DialogResult.Cancel, Left = 300, Top = 160, Width = 185, Height = 32 }; dialog.Controls.Add(cancel); dialog.CancelButton = cancel;
            return dialog.ShowDialog(this) == DialogResult.OK && !String.IsNullOrWhiteSpace(input.Text) ? input.Text.Trim() : null;
        }
    }
    void Label(string text, int x, int y, int w, int h) { Controls.Add(new Label { Text = text, Left = x, Top = y, Width = w, Height = h }); }
    void Configure(Button button, string text, int x, int y, int w, EventHandler handler) { button.Text = text; button.SetBounds(x,y,w,34); button.Click += handler; Controls.Add(button); }
    void UpdateControls() {
        bool loggedIn = !String.IsNullOrEmpty(sessionToken);
        login.Enabled = register.Enabled = code.Enabled = name.Enabled = password.Enabled = !busy && !loggedIn;
        pause.Enabled = resume.Enabled = logout.Enabled = refresh.Enabled = save.Enabled = task.Enabled = handover.Enabled = !busy && loggedIn;
    }
    void StoreSession() {
        Directory.CreateDirectory(Path.GetDirectoryName(config));
        if (String.IsNullOrEmpty(sessionToken)) { if (File.Exists(config)) File.Delete(config); }
        else File.WriteAllBytes(config, ProtectedData.Protect(Encoding.UTF8.GetBytes(sessionToken), null, DataProtectionScope.CurrentUser));
    }
    async System.Threading.Tasks.Task Send(string action) {
        if (busy) return; busy = true; UpdateControls();
        try {
            var body = new Dictionary<string, object> { { "action", action }, { "pcName", Environment.MachineName } };
            if (action == "register" || action == "login") { body["code"] = code.Text.Trim(); body["password"] = password.Text; if (action == "register") body["name"] = name.Text.Trim(); }
            else { body["sessionToken"] = sessionToken; if (action == "task") { body["task"] = task.Text; body["handover"] = handover.Text; } if (action == "logout" && !String.IsNullOrEmpty(earlyLeaveReason)) body["earlyLeaveReason"] = earlyLeaveReason; }
            using (var request = new HttpRequestMessage(HttpMethod.Post, "https://www.aptechagency.com/api/device-attendance")) {
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", credential);
                request.Content = new StringContent(json.Serialize(body), Encoding.UTF8, "application/json");
                using (var response = await client.SendAsync(request)) {
                    Dictionary<string, object> result;
                    try { result = json.Deserialize<Dictionary<string, object>>(await response.Content.ReadAsStringAsync()); }
                    catch { throw new Exception("Attendance service returned an invalid response. Retry or contact your administrator."); }
                    if (!response.IsSuccessStatusCode) {
                        if (result != null && result.ContainsKey("code") && Convert.ToString(result["code"]) == "EARLY_LEAVE_REASON_REQUIRED") {
                            earlyLeaveReason = AskEarlyReason();
                            if (!String.IsNullOrEmpty(earlyLeaveReason)) { busy = false; await Send("logout"); earlyLeaveReason = null; }
                            return;
                        }
                        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized && action != "login") { sessionToken = null; StoreSession(); }
                        throw new Exception(result != null && result.ContainsKey("error") ? Convert.ToString(result["error"]) : "Attendance request failed.");
                    }
                    if (result.ContainsKey("serverNow")) { serverNow = Stamp(result["serverNow"]); sinceServer.Restart(); }
                    if (result.ContainsKey("sessionToken")) { sessionToken = Convert.ToString(result["sessionToken"]); StoreSession(); password.Clear(); }
                    if (result.ContainsKey("message")) { MessageBox.Show(Convert.ToString(result["message"])); password.Clear(); return; }
                    if (result.ContainsKey("shift") && result["shift"] != null) {
                        var shift = (Dictionary<string, object>)result["shift"];
                        activeShift = shift; TickClock();
                        var employee = (Dictionary<string, object>)result["employee"];
                        bool ended = shift.ContainsKey("endedAt") && shift["endedAt"] != null;
                        bool onBreak = shift.ContainsKey("breakStartedAt") && shift["breakStartedAt"] != null;
                        status.Text = Convert.ToString(employee["name"]) + " (" + Convert.ToString(employee["code"]) + ")\nArrival: " + Stamp(shift["startedAt"]).AddHours(6).ToString("dd MMM yyyy HH:mm") + " Dhaka\n" + (ended ? "Shift ended. Activity tracking is unchanged." : onBreak ? "Attendance is on break." : "Attendance is open. Log out before leaving.");
                        if (action == "login" || action == "status") { task.Text = Convert.ToString(shift["task"]); handover.Text = Convert.ToString(shift["handover"]); }
                        if (ended) { sessionToken = null; StoreSession(); }
                        if (action == "login" && !ended && Convert.ToString(employee["shiftLabel"]) != "NIGHT") { using (var daily = new DailyTasksForm(credential, sessionToken)) daily.ShowDialog(this); }
                    }
                }
            }
        } catch (Exception ex) { if (!IsDisposed) MessageBox.Show(ex.Message, "Attendance"); }
        finally { busy = false; if (!IsDisposed) UpdateControls(); }
    }
}
