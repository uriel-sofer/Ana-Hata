export function bookingReceivedHtml(name: string, dateStr: string, serviceName: string): string {
  return `
    <div dir="rtl" style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2>שלום ${name} 👋</h2>
      <p>קיבלנו את בקשת ההזמנה שלך ל<strong>${serviceName}</strong> בתאריך <strong>${dateStr}</strong>.</p>
      <p>מורן תאשר את הפגישה בהקדם ותקבלי אישור במייל.</p>
      <p>תודה ומחכות לראותך 🌊</p>
      <p>צוות אנהטה</p>
    </div>
  `;
}

export function bookingApprovedHtml(
  name: string,
  dateStr: string,
  serviceName: string,
  bookingLink: string
): string {
  return `
    <div dir="rtl" style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2>הפגישה אושרה! ✅</h2>
      <p>שלום ${name},</p>
      <p>הפגישה שלך ל<strong>${serviceName}</strong> בתאריך <strong>${dateStr}</strong> אושרה.</p>
      <p>
        <a href="${bookingLink}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">
          צפי בפגישה
        </a>
      </p>
      <p>מחכות לראותך 🌊</p>
    </div>
  `;
}

export function bookingDeclinedHtml(name: string, dateStr: string): string {
  return `
    <div dir="rtl" style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2>עדכון לגבי בקשת ההזמנה שלך</h2>
      <p>שלום ${name},</p>
      <p>מצטערים, לא ניתן לאשר את הפגישה המבוקשת ל-${dateStr}.</p>
      <p>ניתן ליצור קשר עם מורן לתיאום מועד אחר.</p>
    </div>
  `;
}

export function bookingCancelledHtml(name: string, dateStr: string): string {
  return `
    <div dir="rtl" style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2>הפגישה בוטלה</h2>
      <p>שלום ${name},</p>
      <p>הפגישה שלך בתאריך ${dateStr} בוטלה.</p>
      <p>לתיאום פגישה חדשה, ניתן לפנות למורן.</p>
    </div>
  `;
}
