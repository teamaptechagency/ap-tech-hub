type EmailAction = {
  label: string;
  href: string;
};

type EmailDetail = {
  label: string;
  value: string;
};

export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function detailRows(details: EmailDetail[] = []) {
  if (!details.length) return "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;border-collapse:separate;border-spacing:0;border:1px solid #e8edf5;border-radius:14px;overflow:hidden">
      ${details
        .map(
          (detail) => `
            <tr>
              <td style="padding:12px 14px;background:#f8fafc;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;width:38%;border-bottom:1px solid #edf2f7">${escapeEmailHtml(
                detail.label
              )}</td>
              <td style="padding:12px 14px;color:#101623;font-size:14px;font-weight:700;border-bottom:1px solid #edf2f7">${escapeEmailHtml(
                detail.value
              ).replaceAll("\n", "<br />")}</td>
            </tr>
          `
        )
        .join("")}
    </table>
  `;
}

export function renderEmail(input: {
  title: string;
  eyebrow?: string;
  greeting?: string;
  intro?: string;
  body?: string;
  code?: string;
  codeLabel?: string;
  details?: EmailDetail[];
  action?: EmailAction;
  secondaryAction?: EmailAction;
  note?: string;
  footerNote?: string;
}) {
  const safeTitle = escapeEmailHtml(input.title);
  const safeEyebrow = escapeEmailHtml(input.eyebrow ?? "AP Tech Hub");
  const safeGreeting = input.greeting ? escapeEmailHtml(input.greeting) : "";
  const safeIntro = input.intro ? escapeEmailHtml(input.intro) : "";
  const safeBody = input.body
    ? escapeEmailHtml(input.body).replaceAll("\n", "<br />")
    : "";
  const safeCode = input.code ? escapeEmailHtml(input.code) : "";
  const safeCodeLabel = escapeEmailHtml(input.codeLabel ?? "Verification code");
  const safeNote = input.note
    ? escapeEmailHtml(input.note).replaceAll("\n", "<br />")
    : "";
  const safeFooter = escapeEmailHtml(
    input.footerNote ??
      "You received this email because an AP Tech Hub action was requested for your account."
  );

  const actionHtml = input.action
    ? `
      <tr>
        <td align="center" style="padding:8px 0 4px">
          <a href="${escapeEmailHtml(input.action.href)}" style="display:inline-block;background:#c6613f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;padding:13px 22px;border-radius:10px">
            ${escapeEmailHtml(input.action.label)}
          </a>
        </td>
      </tr>
    `
    : "";

  const secondaryActionHtml = input.secondaryAction
    ? `
      <tr>
        <td align="center" style="padding:2px 0 10px">
          <a href="${escapeEmailHtml(input.secondaryAction.href)}" style="color:#c6613f;text-decoration:none;font-size:13px;font-weight:700">
            ${escapeEmailHtml(input.secondaryAction.label)}
          </a>
        </td>
      </tr>
    `
    : "";

  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>${safeTitle}</title>
      </head>
      <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#101623">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:28px 12px">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 24px 60px rgba(16,22,35,.10)">
                <tr>
                  <td style="background:#101623;padding:26px 28px">
                    <div style="font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#f5a83c">${safeEyebrow}</div>
                    <div style="margin-top:8px;font-size:25px;line-height:1.2;font-weight:900;color:#ffffff">AP Tech <span style="color:#f5a83c">Hub</span></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px 28px 24px">
                    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#101623">${safeTitle}</h1>
                    ${
                      safeGreeting
                        ? `<p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#334155">${safeGreeting}</p>`
                        : ""
                    }
                    ${
                      safeIntro
                        ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#475569">${safeIntro}</p>`
                        : ""
                    }
                    ${
                      safeBody
                        ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569">${safeBody}</p>`
                        : ""
                    }
                    ${
                      safeCode
                        ? `
                          <div style="margin:22px 0;padding:20px;border:1px solid #f4d6ca;background:#fff7f3;border-radius:16px;text-align:center">
                            <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#c6613f">${safeCodeLabel}</div>
                            <div style="margin-top:10px;font-size:34px;line-height:1;font-weight:900;letter-spacing:.18em;color:#101623">${safeCode}</div>
                          </div>
                        `
                        : ""
                    }
                    ${detailRows(input.details)}
                    ${
                      safeNote
                        ? `<div style="margin:18px 0;padding:14px 16px;background:#f8fafc;border-left:4px solid #c6613f;border-radius:12px;font-size:13px;line-height:1.65;color:#475569">${safeNote}</div>`
                        : ""
                    }
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${actionHtml}
                      ${secondaryActionHtml}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 28px 24px;background:#f8fafc;border-top:1px solid #edf2f7">
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b">${safeFooter}</p>
                    <p style="margin:12px 0 0;font-size:11px;line-height:1.6;color:#94a3b8">AP Tech Agency - Automated secure email</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
