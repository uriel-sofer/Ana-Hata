-- Add category to distinguish client treatments from therapist pool rentals
alter table services add column if not exists category text not null default 'client';

-- Client treatments (public booking)
insert into services (name, description, duration_minutes, price_ils, category) values
  ('טיפול במים יחיד',         'טיפול אישי במים',                              60,  0,   'client'),
  ('טיפול במים זוגי',         'סדנה זוגית במים',                              90,  0,   'client'),
  ('טיפול רגשי במים – מבוגרים (WT)',  'טיפול רגשי במים למבוגרים',            60,  0,   'client'),
  ('טיפול רגשי במים – ילדים (WPT)',   'טיפול רגשי במים לילדים',              60,  0,   'client'),
  ('לנשום במים',              'עבודת נשימה במים',                             60,  0,   'client'),
  ('משפחות המילואים',         'טיפול מיוחד למשפחות המילואים',                60,  0,   'client'),
  ('אגף השיקום',              'טיפול במים לשיקום',                            60,  0,   'client'),
  ('תוכנית עמית / איכלוב וול','תוכנית עמית ואיכלוב Well',                    30,  0,   'client');

-- Therapist pool rentals
insert into services (name, description, duration_minutes, price_ils, category) values
  ('השכרה – מטופל 1, 60 דקות',  'השכרת בריכה למטפל – מטופל אחד, 60 דקות',  60,  120, 'therapist_rental'),
  ('השכרה – מטופל 1, 75 דקות',  'השכרת בריכה למטפל – מטופל אחד, 75 דקות',  75,  130, 'therapist_rental'),
  ('השכרה – 2 מטופלים, 75 דקות','השכרת בריכה למטפל – שני מטופלים, 75 דקות', 75,  180, 'therapist_rental'),
  ('השכרה – 2 מטופלים, 90 דקות','השכרת בריכה למטפל – שני מטופלים, 90 דקות', 90,  200, 'therapist_rental');
