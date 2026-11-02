using System;
using System.Collections;
using System.Collections.Generic;
using System.Drawing;
using System.Net.Http;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;

public class DailyTasksForm : Form {
    readonly string credential, sessionToken;
    readonly HttpClient client = new HttpClient();
    readonly JavaScriptSerializer json = new JavaScriptSerializer();
    readonly ListBox list = new ListBox();
    readonly TextBox proof = new TextBox(), reason = new TextBox();
    readonly Label status = new Label();
    readonly Button complete = new Button(), reopen = new Button(), refresh = new Button(), hold = new Button(), cancel = new Button();
    readonly List<Dictionary<string, object>> tasks = new List<Dictionary<string, object>>();
    bool busy;
    public DailyTasksForm(string deviceCredential, string attendanceToken) {
        credential = deviceCredential; sessionToken = attendanceToken;
        Text = "Daily work - morning primary / evening fallback"; ClientSize = new Size(650, 575); Font = new Font("Segoe UI", 10); StartPosition = FormStartPosition.CenterParent;
        Controls.Add(new Label { Text = "Morning owns the daily work; evening takes unfinished work after 15:00.\nNight has no daily checklist. Hold = waiting for input. Cancel = no work needed.\nA reason is required for Hold/Cancel. Changes are saved with your employee ID.", Left = 20, Top = 15, Width = 610, Height = 60 });
        list.SetBounds(20, 80, 610, 170); list.HorizontalScrollbar = true; Controls.Add(list);
        list.SelectedIndexChanged += (s,e) => { if (list.SelectedIndex >= 0) { proof.Text = Convert.ToString(tasks[list.SelectedIndex]["proofUrl"]); reason.Text = tasks[list.SelectedIndex].ContainsKey("reason") ? Convert.ToString(tasks[list.SelectedIndex]["reason"]) : ""; } };
        Controls.Add(new Label { Text = "Published work link (optional, http/https)", Left = 20, Top = 260, Width = 610, Height = 24 });
        proof.SetBounds(20, 286, 610, 28); proof.MaxLength = 2000; Controls.Add(proof);
        Controls.Add(new Label { Text = "Reason / handover (e.g. no ad material, waiting for approval)", Left = 20, Top = 325, Width = 610, Height = 24 });
        reason.SetBounds(20, 352, 610, 70); reason.Multiline = true; reason.MaxLength = 1000; Controls.Add(reason);
        complete.Text = "Mark complete / save link"; complete.SetBounds(20, 438, 200, 34); complete.Click += async (s,e) => await Send("COMPLETED"); Controls.Add(complete);
        hold.Text = "Hold / waiting"; hold.SetBounds(235, 438, 180, 34); hold.Click += async (s,e) => await Send("HOLD"); Controls.Add(hold);
        cancel.Text = "Cancel / not needed"; cancel.SetBounds(430, 438, 200, 34); cancel.Click += async (s,e) => { if (MessageBox.Show("Cancel this daily task as not needed? Evening will not receive cancelled work. Enter a reason first.", "Cancel daily work", MessageBoxButtons.YesNo) == DialogResult.Yes) await Send("CANCELLED"); }; Controls.Add(cancel);
        reopen.Text = "Reopen / pending"; reopen.SetBounds(20, 488, 285, 34); reopen.Click += async (s,e) => await Send("PENDING"); Controls.Add(reopen);
        refresh.Text = "Refresh task queue"; refresh.SetBounds(320, 488, 310, 34); refresh.Click += async (s,e) => await Send(null); Controls.Add(refresh);
        status.SetBounds(20, 538, 610, 30); Controls.Add(status);
        client.Timeout = TimeSpan.FromSeconds(15); Shown += async (s,e) => await Send(null); FormClosed += (s,e) => client.Dispose();
    }
    async System.Threading.Tasks.Task Send(string nextStatus) {
        if (busy) return;
        int selected = list.SelectedIndex;
        if (nextStatus != null && selected < 0) { MessageBox.Show("Select a task first."); return; }
        if ((nextStatus == "HOLD" || nextStatus == "CANCELLED") && String.IsNullOrWhiteSpace(reason.Text)) { MessageBox.Show("Enter a reason for Hold or Cancel."); return; }
        busy = true; complete.Enabled = reopen.Enabled = refresh.Enabled = hold.Enabled = cancel.Enabled = list.Enabled = false;
        try {
            var body = new Dictionary<string, object> { { "action", nextStatus != null ? "checklist" : "status" }, { "pcName", Environment.MachineName }, { "sessionToken", sessionToken } };
            if (nextStatus != null) { body["taskId"] = Convert.ToString(tasks[selected]["id"]); body["status"] = nextStatus; body["reason"] = reason.Text.Trim(); body["proofUrl"] = proof.Text.Trim(); }
            using (var request = new HttpRequestMessage(HttpMethod.Post, "https://www.aptechagency.com/api/device-attendance")) {
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", credential); request.Content = new StringContent(json.Serialize(body), Encoding.UTF8, "application/json");
                using (var response = await client.SendAsync(request)) {
                    Dictionary<string, object> result;
                    try { result = json.Deserialize<Dictionary<string, object>>(await response.Content.ReadAsStringAsync()); } catch { throw new Exception("Invalid server response. Retry later."); }
                    if (!response.IsSuccessStatusCode) throw new Exception(result.ContainsKey("error") ? Convert.ToString(result["error"]) : "Task update failed.");
                    tasks.Clear(); list.Items.Clear();
                    foreach (var item in (IEnumerable)result["dailyTasks"]) {
                        var task = (Dictionary<string, object>)item; tasks.Add(task);
                        list.Items.Add("[" + Convert.ToString(task["status"]) + "] " + Convert.ToString(task["title"]) + " - " + Convert.ToString(task["day"]));
                    }
                    if (tasks.Count > 0) list.SelectedIndex = Math.Min(Math.Max(selected, 0), tasks.Count - 1);
                    var employee = (Dictionary<string, object>)result["employee"];
                    status.Text = Convert.ToString(employee["shiftLabel"]) == "NIGHT" ? "Night shift: free of daily tasks; available for client messages." : tasks.Count == 0 ? "No pending work for your shift. Completed/cancelled work is not handed over." : nextStatus != null ? "Status and your employee ID saved to the shared daily record." : "Queue refreshed (up to 300 tasks, including unresolved backlog).";
                }
            }
        } catch (Exception ex) { if (!IsDisposed) MessageBox.Show(ex.Message, "Daily tasks"); }
        finally { busy = false; if (!IsDisposed) complete.Enabled = reopen.Enabled = refresh.Enabled = hold.Enabled = cancel.Enabled = list.Enabled = true; }
    }
}
