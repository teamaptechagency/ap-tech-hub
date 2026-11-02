# Employee shift changes

Work Station > Staff & attendance supports one-day exceptions and permanent roster changes. Select employee/date/shift and enter a reason to save a one-day exception. Upcoming exceptions are listed and can be selected to edit or restore the regular shift. Permanent changes use the employee Edit form's shift selector; no password reset is required.

Overrides apply on attendance login using the Bangladesh calendar date. The following day reverts to the employee's regular shift. Existing attendance keeps its planned start/end and duties even when an administrator changes the regular roster. Morning/evening/night retain the existing eight-hour and early-departure rules. Changing a shift does not automatically swap another employee or reassign explicitly named daily-task templates; review primary/fallback assignments when moving staff permanently.

No schema migration or new desktop installation is required. Exceptions use namespaced Setting records and the existing employee roster. The administrator-only API validates real dates and refuses past dates. Tests cover next-day reversion, cancellation and preserving an open night shift after roster edits.
