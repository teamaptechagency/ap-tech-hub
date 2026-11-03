using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Markup;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;

public class NativeWorkStation {
 const string Origin="https://www.aptechagency.com";
 Window window; StackPanel content; TextBlock status,heading,subtitle; readonly JavaScriptSerializer json=new JavaScriptSerializer();
 readonly HttpClient http=new HttpClient(new HttpClientHandler{AllowAutoRedirect=false});
 string credential="",session="",page="overview",leadId=null,lastIncoming=null; bool busy,polling; Dictionary<string,object> meta; DateTime serverNow=DateTime.UtcNow; readonly System.Diagnostics.Stopwatch elapsed=System.Diagnostics.Stopwatch.StartNew();
 DispatcherTimer poll,clock; TextBlock timerLabel; ListBox inbox; StackPanel feed; TextBox reply; string draft=""; bool changingInbox;
 readonly string folder=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"APTechWorkAgent");
 [STAThread] public static void Main(){ServicePointManager.SecurityProtocol=SecurityProtocolType.Tls12;var app=new Application();new NativeWorkStation().Run(app);}
 void Run(Application app){
  using(var stream=typeof(NativeWorkStation).Assembly.GetManifestResourceStream("MainWindow.xaml"))window=(Window)XamlReader.Load(stream);
  content=(StackPanel)window.FindName("Content");status=(TextBlock)window.FindName("Status");heading=(TextBlock)window.FindName("Heading");subtitle=(TextBlock)window.FindName("Subtitle");
  ((TextBlock)window.FindName("PcLabel")).Text="PC · "+Environment.MachineName;
  foreach(var name in new[]{"Overview","Shift","Tasks","Chat","Settings"}){string target=name.ToLowerInvariant();((Button)window.FindName(name)).Click+=async(s,e)=>await Guard(async()=>{page=target;await Render();});}
  window.Closed+=(s,e)=>{if(poll!=null)poll.Stop();if(clock!=null)clock.Stop();http.Dispose();};
  credential=Load("native-credential.dat");session=Load("attendance.dat");
  window.Loaded+=async(s,e)=>await Guard(async()=>{if(credential.Length>0)await Bootstrap();await Render();});
  poll=new DispatcherTimer{Interval=TimeSpan.FromSeconds(5)};poll.Tick+=async(s,e)=>{if(polling||busy||credential.Length==0)return;polling=true;try{await Bootstrap();if(page=="chat"&&meta!=null&&Get(meta,"employee")!=null)await RefreshChat();}catch(Exception ex){status.Text="Disconnected · "+ex.Message;}finally{polling=false;}};poll.Start();
  clock=new DispatcherTimer{Interval=TimeSpan.FromSeconds(1)};clock.Tick+=(s,e)=>Tick();clock.Start();
  if(Array.IndexOf(Environment.GetCommandLineArgs(), "--render-preview")>=0){poll.Stop();clock.Stop();credential="preview";meta=new Dictionary<string,object>{{"employee",new Dictionary<string,object>{{"name","Demo employee"},{"shiftLabel","MORNING"}}},{"shift",new Dictionary<string,object>{{"startedAt",DateTime.UtcNow.AddHours(-2).ToString("o")},{"scheduledEndAt",DateTime.UtcNow.AddHours(6).ToString("o")},{"breakSeconds",0}}}};Render().GetAwaiter().GetResult();subtitle.Text="Native WPF interface · Sample data only · No live session";status.Text="DESIGN PREVIEW · Sample employee and shift · No connection or data collection";var root=(FrameworkElement)window.Content;root.Measure(new Size(1180,760));root.Arrange(new Rect(0,0,1180,760));root.UpdateLayout();var bitmap=new RenderTargetBitmap(1180,760,96,96,PixelFormats.Pbgra32);bitmap.Render(root);var encoder=new PngBitmapEncoder();encoder.Frames.Add(BitmapFrame.Create(bitmap));using(var file=File.Create(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"native-preview.png")))encoder.Save(file);http.Dispose();return;}
  app.Run(window);
 }
 string Load(string name){try{return Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(Path.Combine(folder,name)),null,DataProtectionScope.CurrentUser));}catch{return "";}}
 void Save(string name,string value){Directory.CreateDirectory(folder);string path=Path.Combine(folder,name);if(value.Length==0){if(File.Exists(path))File.Delete(path);}else File.WriteAllBytes(path,ProtectedData.Protect(Encoding.UTF8.GetBytes(value),null,DataProtectionScope.CurrentUser));}
 static object Get(Dictionary<string,object> d,string key){return d!=null&&d.ContainsKey(key)?d[key]:null;}
 static string S(Dictionary<string,object> d,string key){return Convert.ToString(Get(d,key));}
 static Dictionary<string,object> D(object value){return value as Dictionary<string,object>;}
 static IEnumerable<Dictionary<string,object>> Rows(object value){var list=value as IEnumerable;if(list!=null)foreach(var item in list){var row=D(item);if(row!=null)yield return row;}}
 async Task<Dictionary<string,object>> Api(string path,object body=null){
  using(var req=new HttpRequestMessage(body==null?HttpMethod.Get:HttpMethod.Post,Origin+path)){
   req.Headers.Authorization=new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer",credential);req.Headers.Add("x-pc-name",Environment.MachineName);if(session.Length>0)req.Headers.Add("x-attendance-token",session);
   if(body!=null)req.Content=new StringContent(json.Serialize(body),Encoding.UTF8,"application/json");
   using(var res=await http.SendAsync(req)){Dictionary<string,object> data;try{data=json.Deserialize<Dictionary<string,object>>(await res.Content.ReadAsStringAsync());}catch{throw new Exception("Server returned an invalid response. Please retry.");}if(!res.IsSuccessStatusCode)throw new Exception(S(data,"error"));return data;}
  }
 }
 async Task Guard(Func<Task> action){if(busy)return;busy=true;try{await action();}catch(Exception ex){status.Text=ex.Message;}finally{busy=false;}}
 async Task Bootstrap(){meta=await Api("/api/workstation?view=bootstrap");DateTime parsed;if(DateTime.TryParse(S(meta,"serverNow"),out parsed)){serverNow=parsed.ToUniversalTime();elapsed.Restart();}status.Text="Connected · Native WPF preview · Tracking remains in the existing Work Station app.";}
 TextBlock Text(string text,int size=14,string color="#E4EEE8"){return new TextBlock{Text=text,FontSize=size,Foreground=(Brush)new BrushConverter().ConvertFromString(color),TextWrapping=TextWrapping.Wrap,Margin=new Thickness(0,0,0,12)};}
 StackPanel Card(string title){var panel=new StackPanel();panel.Children.Add(Text(title,19));var border=new Border{Style=(Style)window.Resources["Card"],Child=panel};content.Children.Add(border);return panel;}
 Button Action(Panel parent,string label,Func<Task> action){var b=new Button{Content=label,HorizontalAlignment=HorizontalAlignment.Left};b.Click+=async(s,e)=>await Guard(action);parent.Children.Add(b);return b;}
 async Task Render(){timerLabel=null;content.Children.Clear();heading.Text=page=="chat"?"Every conversation, together.":page=="shift"?"Your shift. Your profile.":page=="tasks"?"A clear plan for today.":page=="settings"?"Your Work Station settings.":"Your day, clearly organised.";
  subtitle.Text="Native Windows preview · Connected to the same AP Tech Hub backend.";
  if(credential.Length==0){Pair();return;}if(page=="settings"){Settings();return;}
  if(meta==null)await Bootstrap();if(Get(meta,"employee")==null){Login();return;}
  if(page=="shift"){Shift();return;}if(page=="tasks"){var p=Card("Your daily checklist");p.Children.Add(Text("Morning primary / afternoon handover. Holds and cancellations require reasons. Night shift stays available for customer messages."));Action(p,"Open native task checklist",()=>{using(var tasks=new DailyTasksForm(credential,session))tasks.ShowDialog();return Task.FromResult(0);});return;}
  if(page=="chat"){await Chat();return;}
  var employee=D(Get(meta,"employee"));var welcome=Card("Welcome back, "+S(employee,"name"));welcome.Children.Add(Text(S(employee,"shiftLabel")+" shift · PC "+Environment.MachineName,14,"#95BDA6"));timerLabel=Text("",27);welcome.Children.Add(timerLabel);Tick();
  var row=Card("Today’s priorities");row.Children.Add(Text("Start with your daily checklist, hand over unfinished work, and keep customer conversations moving."));Action(row,"View daily tasks",async()=>{page="tasks";await Render();});Action(row,"Open visitor inbox",async()=>{page="chat";await Render();});
  var notice=Card("Preview scope");notice.Children.Add(Text("Attendance, shifts, daily task checklist and visitor chat connect directly to Hub APIs. No web page or browser engine is loaded. Administrator sign-in, blog editor, project entry, tracking and updater migration are still in progress."));
 }
 void Pair(){var p=Card("Connect this PC");p.Children.Add(Text("Paste the device credential once. It stays encrypted for your Windows account. This preview never starts monitoring automatically."));var secret=new PasswordBox();p.Children.Add(secret);Action(p,"Pair & load profiles",async()=>{string value=secret.Password.Trim();if(!System.Text.RegularExpressions.Regex.IsMatch(value,"^[a-f0-9]{64}$"))throw new Exception("Enter a valid 64-character PC credential.");credential=value;try{await Bootstrap();Save("native-credential.dat",credential);await Render();}catch{credential="";throw;}});}
 class Profile {public string Code,Name;public override string ToString(){return Name;}}
 void Login(){var p=Card("Select your employee profile");var select=new ComboBox{Margin=new Thickness(0,8,0,18),Padding=new Thickness(10)};foreach(var person in Rows(Get(meta,"employees")))select.Items.Add(new Profile{Code=S(person,"code"),Name=S(person,"name")+" · "+S(person,"shiftLabel")});if(select.Items.Count>0)select.SelectedIndex=0;p.Children.Add(select);p.Children.Add(Text("Attendance password"));var password=new PasswordBox();p.Children.Add(password);Action(p,"Login / start attendance",async()=>{var person=select.SelectedItem as Profile;if(person==null)throw new Exception("Choose an approved employee profile.");var result=await Api("/api/device-attendance",new{action="login",pcName=Environment.MachineName,code=person.Code,password=password.Password});session=S(result,"sessionToken");if(session.Length==0)throw new Exception("Login did not return a session.");Save("attendance.dat",session);password.Clear();await Bootstrap();await Render();});p.Children.Add(Text("Administrator verification is not migrated in this preview. No administrator permissions are granted by employee login.",12,"#C5AD75"));}
 async Task Attendance(string action,string reason=""){var body=new Dictionary<string,object>{{"action",action},{"pcName",Environment.MachineName},{"sessionToken",session}};if(reason.Length>0)body["earlyLeaveReason"]=reason;await Api("/api/device-attendance",body);if(action=="logout"){session="";Save("attendance.dat",session);}await Bootstrap();await Render();}
 void Shift(){var p=Card("Attendance & shift time");timerLabel=Text("",26);p.Children.Add(timerLabel);Tick();Action(p,"Start break",()=>Attendance("break"));Action(p,"Resume shift",()=>Attendance("resume"));p.Children.Add(Text("Early-leave reason (required when your shift / eight hours are incomplete)"));var reason=new TextBox();p.Children.Add(reason);Action(p,"Record departure / logout",async()=>{if(MessageBox.Show(window,"Record departure? This does not stop tracking in your existing app.","Attendance",MessageBoxButton.YesNo)==MessageBoxResult.Yes)await Attendance("logout",reason.Text.Trim());});}
 void Tick(){if(timerLabel==null||meta==null)return;var shift=D(Get(meta,"shift"));DateTime start,end;if(shift==null||!DateTime.TryParse(S(shift,"startedAt"),out start)||!DateTime.TryParse(S(shift,"scheduledEndAt"),out end))return;var now=serverNow.Add(elapsed.Elapsed);double breaks=Convert.ToDouble(Get(shift,"breakSeconds")??0);DateTime began;if(DateTime.TryParse(S(shift,"breakStartedAt"),out began))breaks+=Math.Max(0,(now-began.ToUniversalTime()).TotalSeconds);double worked=Math.Max(0,(now-start.ToUniversalTime()).TotalSeconds-breaks);double left=Math.Max(28800-worked,(end.ToUniversalTime()-now).TotalSeconds);timerLabel.Text="Worked  "+Duration(worked)+"     Remaining  "+Duration(left);}
 static string Duration(double seconds){var t=TimeSpan.FromSeconds(Math.Max(0,seconds));return ((int)t.TotalHours).ToString("00")+":"+t.Minutes.ToString("00")+":"+t.Seconds.ToString("00");}
 void Settings(){var p=Card("Native Windows · WPF");p.Children.Add(Text("This executable contains native Windows controls. No WebView2, embedded web browser or HTML interface is used."));p.Children.Add(Text("Preview only: keep the existing Work Station app for consented tracking and updates. This preview exits normally when closed."));Action(p,"Reload connection",async()=>{await Bootstrap();await Render();});}
 async Task Chat(){var p=Card("Website visitor inbox");inbox=new ListBox{Height=130,Margin=new Thickness(0,4,0,16)};p.Children.Add(inbox);inbox.SelectionChanged+=async(s,e)=>{if(changingInbox)return;var selected=inbox.SelectedItem as Profile;if(selected==null)return;draft=reply==null?"":reply.Text;leadId=selected.Code;await Guard(async()=>await RefreshChat());};var actions=new WrapPanel();p.Children.Add(actions);foreach(var item in new[]{"claim","release","resolve"}){string action=item;Action(actions,action=="claim"?"Take conversation":action=="release"?"Hand over":"Resolve",async()=>{if(leadId==null)throw new Exception("Select a conversation.");await Api("/api/workstation-chat",new{action=action,leadId=leadId});await RefreshChat();});}
 feed=new StackPanel();p.Children.Add(new ScrollViewer{Content=feed,Height=220,VerticalScrollBarVisibility=ScrollBarVisibility.Auto});reply=new TextBox{MaxLength=5000,AcceptsReturn=true,MinHeight=65,Text=draft};p.Children.Add(reply);Action(p,"Send reply",async()=>{if(leadId==null||String.IsNullOrWhiteSpace(reply.Text))throw new Exception("Select a visitor and write a reply.");await Api("/api/workstation-chat",new{action="send",leadId=leadId,body=reply.Text,messageId=Guid.NewGuid().ToString()});reply.Clear();draft="";await RefreshChat();});await RefreshChat();}
 async Task RefreshChat(){if(inbox==null||page!="chat")return;var data=await Api("/api/workstation-chat");changingInbox=true;try{inbox.Items.Clear();foreach(var lead in Rows(Get(data,"leads"))){var item=new Profile{Code=S(lead,"id"),Name=S(lead,"name")+" · "+S(lead,"subject")};inbox.Items.Add(item);if(item.Code==leadId)inbox.SelectedItem=item;}}finally{changingInbox=false;}if(leadId==null)return;var detail=await Api("/api/workstation-chat?leadId="+Uri.EscapeDataString(leadId));feed.Children.Clear();string incoming=null;foreach(var m in Rows(Get(detail,"messages"))){string sender=S(m,"sender")=="ADMIN"?"Support - "+S(m,"supportName"):"Visitor";feed.Children.Add(Text(sender+"\n"+S(m,"body"),14));if(S(m,"sender")=="GUEST")incoming=S(m,"id");}if(lastIncoming!=null&&incoming!=null&&incoming!=lastIncoming)System.Media.SystemSounds.Asterisk.Play();lastIncoming=incoming;}
}
