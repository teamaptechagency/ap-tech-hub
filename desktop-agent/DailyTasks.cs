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
    readonly TextBox proof = new TextBox();
    readonly Label status = new Label();
    readonly Button complete = new Button(), reopen = new Button(), refresh = new Button();
    readonly List<Dictionary<string, object>> tasks = new List<Dictionary<string, object>>();
    bool busy;
    public DailyTasksForm(string deviceCredential, string attendanceToken) {
        credential = deviceCredential; sessionToken = attendanceToken;
        Text = "My daily tasks - app checklist"; ClientSize = new Size(650, 440); Font = new Font("Segoe UI", 10); StartPosition = FormStartPosition.CenterParent;
        Controls.Add(new Label { Text = "Check completed work for your duty day. Add a work link where available.\nThese are your reports of completion; no messages or passwords are read.", Left = 20, Top = 18, Width = 610, Height = 52 });
        list.SetBounds(20, 80, 610, 190); list.HorizontalScrollbar = true; Controls.Add(list);
        list.SelectedIndexChanged += (s,e) => { if (list.SelectedIndex >= 0) proof.Text = Convert.ToString(tasks[list.SelectedIndex]["proofUrl"]); };
        Controls.Add(new Label { Text = "Published work link (optional, http/https)", Left = 20, Top = 285, Width = 610, Height = 24 });
        proof.SetBounds(20, 312, 610, 28); proof.MaxLength = 2000; Controls.Add(proof);
        complete.Text = "Mark complete / save link"; complete.SetBounds(20, 354, 250, 34); complete.Click += async (s,e) => await Send(true); Controls.Add(complete);
        reopen.Text = "Uncheck"; reopen.SetBounds(285, 354, 150, 34); reopen.Click += async (s,e) => await Send(false); Controls.Add(reopen);
        refresh.Text = "Refresh tasks"; refresh.SetBounds(450, 354, 180, 34); refresh.Click += async (s,e) => await Send(null); Controls.Add(refresh);
        status.SetBounds(20, 400, 610, 25); Controls.Add(status);
        client.Timeout = TimeSpan.FromSeconds(15); Shown += async (s,e) => await Send(null); FormClosed += (s,e) => client.Dispose();
    }
    async System.Threading.Tasks.Task Send(bool? done) {
        if (busy) return;
        int selected = list.SelectedIndex;
        if (done.HasValue && selected < 0) { MessageBox.Show("Select a task first."); return; }
        busy = true; complete.Enabled = reopen.Enabled = refresh.Enabled = list.Enabled = false;
        try {
            var body = new Dictionary<string, object> { { "action", done.HasValue ? "checklist" : "status" }, { "pcName", Environment.MachineName }, { "sessionToken", sessionToken } };
            if (done.HasValue) { body["taskId"] = Convert.ToString(tasks[selected]["id"]); body["done"] = done.Value; body["proofUrl"] = proof.Text.Trim(); }
            using (var request = new HttpRequestMessage(HttpMethod.Post, "https://www.aptechagency.com/api/device-attendance")) {
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", credential); request.Content = new StringContent(json.Serialize(body), Encoding.UTF8, "application/json");
                using (var response = await client.SendAsync(request)) {
                    Dictionary<string, object> result;
                    try { result = json.Deserialize<Dictionary<string, object>>(await response.Content.ReadAsStringAsync()); } catch { throw new Exception("Invalid server response. Retry later."); }
                    if (!response.IsSuccessStatusCode) throw new Exception(result.ContainsKey("error") ? Convert.ToString(result["error"]) : "Task update failed.");
                    tasks.Clear(); list.Items.Clear();
                    foreach (var item in (IEnumerable)result["dailyTasks"]) {
                        var task = (Dictionary<string, object>)item; tasks.Add(task);
                        list.Items.Add((Convert.ToBoolean(task["done"]) ? "[DONE] " : "[   ] ") + Convert.ToString(task["title"]) + " - " + Convert.ToString(task["day"]));
                    }
                    if (tasks.Count > 0) list.SelectedIndex = Math.Min(Math.Max(selected, 0), tasks.Count - 1);
                    status.Text = tasks.Count == 0 ? "No daily tasks assigned to your shift. Ask your administrator." : done.HasValue ? "Saved to your employee record." : "Tasks refreshed.";
                }
            }
        } catch (Exception ex) { if (!IsDisposed) MessageBox.Show(ex.Message, "Daily tasks"); }
        finally { busy = false; if (!IsDisposed) complete.Enabled = reopen.Enabled = refresh.Enabled = list.Enabled = true; }
    }
}
